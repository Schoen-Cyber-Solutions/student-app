import { describe, it, expect } from 'vitest';
import { monthGridRows, monthAgendaSelection, dayAgendaEvents } from '@/utils/monthGrid';
import type { MyCalendarEvent } from '@/services/api/calendar';

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

// ── Selected-day agenda ────────────────────────────────────────────────────
// monthAgendaSelection + dayAgendaEvents are the pure rules behind the
// Month agenda: the heading/date only exists while the selection is inside
// the displayed month, and cards are chronological.

function evt(id: string, startAt: string, provider = 'course_schedule'): MyCalendarEvent {
  return {
    id,
    provider,
    title: id,
    description: null,
    location: null,
    startAt,
    endAt: null,
    allDay: false,
    courseCode: null,
    courseName: null,
    color: null,
  };
}

describe('monthAgendaSelection — in-month selection rule', () => {
  it('returns the selection when it is inside the displayed month', () => {
    const sel = new Date(2026, 9, 5);
    expect(monthAgendaSelection(sel, new Date(2026, 9, 1))).toBe(sel);
  });

  it('returns null when the selection is from a different month (Oct 5 under Nov grid)', () => {
    const sel = new Date(2026, 9, 5);
    expect(monthAgendaSelection(sel, new Date(2026, 10, 1))).toBeNull();
  });

  it('returns null when no selection exists', () => {
    expect(monthAgendaSelection(null, new Date(2026, 10, 1))).toBeNull();
  });

  it('rejects a same-day-of-month date from a different year', () => {
    const sel = new Date(2025, 9, 5);
    expect(monthAgendaSelection(sel, new Date(2026, 9, 1))).toBeNull();
  });
});

describe('dayAgendaEvents — selected-day content', () => {
  const day = new Date(2026, 9, 6); // Tuesday Oct 6

  it('sorts events chronologically by start time, never alphabetically', () => {
    const events = [
      evt('z-late', '2026-10-06T18:00:00', 'laker_connect'),
      evt('a-early', '2026-10-06T09:00:00', 'course_schedule'),
      evt('m-mid', '2026-10-06T13:00:00', 'personal'),
    ];
    const out = dayAgendaEvents(events, day);
    expect(out.map((e) => e.id)).toEqual(['a-early', 'm-mid', 'z-late']);
  });

  it('includes course, personal, and saved Laker events on the day', () => {
    const events = [
      evt('course', '2026-10-06T09:00:00', 'course_schedule'),
      evt('personal', '2026-10-06T13:00:00', 'personal'),
      evt('laker', '2026-10-06T18:00:00', 'laker_connect'),
    ];
    expect(dayAgendaEvents(events, day)).toHaveLength(3);
  });

  it('excludes events on other days', () => {
    const events = [evt('here', '2026-10-06T09:00:00'), evt('else', '2026-10-07T09:00:00')];
    expect(dayAgendaEvents(events, day).map((e) => e.id)).toEqual(['here']);
  });

  it('returns an empty list for a day with no events (the "No events" state)', () => {
    expect(dayAgendaEvents([], day)).toEqual([]);
  });

  it('keeps real titles — no provider-based renaming happens here', () => {
    const laker = evt('saved', '2026-10-06T18:00:00', 'laker_connect');
    laker.title = 'Roosevelt Homecoming Game';
    expect(dayAgendaEvents([laker], day)[0].title).toBe('Roosevelt Homecoming Game');
  });
});
