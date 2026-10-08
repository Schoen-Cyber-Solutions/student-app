import * as SecureStore from 'expo-secure-store';

/**
 * User-configurable visible time range for the Day and Week calendar
 * timelines. Stored locally in SecureStore alongside the other device-side
 * preferences (tab appearance, FAB position) — never uploaded.
 *
 * Values are minutes after midnight (0–1440) so the picker's hour/minute
 * choice round-trips exactly; the timeline math multiplies by px/minute.
 */

const PREFS_KEY = 'calendar_range_v1';

export interface CalendarRange {
  /** First visible minute of the timeline (default 360 = 6:00 AM). */
  startMin: number;
  /** Last visible minute boundary (default 1320 = 10:00 PM). */
  endMin: number;
}

export const DEFAULT_CALENDAR_RANGE: CalendarRange = {
  startMin: 6 * 60,
  endMin: 22 * 60,
};

/** Practical bounds: no start before 4:00 AM, no end past midnight. */
export const CALENDAR_RANGE_MIN_START = 4 * 60;
export const CALENDAR_RANGE_MAX_END = 24 * 60;
/** Keep at least one hour of timeline — a narrower window is unusable. */
export const MIN_RANGE_MINUTES = 60;

export function isValidRange(startMin: number, endMin: number): boolean {
  return (
    Number.isInteger(startMin) &&
    Number.isInteger(endMin) &&
    startMin >= CALENDAR_RANGE_MIN_START &&
    startMin <= 23 * 60 + 59 &&
    endMin >= 1 &&
    endMin <= CALENDAR_RANGE_MAX_END &&
    endMin - startMin >= MIN_RANGE_MINUTES
  );
}

/** "6:00 AM" / "12:00 AM" — 12-hour display with minutes. */
export function formatRangeMinutes(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

/** Whole-hour boundaries inside the visible range — timeline labels/lines.
 *  A range of 6:00–22:00 ticks 6 AM … 9 PM; the bottom edge (10 PM) is the
 *  grid's closing boundary, matching the views' existing label style. */
export function timelineHourTicks(startMin: number, endMin: number): number[] {
  const ticks: number[] = [];
  for (let h = Math.ceil(startMin / 60); h < Math.ceil(endMin / 60); h++) {
    ticks.push(h);
  }
  return ticks;
}

/** Invoked after every successful preference write — the runtime store in
 *  ./calendarRangeStore registers here so mounted screens update live. */
const writeListeners = new Set<(next: CalendarRange) => void>();
export function registerCalendarRangeWriteListener(
  cb: (next: CalendarRange) => void,
): () => void {
  writeListeners.add(cb);
  return () => {
    writeListeners.delete(cb);
  };
}

function sanitizeRange(v: unknown): CalendarRange {
  if (typeof v !== 'object' || v === null) return DEFAULT_CALENDAR_RANGE;
  const { startMin, endMin } = v as Record<string, unknown>;
  if (typeof startMin === 'number' && typeof endMin === 'number' && isValidRange(startMin, endMin)) {
    return { startMin, endMin };
  }
  return DEFAULT_CALENDAR_RANGE;
}

export async function getCalendarRange(): Promise<CalendarRange> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY);
    return raw ? sanitizeRange(JSON.parse(raw)) : DEFAULT_CALENDAR_RANGE;
  } catch {
    // Corrupt JSON or unavailable storage — fall back to the default.
    return DEFAULT_CALENDAR_RANGE;
  }
}

/** Throws on an invalid range — callers surface the message and never save. */
export async function setCalendarRange(range: CalendarRange): Promise<CalendarRange> {
  if (!isValidRange(range.startMin, range.endMin)) {
    throw new Error('End time must be later than start time.');
  }
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(range));
  writeListeners.forEach((cb) => cb(range));
  return range;
}

export async function resetCalendarRange(): Promise<CalendarRange> {
  await SecureStore.deleteItemAsync(PREFS_KEY);
  writeListeners.forEach((cb) => cb(DEFAULT_CALENDAR_RANGE));
  return DEFAULT_CALENDAR_RANGE;
}
