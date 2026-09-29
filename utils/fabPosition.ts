import * as SecureStore from 'expo-secure-store';

/**
 * Persists the Calendar floating action button's drag offset locally.
 * The stored value is a translation {x, y} relative to the button's default
 * anchor (bottom-right, above the tab bar) — it is re-clamped against current
 * screen bounds on every load, so positions saved on other device sizes
 * degrade safely instead of going off-screen.
 */
const FAB_KEY = 'calendar.fabPosition';

export interface FabOffset {
  x: number;
  y: number;
}

export async function loadFabPosition(): Promise<FabOffset | null> {
  try {
    const raw = await SecureStore.getItemAsync(FAB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export async function saveFabPosition(offset: FabOffset): Promise<void> {
  try {
    await SecureStore.setItemAsync(FAB_KEY, JSON.stringify(offset));
  } catch {
    // Non-fatal — the button still works for this session.
  }
}

export async function clearFabPosition(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(FAB_KEY);
  } catch {
    // Non-fatal.
  }
}
