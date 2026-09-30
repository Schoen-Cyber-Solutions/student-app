import { describe, it, expect } from 'vitest';
import { upcomingWeekBucket, getMondayOfWeek, getWeekDayDates, weekStartAtPage, weekPageIndex, WEEK_PAGE_RADIUS, WEEK_PAGE_COUNT } from '@/utils/time';

// Fixed reference point: Wednesday, June 11 2025 — a mid-week `now`.
const WED = new Date(2025, 5, 11, 10, 0, 0);

describe('upcomingWeekBucket', () => {
  it('same-week remainder (Thu–Sun) buckets as this-week', () => {
    const thursday = new Date(2025, 5, 12, 9, 0, 0);
    const sundayEnd = new Date(2025, 5, 15, 23, 59, 59);
    expect(upcomingWeekBucket(thursday, WED)).toBe('this-week');
    expect(upcomingWeekBucket(sundayEnd, WED)).toBe('this-week');
  });

  it('the following Monday starts next-week', () => {
    const monday = new Date(2025, 5, 16, 0, 0, 1);
    expect(upcomingWeekBucket(monday, WED)).toBe('next-week');
  });

  it('the full following week buckets as next-week', () => {
    const nextSunday = new Date(2025, 5, 22, 23, 59, 59);
    expect(upcomingWeekBucket(nextSunday, WED)).toBe('next-week');
  });

  it('weeks beyond next-week bucket as later', () => {
    const thirdMonday = new Date(2025, 5, 23, 8, 0, 0);
    expect(upcomingWeekBucket(thirdMonday, WED)).toBe('later');
  });

  it('on a Sunday, the remainder of "this week" is just that day', () => {
    const sunday = new Date(2025, 5, 15, 9, 0, 0);
    const laterSunday = new Date(2025, 5, 15, 20, 0, 0);
    const tomorrow = new Date(2025, 5, 16, 9, 0, 0);
    expect(upcomingWeekBucket(laterSunday, sunday)).toBe('this-week');
    expect(upcomingWeekBucket(tomorrow, sunday)).toBe('next-week');
  });

  it('on a Monday, the whole week ahead is this-week', () => {
    const monday = new Date(2025, 5, 9, 8, 0, 0);
    const friday = new Date(2025, 5, 13, 17, 0, 0);
    const sunday = new Date(2025, 5, 15, 12, 0, 0);
    expect(upcomingWeekBucket(friday, monday)).toBe('this-week');
    expect(upcomingWeekBucket(sunday, monday)).toBe('this-week');
    expect(upcomingWeekBucket(new Date(2025, 5, 16), monday)).toBe('next-week');
  });

  it('handles month and year boundaries', () => {
    // Sunday Dec 28 2025 — Dec 29 is a Monday, and Jan dates must still
    // bucket correctly across the year boundary.
    const dec28 = new Date(2025, 11, 28, 12, 0, 0);
    const dec29 = new Date(2025, 11, 29, 9, 0, 0);
    const jan5 = new Date(2026, 0, 5, 9, 0, 0);
    expect(upcomingWeekBucket(dec29, dec28)).toBe('next-week');
    expect(upcomingWeekBucket(jan5, dec28)).toBe('later');
  });
});

describe('getMondayOfWeek', () => {
  it('returns the Monday of the same week for any weekday', () => {
    expect(getMondayOfWeek(WED).getDay()).toBe(1);
    expect(getMondayOfWeek(new Date(2025, 5, 15)).getDay()).toBe(1); // Sunday
    expect(getMondayOfWeek(new Date(2025, 5, 9)).getDay()).toBe(1); // Monday itself
  });
});

// ── Week pager page identity ──────────────────────────────────────────────
// The week pager is a finite list of real weeks: index ↔ Monday round-trips
// must be exact, every page's own week must be a real Monday, and each
// single-page step must move exactly one week — no skipped/lagging pages.
describe('week pager page identity', () => {
  // Anchor = Mon Sep 28 2026 (index WEEK_PAGE_RADIUS), matching the device
  // repro weeks Sep 14/21/28, Oct 5/12.
  const anchor = new Date(2026, 8, 28);
  const weekAt = (index: number) => weekStartAtPage(index, anchor);
  const mondayOf = (index: number) => weekAt(index).toDateString();

  it('anchor sits at the window center; every page is a real Monday', () => {
    expect(mondayOf(WEEK_PAGE_RADIUS)).toBe('Mon Sep 28 2026');
    for (const i of [0, 1, WEEK_PAGE_RADIUS - 1, WEEK_PAGE_RADIUS + 1, WEEK_PAGE_COUNT - 1]) {
      expect(weekAt(i).getDay()).toBe(1);
      expect(weekAt(i).getHours()).toBe(0);
    }
  });

  it('consecutive pages are exactly one week apart — no skips', () => {
    for (const i of [WEEK_PAGE_RADIUS - 2, WEEK_PAGE_RADIUS - 1, WEEK_PAGE_RADIUS, WEEK_PAGE_RADIUS + 1]) {
      expect(weekAt(i + 1).getTime() - weekAt(i).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    }
  });

  it('weekPageIndex round-trips every page in the window', () => {
    for (const i of [0, 1, 77, WEEK_PAGE_RADIUS, WEEK_PAGE_COUNT - 2, WEEK_PAGE_COUNT - 1]) {
      expect(weekPageIndex(weekAt(i), anchor)).toBe(i);
    }
  });

  it('index -1 = previous week Sep 21–27 (repro: header AND grid)', () => {
    const dates = getWeekDayDates(weekAt(WEEK_PAGE_RADIUS - 1));
    expect(dates.map((d) => d.getDate())).toEqual([21, 22, 23, 24, 25, 26, 27]);
    expect(dates[6].toDateString()).toBe('Sun Sep 27 2026');
  });

  it('index +1 = next week Oct 5–11', () => {
    const dates = getWeekDayDates(weekAt(WEEK_PAGE_RADIUS + 1));
    expect(dates.map((d) => d.getDate())).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(dates[0].toDateString()).toBe('Mon Oct 05 2026');
  });

  it('prev → next returns to the exact starting week', () => {
    let idx = WEEK_PAGE_RADIUS;
    idx -= 1; // previous
    expect(mondayOf(idx)).toBe('Mon Sep 21 2026');
    idx += 1; // next
    expect(mondayOf(idx)).toBe('Mon Sep 28 2026');
  });

  it('next → prev returns to the exact starting week', () => {
    let idx = WEEK_PAGE_RADIUS;
    idx += 1; // next
    expect(mondayOf(idx)).toBe('Mon Oct 05 2026');
    idx -= 1; // previous
    expect(mondayOf(idx)).toBe('Mon Sep 28 2026');
  });

  it('previous x3 then next x3 returns to the exact starting week', () => {
    let idx = WEEK_PAGE_RADIUS;
    for (let i = 0; i < 3; i++) idx -= 1;
    expect(mondayOf(idx)).toBe('Mon Sep 07 2026');
    for (let i = 0; i < 3; i++) idx += 1;
    expect(mondayOf(idx)).toBe('Mon Sep 28 2026');
  });

  it('next x3 then previous x3 returns to the exact starting week', () => {
    let idx = WEEK_PAGE_RADIUS;
    for (let i = 0; i < 3; i++) idx += 1;
    expect(mondayOf(idx)).toBe('Mon Oct 19 2026');
    for (let i = 0; i < 3; i++) idx -= 1;
    expect(mondayOf(idx)).toBe('Mon Sep 28 2026');
  });

  it('every page stays a real Monday across DST boundaries', () => {
    // US DST: Nov 1 2026 (fall back) and Mar 8 2026 (spring forward) both
    // fall inside this window — a setDate-based step must never land on a
    // Sunday or shift the time.
    for (const i of [WEEK_PAGE_RADIUS - 5, WEEK_PAGE_RADIUS - 30, WEEK_PAGE_RADIUS + 30]) {
      const d = weekAt(i);
      expect(d.getDay()).toBe(1);
      expect(d.getHours()).toBe(0);
    }
    // Forward and backward across fall-back: exact calendar weeks.
    const beforeDST = weekPageIndex(new Date(2026, 9, 26), anchor); // Mon Oct 26
    expect(weekAt(beforeDST + 1).toDateString()).toBe('Mon Nov 02 2026');
    expect(weekAt(beforeDST + 2).toDateString()).toBe('Mon Nov 09 2026');
  });

  it('window covers ±3 years around the anchor', () => {
    expect(WEEK_PAGE_COUNT).toBe(WEEK_PAGE_RADIUS * 2 + 1);
    const expected = new Date(anchor);
    expected.setDate(anchor.getDate() - WEEK_PAGE_RADIUS * 7);
    expect(mondayOf(0)).toBe(expected.toDateString());
  });
});
