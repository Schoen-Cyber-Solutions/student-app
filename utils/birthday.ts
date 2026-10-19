/**
 * Shared parsing for the MM / DD birthday inputs (setup + profile edit).
 * Birthday is stored as plain calendar month/day integers — there is no
 * year and no timestamp, so no timezone conversion ever applies.
 */

export type BirthdayParse =
  | { ok: true; birthMonth: number | null; birthDay: number | null }
  | { ok: false };

function daysInMonth(month: number): number {
  // Year 2000 (a leap year) keeps February 29 valid.
  return new Date(2000, month, 0).getDate();
}

/**
 * Both inputs empty → clears the birthday (both null). Anything else
 * requires BOTH a valid month and a valid day for that month — partial
 * input, non-integers, and out-of-range values are rejected client-side
 * before any request is sent.
 */
export function parseBirthday(monthRaw: string, dayRaw: string): BirthdayParse {
  const m = monthRaw.trim();
  const d = dayRaw.trim();
  if (m === '' && d === '') return { ok: true, birthMonth: null, birthDay: null };
  if (m === '' || d === '') return { ok: false };

  const month = Number(m);
  const day = Number(d);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return { ok: false };
  if (month < 1 || month > 12) return { ok: false };
  if (day < 1 || day > daysInMonth(month)) return { ok: false };

  return { ok: true, birthMonth: month, birthDay: day };
}
