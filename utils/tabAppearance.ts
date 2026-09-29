import * as SecureStore from 'expo-secure-store';

/**
 * Shared per-tab appearance model for Home / Calendar / Chat.
 * Everything is stored locally in SecureStore — nothing is uploaded to the
 * backend. Backgrounds are solid colors only; photo backgrounds were removed
 * as a deliberate product simplification.
 */

const PREFS_KEY = 'tab_appearance_v1';
const LEGACY_CALENDAR_KEY = 'calendar_appearance_v1';

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

/** Neutral-text preference: 'light' = light text over dark backgrounds,
 *  'dark' = dark text over light backgrounds. Independent of accent. */
export type TextMode = 'light' | 'dark';

export interface TabTextColors {
  primary: string;
  secondary: string;
  tertiary: string;
  icon: string;
  /** Neutral hairline/border that tracks the mode — matches the solid
   *  surface palette the text sits on (dark surfaces for light text and
   *  vice versa). */
  border: string;
}

export const TAB_TEXT_COLORS: Record<TextMode, TabTextColors> = {
  light: {
    primary: '#F8FAFC',    // slate-50
    secondary: '#CBD5E1',  // slate-300
    tertiary: '#94A3B8',   // slate-400
    icon: '#CBD5E1',
    border: '#334155',     // slate-700 — dark-scheme cardBorder
  },
  dark: {
    primary: '#0B1220',    // near-black
    secondary: '#475569',  // slate-600
    tertiary: '#94A3B8',   // slate-400
    icon: '#475569',
    border: '#E2E8F0',     // slate-200 — light-scheme cardBorder
  },
};

/** Effective text mode: an explicit choice wins; unset follows the OS scheme
 *  (dark scheme → light text) so existing installs keep today's behavior. */
export function resolveTextMode(
  appearance: { textMode?: TextMode } | null | undefined,
  scheme: 'light' | 'dark',
): TextMode {
  return appearance?.textMode ?? (scheme === 'dark' ? 'light' : 'dark');
}

export function getTabTextColors(
  appearance: { textMode?: TextMode } | null | undefined,
  scheme: 'light' | 'dark',
): TabTextColors {
  return TAB_TEXT_COLORS[resolveTextMode(appearance, scheme)];
}

/** Muted background presets — low-saturation tones, no neons. */
export const SOLID_BACKGROUND_PRESETS: { name: string; hex: string }[] = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#0F0F12' },
  { name: 'Light Gray', hex: '#E5E7EB' },
  { name: 'Dark Gray', hex: '#1F2937' },
  { name: 'Warm Beige', hex: '#EDE6DA' },
  { name: 'Soft Blue', hex: '#DBEAFE' },
  { name: 'Soft Sage', hex: '#DCE8DC' },
  { name: 'Soft Lavender', hex: '#E9E4FF' },
];

/** Default solid fill when none is stored — soft lavender-tinted off-white
 *  in light scheme, deep slate in dark. */
export function defaultBackgroundColor(scheme: 'light' | 'dark'): string {
  return scheme === 'dark' ? '#10131C' : '#F4F2FA';
}

/** Stored color or the scheme-aware default. */
export function resolveBackgroundColor(
  appearance: { backgroundColor?: string } | null | undefined,
  scheme: 'light' | 'dark',
): string {
  return appearance?.backgroundColor ?? defaultBackgroundColor(scheme);
}

export interface TabAppearance {
  /** User-chosen accent hex for this tab. */
  accent: string;
  /** Neutral-text preference. Optional so stores written before this field
   *  existed keep working — undefined resolves to the OS scheme's default. */
  textMode?: TextMode;
  /** Solid fill, normalized '#rrggbb'. Optional; resolved per scheme. */
  backgroundColor?: string;
}

const DEFAULT_ENTRY: TabAppearance = {
  accent: DEFAULT_ACCENT,
};

function defaultStore(): Record<TabKey, TabAppearance> {
  return {
    home: { ...DEFAULT_ENTRY },
    calendar: { ...DEFAULT_ENTRY },
    chat: { ...DEFAULT_ENTRY },
  };
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

function sanitizeAccent(v: unknown): string | undefined {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
    ? v.toUpperCase()
    : undefined;
}

function sanitizeBackgroundColor(v: unknown): string | undefined {
  return sanitizeAccent(v);
}

function sanitizeTextMode(v: unknown): TextMode | undefined {
  return v === 'light' || v === 'dark' ? v : undefined;
}

function sanitizeEntry(p: Record<string, unknown>): TabAppearance {
  return {
    accent: sanitizeAccent(p.accent) ?? DEFAULT_ACCENT,
    textMode: sanitizeTextMode(p.textMode),
    backgroundColor: sanitizeBackgroundColor(p.backgroundColor),
  };
}

/**
 * One-time, idempotent migration of the legacy calendar_appearance_v1 store
 * into the shared per-tab model. Runs lazily on the first read of the new
 * store; if the new store already exists it is a no-op. The legacy key is
 * intentionally left in place. Photo fields (imageUri/dim/backgroundType)
 * from any older shape are dropped — only accent/textMode/backgroundColor
 * survive.
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
        const legacy = JSON.parse(legacyRaw) as Record<string, unknown>;
        store.calendar = sanitizeEntry(legacy);
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
    const parsed = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {};
    for (const tab of TAB_KEYS) {
      store[tab] = sanitizeEntry(parsed[tab] ?? {});
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

export async function setTabAccent(tab: TabKey, accent: string): Promise<void> {
  await updateTab(tab, { accent });
}

export async function setTabTextMode(tab: TabKey, textMode: TextMode): Promise<void> {
  await updateTab(tab, { textMode });
}

export async function setTabBackgroundColor(tab: TabKey, backgroundColor: string): Promise<void> {
  await updateTab(tab, { backgroundColor });
}
