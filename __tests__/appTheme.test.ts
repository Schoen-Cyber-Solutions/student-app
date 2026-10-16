import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = new Map<string, string>();

vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => secureStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => {
    secureStore.set(k, v);
  },
  deleteItemAsync: async (k: string) => {
    secureStore.delete(k);
  },
}));

import {
  DEFAULT_THEME,
  getAppThemeSnapshot,
  refreshAppTheme,
  setAppTheme,
  subscribeAppTheme,
} from '../utils/appTheme';

beforeEach(() => {
  vi.resetModules();
  secureStore.clear();
});

describe('appTheme', () => {
  it('defaults to dark for fresh installs', async () => {
    expect(getAppThemeSnapshot()).toBe(DEFAULT_THEME);
    expect(DEFAULT_THEME).toBe('dark');
    await refreshAppTheme();
    expect(getAppThemeSnapshot()).toBe('dark');
  });

  it('restores a persisted light preference', async () => {
    secureStore.set('app.theme.v1', 'light');
    await refreshAppTheme();
    expect(getAppThemeSnapshot()).toBe('light');
  });

  it('setAppTheme notifies subscribers immediately and persists', async () => {
    const seen: string[] = [];
    subscribeAppTheme(() => seen.push(getAppThemeSnapshot()));
    await setAppTheme('light');
    expect(seen).toEqual(['light']);
    expect(secureStore.get('app.theme.v1')).toBe('light');
  });

  it('falls back to dark when the stored value is corrupt', async () => {
    secureStore.set('app.theme.v1', 'rainbow');
    await refreshAppTheme();
    expect(getAppThemeSnapshot()).toBe('dark');
  });
});
