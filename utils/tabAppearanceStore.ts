import { useEffect, useSyncExternalStore } from 'react';
import {
  DEFAULT_ACCENT,
  TAB_KEYS,
  TabAppearance,
  TabKey,
  getAllTabAppearance,
  registerAppearanceWriteListener,
} from './tabAppearance';
import { setTabAccentRuntime } from './tabAccent';

/**
 * Single in-memory source of truth for per-tab appearance, backed by the
 * persisted store in ./tabAppearance. Every successful write (background
 * color, text mode, accent) lands here via the registered write listener, so
 * all mounted screens update live — no per-screen SecureStore polling needed.
 */

const cache: Record<TabKey, TabAppearance> = {
  home: { accent: DEFAULT_ACCENT },
  calendar: { accent: DEFAULT_ACCENT },
  chat: { accent: DEFAULT_ACCENT },
};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Monotonic per-tab write counter — a refresh in flight never overwrites a
 *  newer selection made after the read started. */
const writeSeq: Record<TabKey, number> = { home: 0, calendar: 0, chat: 0 };

function applyTab(tab: TabKey, a: TabAppearance): void {
  cache[tab] = a;
  setTabAccentRuntime(tab, a.accent);
}

// Wire the storage layer's write notifications into the runtime cache.
registerAppearanceWriteListener((tab, next) => {
  writeSeq[tab]++;
  applyTab(tab, next);
  notify();
});

/** Pulls persisted prefs into the runtime cache. Safe to call on focus. */
export async function refreshTabAppearance(): Promise<void> {
  const seq = { ...writeSeq };
  const all = await getAllTabAppearance();
  let changed = false;
  for (const tab of TAB_KEYS) {
    // Skip tabs written during the await — their runtime value is newer.
    // Applies on the very first load too: a write mid-read must win.
    if (writeSeq[tab] !== seq[tab]) continue;
    if (
      cache[tab].accent !== all[tab].accent ||
      cache[tab].textMode !== all[tab].textMode ||
      cache[tab].backgroundColor !== all[tab].backgroundColor
    ) {
      applyTab(tab, all[tab]);
      changed = true;
    }
  }
  if (changed) notify();
}

/** Current cached appearance without subscribing — for imperative reads. */
export function getTabAppearanceSnapshot(tab: TabKey): TabAppearance {
  return cache[tab];
}

/** Low-level subscription — used by useTabAppearance and tests. */
export function subscribeTabAppearance(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useTabAppearance(tab: TabKey): TabAppearance {
  const a = useSyncExternalStore(subscribeTabAppearance, () => cache[tab]);
  // First mount anywhere triggers the cold-start load from SecureStore.
  useEffect(() => {
    void refreshTabAppearance();
  }, []);
  return a;
}
