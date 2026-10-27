import { describe, it, expect, afterAll } from 'vitest';
import { dueDateSection } from '@/utils/time';

// Due-date classification for the Home lists. Contract:
//   'today'    — the entire local calendar day containing `now`
//   'upcoming' — tomorrow or later
//   'past'     — before today's local midnight (never shown)
// Classification follows the user's local timezone, not UTC dates.

// Local-field constructors (new Date(y, m, d, h)) are intentionally used
// throughout — they express "this wall-clock time in the runner's timezone".
const NOW_5PM = new Date(2025, 5, 11, 17, 0, 0); // Wednesday, June 11, 5 PM local

describe('dueDateSection — same-day boundaries', () => {
  it('a 9 AM due time is still today at 5 PM (stays all local day)', () => {
    expect(dueDateSection(new Date(2025, 5, 11, 9, 0, 0), NOW_5PM)).toBe('today');
  });

  it('local midnight today is the inclusive lower bound', () => {
    expect(dueDateSection(new Date(2025, 5, 11, 0, 0, 0, 0), NOW_5PM)).toBe('today');
  });

  it('23:59:59.999 today is the inclusive upper bound', () => {
    expect(dueDateSection(new Date(2025, 5, 11, 23, 59, 59, 999), NOW_5PM)).toBe('today');
  });

  it('00:00:00.000 tomorrow starts upcoming', () => {
    expect(dueDateSection(new Date(2025, 5, 12, 0, 0, 0, 0), NOW_5PM)).toBe('upcoming');
  });

  it('one millisecond before local midnight is past', () => {
    expect(dueDateSection(new Date(2025, 5, 10, 23, 59, 59, 999), NOW_5PM)).toBe('past');
  });
});

describe('dueDateSection — midnight transition', () => {
  // The same due instant flips from 'today' to 'past' the moment local
  // midnight passes — this is what drops it from the active lists.
  const DUE = new Date(2025, 5, 11, 21, 0, 0); // 9 PM local

  it('still today one second before midnight', () => {
    expect(dueDateSection(DUE, new Date(2025, 5, 11, 23, 59, 59))).toBe('today');
  });

  it('past one second after midnight', () => {
    expect(dueDateSection(DUE, new Date(2025, 5, 12, 0, 0, 1))).toBe('past');
  });

  it('past by the next morning', () => {
    expect(dueDateSection(DUE, new Date(2025, 5, 12, 8, 30, 0))).toBe('past');
  });
});

describe('dueDateSection — local timezone, not UTC', () => {
  // 2025-06-12T02:30:00Z is June 12 in UTC but June 11 late evening in
  // US/Chicago (21:30 CDT). The classification must use the local date.
  const INSTANT = new Date('2025-06-12T02:30:00.000Z');
  const UTC_TZ = process.env.TZ;

  afterAll(() => {
    if (UTC_TZ === undefined) delete process.env.TZ;
    else process.env.TZ = UTC_TZ;
  });

  it('a UTC "tomorrow" instant is still today in Chicago', () => {
    process.env.TZ = 'America/Chicago';
    const chicagoNow = new Date('2025-06-12T02:00:00.000Z'); // 21:00 local June 11
    expect(chicagoNow.toLocaleDateString('en-CA')).toBe('2025-06-11');
    expect(dueDateSection(INSTANT, chicagoNow)).toBe('today');
  });

  it('the same instant is upcoming in Kiritimati (UTC+14)', () => {
    process.env.TZ = 'Pacific/Kiritimati';
    const kiritimatiNow = new Date('2025-06-12T02:00:00.000Z'); // 16:00 local June 12
    expect(kiritimatiNow.toLocaleDateString('en-CA')).toBe('2025-06-12');
    expect(dueDateSection(INSTANT, kiritimatiNow)).toBe('today'); // same local date still today
    expect(dueDateSection(new Date('2025-06-13T02:30:00.000Z'), kiritimatiNow)).toBe('upcoming');
  });
});

describe('dueDateSection — disjointness', () => {
  it('past, today, and upcoming are mutually exclusive across a sweep', () => {
    const now = new Date(2025, 5, 11, 12, 0, 0);
    const seen = new Set<string>();
    for (let h = -48; h <= 96; h += 3) {
      const d = new Date(now.getTime() + h * 3600_000);
      seen.add(dueDateSection(d, now));
      // Exactly one classification per instant, all three exercised.
      if (h < -24) expect(dueDateSection(d, now)).toBe('past');
      if (h > 24) expect(dueDateSection(d, now)).toBe('upcoming');
    }
    expect([...seen].sort()).toEqual(['past', 'today', 'upcoming']);
  });
});
