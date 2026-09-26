/**
 * Compatibility layer — the calendar-specific API delegates to the shared
 * per-tab appearance store in ./tabAppearance. New code should import from
 * 'utils/tabAppearance' directly.
 */
import {
  DimLevel,
  TabAppearance,
  clearTabBackground,
  getTabAppearance,
  pickAndStoreTabBackground,
  setTabAccent,
  setTabDim,
} from './tabAppearance';

export {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  DIM_FRACTION,
} from './tabAppearance';
export type { DimLevel };
export type CalendarAppearance = TabAppearance;

export function getCalendarAppearance(): Promise<TabAppearance> {
  return getTabAppearance('calendar');
}

export function pickAndStoreBackground(): Promise<string | null> {
  return pickAndStoreTabBackground('calendar');
}

export function clearCalendarBackground(): Promise<void> {
  return clearTabBackground('calendar');
}

export function setCalendarDim(dim: DimLevel): Promise<void> {
  return setTabDim('calendar', dim);
}

export function setCalendarAccent(accent: string): Promise<void> {
  return setTabAccent('calendar', accent);
}
