import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = new Map<string, string>();
const getItem = vi.fn(async (k: string) => secureStore.get(k) ?? null);

vi.mock('expo-secure-store', () => ({
  getItemAsync: (...args: [string]) => getItem(...args),
  setItemAsync: async (k: string, v: string) => {
    secureStore.set(k, v);
  },
  deleteItemAsync: async (k: string) => {
    secureStore.delete(k);
  },
}));

// getAllTabAppearance verifies stored URIs still exist — pretend they do.
vi.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(...uris: unknown[]) {
      this.uri = uris.join('/');
    }
    get exists() {
      return true;
    }
  },
  Directory: class {
    list() {
      return [];
    }
  },
  Paths: { document: 'file:///docs', cache: 'file:///cache' },
}));

const seed = (raw: Record<string, unknown>) =>
  secureStore.set('tab_appearance_v1', JSON.stringify(raw));

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.resetModules();
  secureStore.clear();
  getItem.mockReset();
  getItem.mockImplementation(async (k: string) => secureStore.get(k) ?? null);
});

async function freshStore() {
  const mod = await import('../utils/tabAppearanceStore');
  return mod;
}

describe('tabAppearanceStore', () => {
  it('loads persisted prefs on first refresh', async () => {
    seed({
      calendar: { imageUri: 'file:///docs/a.jpg', dim: 'strong', accent: '#0D9488' },
    });
    const store = await freshStore();
    await store.refreshTabAppearance();
    expect(store.getTabAppearanceSnapshot('calendar')).toEqual({
      imageUri: 'file:///docs/a.jpg',
      dim: 'strong',
      accent: '#0D9488',
    });
  });

  it('notifies subscribers when a persisted write lands', async () => {
    const store = await freshStore();
    const { setTabAccent } = await import('../utils/tabAppearance');
    const calls: number[] = [];
    store.subscribeTabAppearance(() => calls.push(Date.now()));
    await store.refreshTabAppearance();
    await setTabAccent('home', '#3B82F6');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(store.getTabAppearanceSnapshot('home').accent).toBe('#3B82F6');
  });

  it('a stale async read never overwrites a newer write', async () => {
    seed({
      home: { imageUri: 'file:///docs/old.jpg', dim: 'subtle', accent: '#111111' },
    });
    const store = await freshStore();
    const { setTabAccent } = await import('../utils/tabAppearance');

    // Make the refresh's second SecureStore read (the post-migration prefs
    // read) hang so a write can land mid-flight.
    let resolveRead!: (v: string | null) => void;
    getItem
      .mockImplementationOnce(async () => secureStore.get('tab_appearance_v1') ?? null)
      .mockImplementationOnce(
        () => new Promise((r) => (resolveRead = r)),
      );

    const refresh = store.refreshTabAppearance();
    await tick();

    // A newer write completes while the refresh read is still pending.
    await setTabAccent('home', '#FDE047');
    expect(store.getTabAppearanceSnapshot('home').accent).toBe('#FDE047');

    // The stale read resolves with the pre-write value — it must be ignored.
    resolveRead(
      JSON.stringify({
        home: { imageUri: 'file:///docs/old.jpg', dim: 'subtle', accent: '#111111' },
      }),
    );
    await refresh;

    expect(store.getTabAppearanceSnapshot('home').accent).toBe('#FDE047');
  });

  it('writes to one tab do not perturb the others', async () => {
    seed({ chat: { imageUri: null, dim: 'off', accent: '#E56B8A' } });
    const store = await freshStore();
    const { setTabAccent } = await import('../utils/tabAppearance');
    await store.refreshTabAppearance();
    await setTabAccent('home', '#EA873D');
    expect(store.getTabAppearanceSnapshot('chat').accent).toBe('#E56B8A');
    expect(store.getTabAppearanceSnapshot('calendar').accent).toBe('#7161EF');
  });
});
