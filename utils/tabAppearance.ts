import * as SecureStore from 'expo-secure-store';

/**
 * Shared per-tab appearance model for Home / Calendar / Chat.
 * Everything is stored locally in SecureStore + the app document directory —
 * nothing is uploaded to the backend.
 */

const PREFS_KEY = 'tab_appearance_v1';
const LEGACY_CALENDAR_KEY = 'calendar_appearance_v1';
const BG_PREFIX = 'tab-background-';
const JPEG_QUALITY = 0.8;

/** Downscale for memory efficiency — full-res camera photos are far larger
 *  than any phone screen needs. */
const MAX_WIDTH = 1600;

export type DimLevel = 'off' | 'subtle' | 'strong';
export type TabKey = 'home' | 'calendar' | 'chat';
export const TAB_KEYS: TabKey[] = ['home', 'calendar', 'chat'];

export const DEFAULT_ACCENT = '#7161EF'; // Lavender

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: 'Ocean Blue', hex: '#3B82F6' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Lavender', hex: '#7161EF' },
  { name: 'Rose', hex: '#E56B8A' },
  { name: 'Orange', hex: '#EA873D' },
  { name: 'Graphite', hex: '#64748B' },
];

export interface TabAppearance {
  /** Local file URI in the app's document directory, or null for default. */
  imageUri: string | null;
  dim: DimLevel;
  /** User-chosen accent hex for this tab. */
  accent: string;
}

export const DIM_FRACTION: Record<DimLevel, number> = {
  off: 0,
  subtle: 0.18,
  strong: 0.36,
};

const DEFAULT_ENTRY: TabAppearance = {
  imageUri: null,
  dim: 'subtle',
  accent: DEFAULT_ACCENT,
};

function defaultStore(): Record<TabKey, TabAppearance> {
  return {
    home: { ...DEFAULT_ENTRY },
    calendar: { ...DEFAULT_ENTRY },
    chat: { ...DEFAULT_ENTRY },
  };
}

// expo-file-system, expo-image-picker and expo-image-manipulator are native
// modules. Loading them lazily inside the functions that use them keeps this
// module — and every screen importing it — working on a dev client that
// predates those packages.

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const log = (...args: unknown[]) => {
  if (DEV) console.log('[appearance]', ...args);
};

async function fs() {
  return await import('expo-file-system');
}

async function bgFile(tab: TabKey): Promise<InstanceType<(typeof import('expo-file-system'))['File']>> {
  const { File, Paths } = await fs();
  return new File(Paths.document, `${BG_PREFIX}${tab}.jpg`);
}

/** Versioned destination — a new URI per pick defeats React Native's image
 *  cache, so a replaced background actually renders instead of the stale
 *  decode of the previous file at the same path. */
async function newBgFile(tab: TabKey): Promise<InstanceType<(typeof import('expo-file-system'))['File']>> {
  const { File, Paths } = await fs();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new File(Paths.document, `${BG_PREFIX}${tab}-${suffix}.jpg`);
}

/** Deletes app-managed background files for `tab` except `keepName` (a file
 *  name — comparing names instead of URIs avoids false mismatches if the
 *  fs layer normalizes URIs differently across calls). Best effort —
 *  failures are ignored so a cleanup issue never breaks a write. */
async function cleanupManagedImages(tab: TabKey, keepName?: string | null): Promise<void> {
  try {
    const { Directory, File, Paths } = await fs();
    const dir = new Directory(Paths.document);
    const prefix = `${BG_PREFIX}${tab}`;
    for (const entry of dir.list()) {
      if (!(entry instanceof File)) continue;
      if (!entry.name.startsWith(prefix)) continue;
      if (keepName && entry.name === keepName) continue;
      try {
        if (entry.exists) {
          log('cleanup: removing stale file', entry.name);
          entry.delete();
        }
      } catch (e) {
        log('cleanup: delete failed', entry.name, e);
      }
    }
  } catch (e) {
    log('cleanup: list failed', e);
  }
}

/** Invoked after every successful preference write — the runtime store in
 *  ./tabAppearanceStore registers here so mounted screens update live. */
const writeListeners = new Set<(tab: TabKey, next: TabAppearance) => void>();
export function registerAppearanceWriteListener(
  cb: (tab: TabKey, next: TabAppearance) => void,
): () => void {
  writeListeners.add(cb);
  return () => {
    writeListeners.delete(cb);
  };
}

async function fileExists(uri: string): Promise<boolean> {
  try {
    const { File } = await fs();
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * One-time, idempotent migration of the legacy calendar_appearance_v1 store
 * into the shared per-tab model. Runs lazily on the first read of the new
 * store; if the new store already exists it is a no-op. The legacy key and
 * the original image file are intentionally left in place.
 */
let migrated = false;
async function migrateIfNeeded(): Promise<void> {
  if (migrated) return;
  migrated = true; // set before async work so retries stay idempotent
  try {
    if (await SecureStore.getItemAsync(PREFS_KEY)) return;
    const store = defaultStore();
    const legacyRaw = await SecureStore.getItemAsync(LEGACY_CALENDAR_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as Partial<TabAppearance>;
        let imageUri = legacy.imageUri ?? null;
        if (imageUri && (await fileExists(imageUri))) {
          // Copy into the canonical per-tab filename so each tab owns its
          // own file; the legacy file is left untouched.
          try {
            const { File } = await fs();
            const dest = await bgFile('calendar');
            if (dest.exists) dest.delete();
            new File(imageUri).copy(dest);
            imageUri = dest.uri;
          } catch {
            // Copy failed — keep the original URI; the file still exists.
          }
        } else {
          imageUri = null;
        }
        store.calendar = {
          imageUri,
          dim: legacy.dim ?? 'subtle',
          accent: legacy.accent ?? DEFAULT_ACCENT,
        };
      } catch {
        // Corrupt legacy JSON — start with defaults.
      }
    }
    await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(store));
  } catch {
    migrated = false; // allow a later retry if storage itself failed
  }
}

export async function getAllTabAppearance(): Promise<Record<TabKey, TabAppearance>> {
  const store = defaultStore();
  try {
    await migrateIfNeeded();
    const raw = await SecureStore.getItemAsync(PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Partial<TabAppearance>>) : {};
    for (const tab of TAB_KEYS) {
      const p = parsed[tab] ?? {};
      let imageUri = p.imageUri ?? null;
      // If the backing file was deleted externally, fall back to default.
      if (imageUri && !(await fileExists(imageUri))) imageUri = null;
      store[tab] = {
        imageUri,
        dim: p.dim ?? 'subtle',
        accent: p.accent ?? DEFAULT_ACCENT,
      };
    }
  } catch {
    // Storage unavailable — return defaults rather than crash the UI.
  }
  return store;
}

export async function getTabAppearance(tab: TabKey): Promise<TabAppearance> {
  const all = await getAllTabAppearance();
  return all[tab];
}

async function updateTab(tab: TabKey, patch: Partial<TabAppearance>): Promise<TabAppearance> {
  const all = await getAllTabAppearance();
  all[tab] = { ...all[tab], ...patch };
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(all));
  writeListeners.forEach((cb) => cb(tab, all[tab]));
  return all[tab];
}

/**
 * Opens the system photo picker (no library-wide permission needed on iOS),
 * downscales + compresses the choice, and stores it under the tab's own
 * filename in the document directory. Returns null on cancel or failure —
 * callers treat that as "no change".
 */
export async function pickAndStoreTabBackground(tab: TabKey): Promise<string | null> {
  const ImagePicker = await import('expo-image-picker');
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const { File } = await fs();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets?.[0]?.uri) {
    log('pick: canceled or empty asset', { tab, canceled: result.canceled });
    return null;
  }
  const sourceUri = result.assets[0].uri;
  log('pick: asset', { tab, sourceUri });

  const ctx = ImageManipulator.manipulate(sourceUri);
  ctx.resize({ width: MAX_WIDTH });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
  });
  log('pick: manipulated', { tab, savedUri: saved.uri });

  // Write to a NEW versioned path, AWAIT the copy (File.copy is async and
  // overwrite defaults to false), then verify the file landed — the previous
  // background stays referenced until the new file is safely in place.
  const dest = await newBgFile(tab);
  const src = new File(saved.uri);
  await src.copy(dest, { overwrite: true });
  if (!dest.exists) {
    log('pick: copy reported success but dest missing — retrying with move', {
      tab,
      dest: dest.uri,
    });
    try {
      await src.move(dest, { overwrite: true });
    } catch (e) {
      log('pick: move fallback failed', e);
    }
  }
  if (!dest.exists) {
    log('pick: FAILED — destination file not written, keeping previous background', {
      tab,
      dest: dest.uri,
    });
    return null;
  }
  log('pick: file stored', { tab, dest: dest.uri });

  await updateTab(tab, { imageUri: dest.uri });
  log('pick: pref persisted + subscribers notified', { tab });
  // Only now that the pref points at the new file, drop older managed copies.
  await cleanupManagedImages(tab, dest.name);
  return dest.uri;
}

/** Removes only this tab's stored image and resets its pref to default. */
export async function clearTabBackground(tab: TabKey): Promise<void> {
  await updateTab(tab, { imageUri: null });
  await cleanupManagedImages(tab, null);
  log('clear: done', { tab });
}

export async function setTabDim(tab: TabKey, dim: DimLevel): Promise<void> {
  await updateTab(tab, { dim });
}

export async function setTabAccent(tab: TabKey, accent: string): Promise<void> {
  await updateTab(tab, { accent });
}
