import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Controlled fakes ─────────────────────────────────────────────────────────
// expo-secure-store → in-memory key/value; expo-file-system → in-memory disk;
// expo-image-picker / expo-image-manipulator → per-test scripted results.

const secureStore = new Map<string, string>();
const disk = new Set<string>();

vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => secureStore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => {
    secureStore.set(k, v);
  },
  deleteItemAsync: async (k: string) => {
    secureStore.delete(k);
  },
}));

vi.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    name: string;
    constructor(...uris: unknown[]) {
      this.uri = uris.join('/');
      this.name = this.uri.split('/').pop()!;
    }
    get exists() {
      return disk.has(this.uri);
    }
    delete() {
      disk.delete(this.uri);
    }
    async copy(dest: MockFile, opts?: { overwrite?: boolean }) {
      if (!disk.has(this.uri)) throw new Error(`source missing: ${this.uri}`);
      if (disk.has(dest.uri) && !opts?.overwrite) throw new Error('DestinationAlreadyExists');
      disk.add(dest.uri);
    }
    async move(dest: MockFile, opts?: { overwrite?: boolean }) {
      await this.copy(dest, opts);
      disk.delete(this.uri);
    }
  }
  class MockDirectory {
    uri: string;
    constructor(...uris: unknown[]) {
      this.uri = uris.join('/');
    }
    list() {
      return [...disk]
        .filter((u) => u.startsWith(`${this.uri}/`))
        .map((u) => new MockFile(u));
    }
  }
  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'file:///docs', cache: 'file:///cache' },
  };
});

vi.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: vi.fn(),
}));

let manipulatorShouldFail = false;
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: (uri: string) => ({
      resize: () => {},
      renderAsync: async () => ({
        saveAsync: async () => {
          if (manipulatorShouldFail) throw new Error('render failed');
          const out = `file:///cache/manip-${Date.now()}.jpg`;
          disk.add(out);
          return { uri: out };
        },
      }),
    }),
  },
}));

import * as ImagePicker from 'expo-image-picker';
import {
  TabKey,
  clearTabBackground,
  getAllTabAppearance,
  getTabAppearance,
  pickAndStoreTabBackground,
  registerAppearanceWriteListener,
  setTabAccent,
  setTabDim,
} from '../utils/tabAppearance';

const launchPicker = vi.mocked(ImagePicker.launchImageLibraryAsync);

function pickSucceeds(uri = 'file:///photos/selected.jpg') {
  launchPicker.mockResolvedValue({
    canceled: false,
    assets: [{ uri }],
  } as never);
}

beforeEach(() => {
  vi.resetModules();
  secureStore.clear();
  disk.clear();
  manipulatorShouldFail = false;
  launchPicker.mockReset();
});

describe('pickAndStoreTabBackground', () => {
  it('stores a new versioned file and persists its URI', async () => {
    pickSucceeds();
    const uri = await pickAndStoreTabBackground('home');
    expect(uri).toMatch(/^file:\/\/\/docs\/tab-background-home-\d+-[a-z0-9]+\.jpg$/);
    expect(disk.has(uri!)).toBe(true);
    expect((await getTabAppearance('home')).imageUri).toBe(uri);
  });

  it('replaces an existing background and deletes the old managed file', async () => {
    pickSucceeds();
    const first = await pickAndStoreTabBackground('calendar');
    expect(first).toBeTruthy();

    pickSucceeds('file:///photos/second.jpg');
    const second = await pickAndStoreTabBackground('calendar');
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    expect(disk.has(first!)).toBe(false); // old file cleaned up
    expect(disk.has(second!)).toBe(true);
    expect((await getTabAppearance('calendar')).imageUri).toBe(second);
  });

  it('returns null on picker cancel and leaves prefs untouched', async () => {
    pickSucceeds();
    const first = await pickAndStoreTabBackground('chat');
    launchPicker.mockResolvedValue({ canceled: true, assets: [] } as never);
    const res = await pickAndStoreTabBackground('chat');
    expect(res).toBeNull();
    expect((await getTabAppearance('chat')).imageUri).toBe(first);
  });

  it('keeps the previous background when manipulation fails', async () => {
    pickSucceeds();
    const first = await pickAndStoreTabBackground('home');
    pickSucceeds('file:///photos/retry.jpg');
    manipulatorShouldFail = true;
    await expect(pickAndStoreTabBackground('home')).rejects.toThrow('render failed');
    expect((await getTabAppearance('home')).imageUri).toBe(first);
  });

  it('fires the write listener so subscribers update immediately', async () => {
    const seen: { tab: TabKey; imageUri: string | null }[] = [];
    registerAppearanceWriteListener((tab, next) =>
      seen.push({ tab, imageUri: next.imageUri }),
    );
    pickSucceeds();
    const uri = await pickAndStoreTabBackground('home');
    expect(seen).toEqual([{ tab: 'home', imageUri: uri }]);
  });
});

describe('per-tab isolation', () => {
  it('changing one tab never touches the others', async () => {
    pickSucceeds();
    const homeUri = await pickAndStoreTabBackground('home');
    const calUri = await pickAndStoreTabBackground('calendar');
    const chatUri = await pickAndStoreTabBackground('chat');
    await setTabAccent('chat', '#FDE047');
    await setTabDim('home', 'strong');

    const all = await getAllTabAppearance();
    expect(all.home).toEqual({ imageUri: homeUri, dim: 'strong', accent: '#7161EF' });
    expect(all.calendar).toEqual({ imageUri: calUri, dim: 'subtle', accent: '#7161EF' });
    expect(all.chat).toEqual({ imageUri: chatUri, dim: 'subtle', accent: '#FDE047' });
  });

  it('clearing one tab deletes only that tab\u2019s files', async () => {
    pickSucceeds();
    const homeUri = await pickAndStoreTabBackground('home');
    const chatUri = await pickAndStoreTabBackground('chat');
    await clearTabBackground('home');
    expect(disk.has(homeUri!)).toBe(false);
    expect(disk.has(chatUri!)).toBe(true);
    expect((await getTabAppearance('home')).imageUri).toBeNull();
    expect((await getTabAppearance('chat')).imageUri).toBe(chatUri);
  });
});

describe('missing-file fallback', () => {
  it('reports imageUri null when the stored file was deleted externally', async () => {
    pickSucceeds();
    const uri = await pickAndStoreTabBackground('calendar');
    disk.delete(uri!); // simulate external cleanup / restore edge
    expect((await getTabAppearance('calendar')).imageUri).toBeNull();
  });
});
