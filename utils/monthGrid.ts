import { getMondayOfWeek, eventOccursOnDay } from './time';
import type { MyCalendarEvent } from '@/services/api/calendar';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday-start grid (full weeks of day cells) covering the month that
 *  contains `d`. Rows are arrays of 7 Dates. */
export function monthGridRows(d: Date): Date[][] {
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const gridStart = getMondayOfWeek(firstOfMonth);
  const dayCount = Math.round((lastOfMonth.getTime() - gridStart.getTime()) / DAY_MS) + 1;
  const totalCells = Math.ceil(dayCount / 7) * 7;

  const cells: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cell = new Date(gridStart);
    cell.setDate(gridStart.getDate() + i);
    cells.push(cell);
  }
  const rows: Date[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

/**
 * The selection the agenda is allowed to show: the tapped date only while
 * it lives inside the displayed month. Returns null otherwise — the UI
 * renders "Select a day" rather than a date from a different month.
 */
export function monthAgendaSelection(
  selectedDate: Date | null,
  monthCursor: Date,
): Date | null {
  if (
    selectedDate !== null &&
    selectedDate.getMonth() === monthCursor.getMonth() &&
    selectedDate.getFullYear() === monthCursor.getFullYear()
  ) {
    return selectedDate;
  }
  return null;
}

/** Events for one day, sorted by actual start time (chronological, never
 *  alphabetical). Shared by the grid dot index and the selected-day agenda. */
export function dayAgendaEvents(events: MyCalendarEvent[], day: Date): MyCalendarEvent[] {
  return events
    .filter((e) => eventOccursOnDay(e, day))
    .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
}
