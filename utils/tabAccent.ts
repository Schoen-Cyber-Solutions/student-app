import { DEFAULT_ACCENT, TabKey } from './tabAppearance';

/**
 * In-memory accent colors per tab, seeded from the persisted appearance
 * prefs. Lets components react to accent changes without prop drilling or
 * refetching SecureStore per render.
 */
const currents: Record<TabKey, string> = {
  home: DEFAULT_ACCENT,
  calendar: DEFAULT_ACCENT,
  chat: DEFAULT_ACCENT,
};
const listeners = new Set<() => void>();

export function setTabAccentRuntime(tab: TabKey, hex: string): void {
  if (!hex || hex === currents[tab]) return;
  currents[tab] = hex;
  listeners.forEach((l) => l());
}

export function useTabAccent(tab: TabKey): string {
  // Brand-locked: per-tab accent customization is disabled in v1.
  return DEFAULT_ACCENT;
}
