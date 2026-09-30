import { getMondayOfWeek } from '@/utils/time';

export type CalendarViewName = 'day' | 'week' | 'month';

/**
 * Independent navigation cursors — one authoritative position per view.
 * Day, Week, and Month share the same event DATA but never share
 * navigation state: swiping one view must not move another view's cursor.
 * Every transition below returns a new object and only mutates the cursor
 * it owns; the ONLY cross-view write is `applyOpenDay`, the explicit
 * "open Day for this tapped date" navigation action.
 */
export interface CalendarCursors {
  /** Day view — the currently displayed date. */
  currentDay: Date;
  /** Week view — Monday of the currently displayed week. */
  currentWeekStart: Date;
  /** Month view — first of the currently displayed month. */
  currentMonth: Date;
  /** Month view's own selected day (cell highlight + agenda). Distinct
   *  from currentDay so Month browsing/selection can't drag Day along. */
  monthSelectedDate: Date;
}

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export function initialCursors(now: Date): CalendarCursors {
  return {
    currentDay: now,
    currentWeekStart: getMondayOfWeek(now),
    currentMonth: firstOfMonth(now),
    monthSelectedDate: now,
  };
}

/** Day view navigation (prev/next day, weekday-strip tap). */
export function applyDayChange(c: CalendarCursors, date: Date): CalendarCursors {
  return { ...c, currentDay: date };
}

/** Week pager reports a newly visible week — the ONLY writer of the week cursor. */
export function applyWeekChange(c: CalendarCursors, weekStart: Date): CalendarCursors {
  return { ...c, currentWeekStart: weekStart };
}

/** Month browsing (prev/next swipe) — month cursor only; selection and
 *  the other views' cursors are untouched. */
export function applyMonthShift(c: CalendarCursors, delta: number): CalendarCursors {
  return {
    ...c,
    currentMonth: new Date(c.currentMonth.getFullYear(), c.currentMonth.getMonth() + delta, 1),
  };
}

/** Explicit tap on a Month grid date — Month-internal selection only.
 *  If the tapped date is an overflow day from an adjacent month, the grid
 *  follows it (still a Month-internal move). */
export function applyMonthSelect(c: CalendarCursors, date: Date): CalendarCursors {
  const sameMonth =
    date.getMonth() === c.currentMonth.getMonth() &&
    date.getFullYear() === c.currentMonth.getFullYear();
  return {
    ...c,
    monthSelectedDate: date,
    currentMonth: sameMonth ? c.currentMonth : firstOfMonth(date),
  };
}

/** Today resets ONLY the active view's cursor — never all three together. */
export function applyToday(
  c: CalendarCursors,
  view: CalendarViewName,
  now: Date,
): CalendarCursors {
  switch (view) {
    case 'day':
      return { ...c, currentDay: now };
    case 'week':
      return { ...c, currentWeekStart: getMondayOfWeek(now) };
    case 'month':
      // Existing Month behavior: today becomes the selected day too.
      return { ...c, currentMonth: firstOfMonth(now), monthSelectedDate: now };
  }
}
