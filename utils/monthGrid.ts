import { getMondayOfWeek } from './time';

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
