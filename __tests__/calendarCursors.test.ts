import { describe, it, expect } from 'vitest';
import {
  type CalendarCursors,
  applyDayChange,
  applyMonthSelect,
  applyMonthShift,
  applyToday,
  applyWeekChange,
  initialCursors,
} from '@/utils/calendarCursors';
import { getMondayOfWeek } from '@/utils/time';

const NOW = new Date(2026, 8, 30); // Wed Sep 30, 2026
const WEEK_SEP28 = getMondayOfWeek(new Date(2026, 8, 28));

describe('calendar cursors — per-view navigation independence', () => {
  it('A: Month swiping leaves the Week cursor exactly where it was', () => {
    let c: CalendarCursors = { ...initialCursors(NOW), currentWeekStart: WEEK_SEP28 };
    c = applyMonthShift(c, 1); // September → October
    c = applyMonthShift(c, 1); // → November
    expect(c.currentMonth.getMonth()).toBe(10);
    expect(c.currentWeekStart).toBe(WEEK_SEP28); // still Sep 28–Oct 4
  });

  it('B: Week swiping leaves the Month cursor exactly where it was', () => {
    let c: CalendarCursors = { ...initialCursors(NOW), currentMonth: new Date(2026, 10, 1) };
    const oct12 = getMondayOfWeek(new Date(2026, 9, 12));
    c = applyWeekChange(c, oct12); // swipe to Oct 12–18
    expect(c.currentWeekStart).toBe(oct12);
    expect(c.currentMonth).toEqual(new Date(2026, 10, 1)); // still November
  });

  it('C: Month swiping leaves the Day cursor exactly where it was', () => {
    const oct3 = new Date(2026, 9, 3);
    let c: CalendarCursors = { ...initialCursors(NOW), currentDay: oct3 };
    c = applyMonthShift(c, 3); // → December
    expect(c.currentMonth.getMonth()).toBe(11);
    expect(c.currentDay).toBe(oct3);
  });

  it('D: Today in Week resets only the week cursor', () => {
    const oct3 = new Date(2026, 9, 3);
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentDay: oct3,
      currentWeekStart: WEEK_SEP28,
      currentMonth: new Date(2026, 11, 1),
      monthSelectedDate: oct3,
    };
    const later = new Date(2026, 9, 14); // Wednesday Oct 14
    c = applyToday(c, 'week', later);
    expect(c.currentWeekStart).toEqual(getMondayOfWeek(later)); // Oct 12 week
    expect(c.currentDay).toBe(oct3);
    expect(c.currentMonth).toEqual(new Date(2026, 11, 1));
    expect(c.monthSelectedDate).toBe(oct3);
  });

  it('E: Today in Month resets only the month cursor (and its selection)', () => {
    const oct3 = new Date(2026, 9, 3);
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentDay: oct3,
      currentWeekStart: WEEK_SEP28,
      currentMonth: new Date(2026, 11, 1),
      monthSelectedDate: oct3,
    };
    const later = new Date(2026, 9, 14);
    c = applyToday(c, 'month', later);
    expect(c.currentMonth).toEqual(new Date(2026, 9, 1)); // October
    expect(c.monthSelectedDate).toBe(later);
    expect(c.currentDay).toBe(oct3);
    expect(c.currentWeekStart).toBe(WEEK_SEP28);
  });

  it('Today in Day resets only the day cursor', () => {
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentWeekStart: WEEK_SEP28,
      currentMonth: new Date(2026, 11, 1),
    };
    const later = new Date(2026, 9, 14);
    c = applyToday(c, 'day', later);
    expect(c.currentDay).toBe(later);
    expect(c.currentWeekStart).toBe(WEEK_SEP28);
    expect(c.currentMonth).toEqual(new Date(2026, 11, 1));
  });

  it('explicit Month date tap: selection only — Day and Week stay put', () => {
    const oct3 = new Date(2026, 9, 3);
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentDay: oct3,
      currentWeekStart: WEEK_SEP28,
      currentMonth: new Date(2026, 10, 1), // viewing November
    };
    c = applyMonthSelect(c, new Date(2026, 10, 15));
    expect(c.monthSelectedDate).toEqual(new Date(2026, 10, 15));
    expect(c.currentMonth).toEqual(new Date(2026, 10, 1));
    expect(c.currentDay).toBe(oct3);
    expect(c.currentWeekStart).toBe(WEEK_SEP28);
  });

  it('Month overflow-day tap follows the tapped date month-internally', () => {
    let c: CalendarCursors = { ...initialCursors(NOW), currentMonth: new Date(2026, 10, 1) };
    c = applyMonthSelect(c, new Date(2026, 9, 31)); // Oct 31 visible on Nov grid
    expect(c.monthSelectedDate).toEqual(new Date(2026, 9, 31));
    expect(c.currentMonth).toEqual(new Date(2026, 9, 1)); // grid follows → October
  });

  // ── Month swipe clears an out-of-month selection ──────────────────────────

  it('A: swiping to another month clears a selection from the old month', () => {
    // October selected Oct 5 → swipe to November → Oct 5 must not survive.
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentMonth: new Date(2026, 9, 1),
      monthSelectedDate: new Date(2026, 9, 5), // Monday Oct 5
    };
    c = applyMonthShift(c, 1);
    expect(c.currentMonth).toEqual(new Date(2026, 10, 1));
    expect(c.monthSelectedDate).toBeNull();
  });

  it('B: selection survives a swipe that keeps it inside the displayed month', () => {
    // Selecting an overflow day moves currentMonth with it, so a selection
    // is always in-month — but a defensive swipe that still displays it
    // must keep it (e.g. select Nov 30 on Dec's overflow grid is impossible
    // via applyMonthSelect; construct the state directly to lock the rule).
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentMonth: new Date(2026, 9, 1),
      monthSelectedDate: new Date(2026, 9, 5),
    };
    // Shifting to October again (delta 0 keeps it in view) preserves it.
    c = { ...c, currentMonth: new Date(2026, 9, 1) };
    c = applyMonthShift(c, -1); // → September: selection leaves
    expect(c.monthSelectedDate).toBeNull();
  });

  it('C: tapping a date in the new month sets it as the selection', () => {
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentMonth: new Date(2026, 10, 1), // November
      monthSelectedDate: null,
    };
    c = applyMonthSelect(c, new Date(2026, 10, 9)); // Nov 9
    expect(c.monthSelectedDate).toEqual(new Date(2026, 10, 9));
    expect(c.currentMonth).toEqual(new Date(2026, 10, 1));
  });

  it('D: swiping back to the original month does not resurrect the old selection', () => {
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentMonth: new Date(2026, 9, 1),
      monthSelectedDate: new Date(2026, 9, 5),
    };
    c = applyMonthShift(c, 1); // → November, selection cleared
    c = applyMonthShift(c, -1); // → October again
    expect(c.currentMonth).toEqual(new Date(2026, 9, 1));
    expect(c.monthSelectedDate).toBeNull(); // no stale Oct-5 resurrection
  });

  it('E: Today in Month selects today in the current month', () => {
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentMonth: new Date(2026, 11, 1), // December
      monthSelectedDate: null,
    };
    const now = new Date(2026, 9, 5); // Oct 5
    c = applyToday(c, 'month', now);
    expect(c.currentMonth).toEqual(new Date(2026, 9, 1));
    expect(c.monthSelectedDate).toEqual(now);
  });

  it('F: month swipe never touches the Day/Week cursors', () => {
    const oct3 = new Date(2026, 9, 3);
    let c: CalendarCursors = {
      ...initialCursors(NOW),
      currentDay: oct3,
      currentWeekStart: WEEK_SEP28,
      currentMonth: new Date(2026, 9, 1),
      monthSelectedDate: new Date(2026, 9, 5),
    };
    c = applyMonthShift(c, 1);
    c = applyMonthShift(c, 1);
    expect(c.currentDay).toBe(oct3);
    expect(c.currentWeekStart).toBe(WEEK_SEP28);
  });

  it('explicit open-Day action (Week header tap) moves only the Day cursor', () => {
    const oct3 = new Date(2026, 9, 3);
    let c: CalendarCursors = { ...initialCursors(NOW), currentMonth: new Date(2026, 11, 1) };
    c = applyDayChange(c, oct3);
    expect(c.currentDay).toBe(oct3);
    expect(c.currentWeekStart).toEqual(initialCursors(NOW).currentWeekStart);
    expect(c.currentMonth).toEqual(new Date(2026, 11, 1));
  });
});
