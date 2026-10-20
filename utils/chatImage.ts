import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';
import type { ChatImageDraft } from '@/services/api/communities';

// Chat attachments: cap the longest edge and re-encode to JPEG (also drops
// HEIC sources and EXIF/GPS metadata — the manipulator output is clean).
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/** Thrown when the camera launch is blocked by permission denial — callers
 *  surface a dedicated prompt (with a Settings shortcut) instead of the
 *  generic "image failed" alert. */
export class CameraPermissionDeniedError extends Error {
  constructor() {
    super('Camera permission denied');
    this.name = 'CameraPermissionDeniedError';
  }
}

interface PickerAsset {
  uri: string;
  width?: number;
  height?: number;
}

/** Shared pipeline for library and camera assets: downscale past MAX_EDGE and
 *  re-encode to JPEG so the upload carries no source metadata. */
async function processAsset(asset: PickerAsset): Promise<ChatImageDraft | null> {
  if (!asset.uri) return null;
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');

  const maxDim = Math.max(asset.width ?? 0, asset.height ?? 0);
  const ctx = ImageManipulator.manipulate(asset.uri);
  try {
    if (maxDim > MAX_EDGE) {
      if ((asset.width ?? 0) >= (asset.height ?? 0)) {
        ctx.resize({ width: MAX_EDGE });
      } else {
        ctx.resize({ height: MAX_EDGE });
      }
    }
    const rendered = await ctx.renderAsync();
    try {
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
      const scale = maxDim > MAX_EDGE ? MAX_EDGE / maxDim : 1;
      return {
        uri: saved.uri,
        width: Math.round((asset.width ?? 0) * scale) || saved.width,
        height: Math.round((asset.height ?? 0) * scale) || saved.height,
      };
    } finally {
      rendered.release();
    }
  } finally {
    ctx.release();
  }
}

/**
 * Opens the system photo picker (no library-wide permission on iOS), then
 * downscales + re-encodes to JPEG. Returns null on cancel; failures
 * (undecodable/iCloud-pending asset, native errors) propagate so callers
 * can surface feedback — a bare `await` here used to reject silently.
 */
export async function pickChatImage(): Promise<ChatImageDraft | null> {
  const ImagePicker = await import('expo-image-picker');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.uri) return null;
  return processAsset(asset);
}

/**
 * Requests camera permission (only when the user chose "Take Photo"), opens
 * the camera, and runs the captured photo through the same pipeline as
 * library picks. Returns null on cancel; throws CameraPermissionDeniedError
 * when access is denied. `exif: false` keeps the parsed asset metadata-free —
 * the JPEG re-encode drops source metadata regardless.
 */
export async function captureChatImage(): Promise<ChatImageDraft | null> {
  const ImagePicker = await import('expo-image-picker');

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CameraPermissionDeniedError();

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.uri) return null;
  return processAsset(asset);
}

function alertCameraDenied() {
  Alert.alert(
    'Camera access needed',
    'Allow Study with Emy to use your camera to take photos and share them in chats. You can enable it in Settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings().catch(() => {}) },
    ],
  );
}

async function runSource(source: 'camera' | 'library'): Promise<ChatImageDraft | null> {
  try {
    return source === 'camera' ? await captureChatImage() : await pickChatImage();
  } catch (err) {
    if (err instanceof CameraPermissionDeniedError) {
      alertCameraDenied();
      return null;
    }
    throw err;
  }
}

/**
 * Presents the attach-source choice ("Take Photo" / "Choose from Library")
 * and returns a prepared draft, or null on cancel/denied permission.
 * The draft stays local — nothing uploads until the caller sends.
 */
export function chooseChatImage(): Promise<ChatImageDraft | null> {
  const options = ['Take Photo', 'Choose from Library', 'Cancel'];
  const cancelIndex = options.length - 1;

  if (Platform.OS === 'ios') {
    return new Promise((resolve, reject) => {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, title: 'Add a photo' },
        (index) => {
          if (index === 0) runSource('camera').then(resolve, reject);
          else if (index === 1) runSource('library').then(resolve, reject);
          else resolve(null);
        },
      );
    });
  }

  return new Promise((resolve, reject) => {
    Alert.alert('Add a photo', undefined, [
      { text: 'Take Photo', onPress: () => void runSource('camera').then(resolve, reject) },
      { text: 'Choose from Library', onPress: () => void runSource('library').then(resolve, reject) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
