import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

/**
 * App theme preference — 'light' | 'dark', stored locally in SecureStore
 * alongside the other device-side prefs. Never sent to the backend.
 * There is intentionally no 'system' option in v1: the app offers exactly
 * the two Study with Emy themes, defaulting to Dark for fresh installs.
 */

export type AppTheme = 'light' | 'dark';

const KEY = 'app.theme.v1';
export const DEFAULT_THEME: AppTheme = 'dark';

let current: AppTheme = DEFAULT_THEME;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function sanitize(v: unknown): AppTheme {
  return v === 'light' ? 'light' : 'dark';
}

export function getAppThemeSnapshot(): AppTheme {
  return current;
}

/** Writes the preference and notifies mounted screens immediately. */
export async function setAppTheme(theme: AppTheme): Promise<void> {
  current = theme;
  notify();
  try {
    await SecureStore.setItemAsync(KEY, theme);
  } catch {
    // In-memory value still applies for this session.
  }
}

/** Loads the persisted preference — falls back to Dark when unset/corrupt. */
export async function refreshAppTheme(): Promise<void> {
  try {
    const next = sanitize(await SecureStore.getItemAsync(KEY));
    if (next !== current) {
      current = next;
      notify();
    }
  } catch {
    // Keep the default.
  }
}

export function subscribeAppTheme(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Reactive theme — 'dark' until the persisted pref hydrates on first mount. */
export function useAppTheme(): AppTheme {
  const theme = useSyncExternalStore(subscribeAppTheme, getAppThemeSnapshot);
  useEffect(() => {
    void refreshAppTheme();
  }, []);
  return theme;
}
