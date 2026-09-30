import { describe, it, expect } from 'vitest';
import { monthGridRows } from '@/utils/monthGrid';

// The Month grid is Monday-first: column 0 = Monday … column 6 = Sunday.
// These tests pin the alignment, not just the labels.

describe('monthGridRows — Monday-first grid', () => {
  it('every row starts on a Monday and ends on a Sunday', () => {
    for (const month of [new Date(2026, 9, 1), new Date(2026, 0, 1), new Date(2027, 5, 15)]) {
      for (const row of monthGridRows(month)) {
        expect(row).toHaveLength(7);
        expect(row[0].getDay()).toBe(1); // Monday
        expect(row[6].getDay()).toBe(0); // Sunday
      }
    }
  });

  it('Oct 1, 2026 (Thursday) sits in the THU column of the first row', () => {
    const rows = monthGridRows(new Date(2026, 9, 1));
    // Week 1: Mon Sep 28 … Sun Oct 4.
    expect(rows[0][0].toDateString()).toBe(new Date(2026, 8, 28).toDateString());
    expect(rows[0][3].toDateString()).toBe(new Date(2026, 9, 1).toDateString()); // THU
    expect(rows[0][6].toDateString()).toBe(new Date(2026, 9, 4).toDateString()); // SUN
  });

  it('a month starting on Monday has no leading overflow days', () => {
    const rows = monthGridRows(new Date(2027, 2, 1)); // March 1, 2027 is a Monday
    expect(rows[0][0].toDateString()).toBe(new Date(2027, 2, 1).toDateString());
  });

  it('a month starting on Sunday fills Mon–Sat with the previous month', () => {
    const rows = monthGridRows(new Date(2026, 10, 1)); // Nov 1, 2026 is a Sunday
    expect(rows[0][0].toDateString()).toBe(new Date(2026, 9, 26).toDateString()); // Mon Oct 26
    expect(rows[0][6].toDateString()).toBe(new Date(2026, 10, 1).toDateString());
  });

  it('cells are consecutive calendar days across the whole grid', () => {
    const rows = monthGridRows(new Date(2026, 9, 1));
    const flat = rows.flat();
    for (let i = 1; i < flat.length; i++) {
      const prev = new Date(flat[i - 1]);
      prev.setDate(prev.getDate() + 1);
      expect(flat[i].toDateString()).toBe(prev.toDateString());
    }
  });
});
