import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Controlled fake ─────────────────────────────────────────────────────────
// expo-secure-store → in-memory key/value store.

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
  TAB_TEXT_COLORS,
  TabKey,
  getAllTabAppearance,
  getTabAppearance,
  getTabTextColors,
  registerAppearanceWriteListener,
  resolveBackgroundColor,
  resolveTextMode,
  setTabAccent,
  setTabBackgroundColor,
  setTabTextMode,
} from '../utils/tabAppearance';

beforeEach(() => {
  vi.resetModules();
  secureStore.clear();
});

describe('per-tab isolation', () => {
  it('changing one tab never touches the others', async () => {
    await setTabBackgroundColor('home', '#EDE6DA');
    await setTabBackgroundColor('calendar', '#DBEAFE');
    await setTabBackgroundColor('chat', '#0F0F12');
    await setTabAccent('chat', '#FDE047');
    await setTabTextMode('home', 'light');

    const all = await getAllTabAppearance();
    expect(all.home).toEqual({
      backgroundColor: '#EDE6DA',
      accent: '#7161EF',
      textMode: 'light',
    });
    expect(all.calendar).toEqual({
      backgroundColor: '#DBEAFE',
      accent: '#7161EF',
      textMode: undefined,
    });
    expect(all.chat).toEqual({
      backgroundColor: '#0F0F12',
      accent: '#FDE047',
      textMode: undefined,
    });
  });

  it('fires the write listener so subscribers update immediately', async () => {
    const seen: { tab: TabKey; backgroundColor?: string }[] = [];
    registerAppearanceWriteListener((tab, next) =>
      seen.push({ tab, backgroundColor: next.backgroundColor }),
    );
    await setTabBackgroundColor('home', '#DCE8DC');
    expect(seen).toEqual([{ tab: 'home', backgroundColor: '#DCE8DC' }]);
  });
});

describe('textMode', () => {
  it('is unset for existing installs and resolves to the scheme default', async () => {
    const a = await getTabAppearance('home');
    expect(a.textMode).toBeUndefined();
    // Unset preserves the pre-feature behavior: dark OS scheme → light text.
    expect(resolveTextMode(a, 'light')).toBe('dark');
    expect(resolveTextMode(a, 'dark')).toBe('light');
  });

  it('persists per-tab and survives unrelated appearance writes', async () => {
    await setTabTextMode('calendar', 'light');
    expect((await getTabAppearance('calendar')).textMode).toBe('light');
    expect((await getTabAppearance('home')).textMode).toBeUndefined();
    expect((await getTabAppearance('chat')).textMode).toBeUndefined();

    await setTabBackgroundColor('calendar', '#0F0F12');
    await setTabAccent('calendar', '#E56B8A');
    const a = await getTabAppearance('calendar');
    expect(a.textMode).toBe('light');
    expect(a.backgroundColor).toBe('#0F0F12');
    expect(a.accent).toBe('#E56B8A');
  });

  it('explicit choice overrides the scheme default', () => {
    expect(resolveTextMode({ textMode: 'light' }, 'light')).toBe('light');
    expect(resolveTextMode({ textMode: 'dark' }, 'dark')).toBe('dark');
  });

  it('rejects corrupt stored values', async () => {
    secureStore.set(
      'tab_appearance_v1',
      JSON.stringify({ home: { textMode: 'rainbow', accent: '#3B82F6' } }),
    );
    const a = await getTabAppearance('home');
    expect(a.textMode).toBeUndefined();
    expect(a.accent).toBe('#3B82F6');
  });

  it('exposes dark-text and light-text token sets', () => {
    const dark = getTabTextColors({ textMode: 'dark' }, 'light');
    expect(dark).toEqual(TAB_TEXT_COLORS.dark);
    expect(dark.primary).toBe('#0B1220');
    const light = getTabTextColors({ textMode: 'light' }, 'dark');
    expect(light.primary).toBe('#F8FAFC');
    // Unset → scheme-derived tokens.
    expect(getTabTextColors({}, 'dark')).toEqual(TAB_TEXT_COLORS.light);
  });
});

describe('backgroundColor', () => {
  it('defaults to the scheme-aware solid color for fresh installs', async () => {
    const a = await getTabAppearance('home');
    expect(a.backgroundColor).toBeUndefined();
    expect(resolveBackgroundColor(a, 'light')).toBe('#F4F2FA');
    expect(resolveBackgroundColor(a, 'dark')).toBe('#10131C');
  });

  it('persists a custom color per tab and rejects invalid values on read', async () => {
    await setTabBackgroundColor('home', '#EDE6DA');
    await setTabBackgroundColor('chat', '#0F0F12');
    const all = await getAllTabAppearance();
    expect(all.home.backgroundColor).toBe('#EDE6DA');
    expect(all.chat.backgroundColor).toBe('#0F0F12');
    expect(all.calendar.backgroundColor).toBeUndefined();

    secureStore.set(
      'tab_appearance_v1',
      JSON.stringify({ home: { backgroundColor: 'not-a-color' } }),
    );
    const a = await getTabAppearance('home');
    expect(a.backgroundColor).toBeUndefined();
    expect(resolveBackgroundColor(a, 'light')).toBe('#F4F2FA'); // safe fallback
  });
});

describe('legacy photo data', () => {
  it('ignores stored photo fields, keeps accent/textMode, falls back to solid', async () => {
    // Store shape written before photos were removed.
    secureStore.set(
      'tab_appearance_v1',
      JSON.stringify({
        calendar: {
          imageUri: 'file:///docs/tab-background-calendar-1-abc.jpg',
          dim: 'strong',
          backgroundType: 'photo',
          accent: '#0D9488',
          textMode: 'light',
        },
      }),
    );
    const a = await getTabAppearance('calendar');
    // Legacy fields are dropped from the model — no crash, no photo logic.
    expect(a).toEqual({
      accent: '#0D9488',
      textMode: 'light',
      backgroundColor: undefined,
    });
    expect(resolveBackgroundColor(a, 'light')).toBe('#F4F2FA');
  });

  it('ignores photo fields in the legacy calendar_appearance_v1 store', async () => {
    secureStore.set(
      'calendar_appearance_v1',
      JSON.stringify({
        imageUri: 'file:///docs/old.jpg',
        dim: 'subtle',
        accent: '#E56B8A',
      }),
    );
    // Fresh module so the one-time migration flag is unset.
    const fresh = await import('../utils/tabAppearance');
    const a = await fresh.getTabAppearance('calendar');
    expect(a).toEqual({ accent: '#E56B8A', textMode: undefined, backgroundColor: undefined });
  });
});
