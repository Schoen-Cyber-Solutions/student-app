import { describe, it, expect } from 'vitest';
import { upcomingWeekBucket, getMondayOfWeek } from '@/utils/time';

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
