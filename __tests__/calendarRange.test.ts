import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  CALENDAR_RANGE_MAX_END,
  CALENDAR_RANGE_MIN_START,
  DEFAULT_CALENDAR_RANGE,
  formatRangeMinutes,
  getCalendarRange,
  isValidRange,
  registerCalendarRangeWriteListener,
  resetCalendarRange,
  setCalendarRange,
  timelineHourTicks,
} from '../utils/calendarRange';
import { eventBlockSpan } from '../utils/time';

beforeEach(() => {
  vi.resetModules();
  secureStore.clear();
});

describe('defaults (A)', () => {
  it('fresh install resolves to 6:00 AM – 10:00 PM', async () => {
    expect(await getCalendarRange()).toEqual({ startMin: 360, endMin: 1320 });
    expect(formatRangeMinutes(DEFAULT_CALENDAR_RANGE.startMin)).toBe('6:00 AM');
    expect(formatRangeMinutes(DEFAULT_CALENDAR_RANGE.endMin)).toBe('10:00 PM');
  });
});

describe('persistence (B/C/D)', () => {
  it('a saved range round-trips and survives module reload (restart)', async () => {
    await setCalendarRange({ startMin: 7 * 60, endMin: 21 * 60 }); // 7 AM–9 PM
    expect(await getCalendarRange()).toEqual({ startMin: 420, endMin: 1260 });

    const fresh = await import('../utils/calendarRange');
    expect(await fresh.getCalendarRange()).toEqual({ startMin: 420, endMin: 1260 });
  });

  it('fires the write listener so Day/Week update live', async () => {
    const seen: number[] = [];
    registerCalendarRangeWriteListener((r) => seen.push(r.startMin));
    await setCalendarRange({ startMin: 7 * 60, endMin: 21 * 60 });
    expect(seen).toEqual([420]);
  });
});

describe('validation (E)', () => {
  it('rejects end <= start', async () => {
    expect(isValidRange(22 * 60, 6 * 60)).toBe(false);
    expect(isValidRange(12 * 60, 12 * 60)).toBe(false);
    await expect(setCalendarRange({ startMin: 22 * 60, endMin: 6 * 60 })).rejects.toThrow();
  });

  it('rejects out-of-bounds endpoints and impossibly thin ranges', () => {
    expect(isValidRange(3 * 60, 12 * 60)).toBe(false); // start before 4 AM
    expect(isValidRange(6 * 60, 25 * 60)).toBe(false); // end past midnight
    expect(isValidRange(6 * 60, 6 * 60 + 30)).toBe(false); // < 1h of timeline
    expect(isValidRange(CALENDAR_RANGE_MIN_START, CALENDAR_RANGE_MAX_END)).toBe(true); // 4 AM–12 AM ok
  });

  it('rejects fractional/non-integer minutes', () => {
    expect(isValidRange(360.5, 1320)).toBe(false);
  });

  it('corrupt stored values fall back to the default', async () => {
    secureStore.set('calendar_range_v1', 'not json');
    expect(await getCalendarRange()).toEqual(DEFAULT_CALENDAR_RANGE);
    secureStore.set('calendar_range_v1', JSON.stringify({ startMin: 22 * 60, endMin: 6 * 60 }));
    expect(await getCalendarRange()).toEqual(DEFAULT_CALENDAR_RANGE);
  });
});

describe('timeline geometry (F/G)', () => {
  it('events position proportionally inside the configured window', () => {
    // 8:00–9:30 AM in a 6 AM–10 PM window: starts 120 min in, spans 90 min.
    const span = eventBlockSpan('8:00 AM', '9:30 AM', 6, 22);
    expect(span).toEqual({ startMin: 120, durationMin: 90 });
  });

  it('fractional-minute windows (e.g. 6:30 AM start) still compute', () => {
    const span = eventBlockSpan('8:00 AM', '9:30 AM', 6.5, 22);
    expect(span).toEqual({ startMin: 90, durationMin: 90 });
  });

  it('events outside the window return null — unrendered, never deleted', () => {
    expect(eventBlockSpan('11:00 PM', '11:30 PM', 6, 22)).toBeNull();
  });

  it('partially overlapping events clip to the window edge', () => {
    const span = eventBlockSpan('9:30 PM', '10:30 PM', 6, 22);
    expect(span).toEqual({ startMin: 15 * 60 + 30, durationMin: 30 });
  });
});

describe('hour ticks', () => {
  it('labels every whole-hour boundary inside the range', () => {
    expect(timelineHourTicks(360, 1320)).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  });

  it('a half-hour start ticks from the next whole hour', () => {
    expect(timelineHourTicks(390, 1320)[0]).toBe(7);
  });
});

describe('reset (H)', () => {
  it('restores 6:00 AM – 10:00 PM', async () => {
    await setCalendarRange({ startMin: 7 * 60, endMin: 21 * 60 });
    await resetCalendarRange();
    expect(await getCalendarRange()).toEqual(DEFAULT_CALENDAR_RANGE);
  });
});
