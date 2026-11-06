import { describe, it, expect } from 'vitest';
import { HOURS12, to24 } from '@/utils/timeWheel';

// Wheel ordering + 12h→24h conversion. The hour column must read 1..12;
// conversions have to be right at every AM/PM boundary.

describe('HOURS12 wheel order', () => {
  it('lists hours 1 through 12 in order', () => {
    expect(HOURS12).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe('to24 — boundary conversions', () => {
  const idx = (h12: number) => HOURS12.indexOf(h12);

  it('11 AM stays 11', () => {
    expect(to24(idx(11), 0)).toBe(11);
  });
  it('12 PM (noon) is 12, not 0', () => {
    expect(to24(idx(12), 1)).toBe(12);
  });
  it('12 AM (midnight) is 0, not 12', () => {
    expect(to24(idx(12), 0)).toBe(0);
  });
  it('1 AM is 1 and 1 PM is 13', () => {
    expect(to24(idx(1), 0)).toBe(1);
    expect(to24(idx(1), 1)).toBe(13);
  });
  it('11 PM is 23', () => {
    expect(to24(idx(11), 1)).toBe(23);
  });
});

describe('hour index round-trip', () => {
  // TimeWheelField maps hour24 → index the same way; verify every h12.
  it.each(HOURS12)('hour %s resolves through indexOf → to24', (h12) => {
    const i = HOURS12.indexOf(h12);
    expect(to24(i, 0)).toBe(h12 % 12); // AM
    expect(to24(i, 1)).toBe((h12 % 12) + 12); // PM
  });
});
