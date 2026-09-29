import type { ChatImageDraft } from '@/services/api/communities';

// Chat attachments: cap the longest edge and re-encode to JPEG (also drops
// HEIC sources and EXIF/GPS metadata — the manipulator output is clean).
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Opens the system photo picker (no library-wide permission on iOS), then
 * downscales + re-encodes to JPEG. Returns null on cancel or failure —
 * callers treat that as "no change" and keep the existing draft.
 */
export async function pickChatImage(): Promise<ChatImageDraft | null> {
  const ImagePicker = await import('expo-image-picker');
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.uri) return null;

  const maxDim = Math.max(asset.width ?? 0, asset.height ?? 0);
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (maxDim > MAX_EDGE) {
    if ((asset.width ?? 0) >= (asset.height ?? 0)) {
      ctx.resize({ width: MAX_EDGE });
    } else {
      ctx.resize({ height: MAX_EDGE });
    }
  }
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  const scale = maxDim > MAX_EDGE ? MAX_EDGE / maxDim : 1;
  return {
    uri: saved.uri,
    width: Math.round((asset.width ?? 0) * scale) || saved.width,
    height: Math.round((asset.height ?? 0) * scale) || saved.height,
  };
}
