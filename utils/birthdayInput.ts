/**
 * Smart MM / DD birthday entry. Sits between the raw TextInput digits and
 * parseBirthday (which does the final validation): it normalizes single
 * digits, auto-advances when a value is complete, and never lets an
 * out-of-range second digit clobber what the user already typed.
 */

export interface DigitFieldResult {
  /** The new field value. Equals the previous value when the keystroke
   *  was rejected (e.g. typing 3 after 1 would make month "13"). */
  value: string;
  /** True when the value is a complete, valid two-digit field and focus
   *  should move to the next input. */
  advance: boolean;
}

function digitsOnly(text: string): string {
  return text.replace(/\D/g, '').slice(0, 2);
}

function isValidMonthPair(pair: string): boolean {
  const n = Number(pair);
  return pair.length === 2 && n >= 1 && n <= 12;
}

/**
 * Next month-field state after a keystroke.
 *
 * - First digit 2–9 normalizes to 02–09 and advances — no month starts
 *   with those digits at position 1.
 * - First digit 0 or 1 waits for a second digit.
 * - A second digit producing an invalid pair (00, 13, 37, …) is rejected
 *   and the existing value is preserved, so the user can type a different
 *   digit or backspace.
 * - Multi-digit input (paste/autofill) is accepted only as a valid pair.
 */
export function applyMonthInput(prev: string, text: string): DigitFieldResult {
  const digits = digitsOnly(text);
  if (digits === prev) return { value: prev, advance: false };

  if (digits.length >= 2) {
    // Fresh two-digit entry (or extension of a one-digit prefix).
    if (isValidMonthPair(digits)) return { value: digits, advance: true };
    // Reject the keystroke: keep whatever was there (prefix or old pair).
    return { value: prev, advance: false };
  }

  if (digits.length === 0) return { value: '', advance: false };

  const d = digits.charCodeAt(0) - 48;
  if (d >= 2 && d <= 9) return { value: `0${digits}`, advance: true };
  // '0' or '1' — wait for the second digit.
  return { value: digits, advance: false };
}

/** Blur completion for the month field: a lone "1" becomes "01". */
export function normalizeMonthOnBlur(value: string): string {
  return value === '1' ? '01' : value;
}

/**
 * Next day-field state. `maxDay` comes from the entered month (31 when the
 * month is empty or invalid); February is 29-leap-permissive because no
 * birth year is collected.
 *
 * - First digit 4–9 normalizes to 04–09 (no day ≥ 40 exists).
 * - First digit 0–3 waits.
 * - Invalid pairs (00, or > maxDay for the month) are rejected without
 *   losing the existing prefix.
 */
export function applyDayInput(prev: string, text: string, maxDay: number): DigitFieldResult {
  const digits = digitsOnly(text);
  if (digits === prev) return { value: prev, advance: false };

  if (digits.length >= 2) {
    const n = Number(digits);
    if (n >= 1 && n <= maxDay) return { value: digits, advance: false };
    return { value: prev, advance: false };
  }

  if (digits.length === 0) return { value: '', advance: false };

  const d = digits.charCodeAt(0) - 48;
  if (d >= 4) return { value: `0${digits}`, advance: false };
  return { value: digits, advance: false };
}

/** Blur completion for the day field: a lone "1"–"9" pads to "01"–"09". */
export function normalizeDayOnBlur(value: string): string {
  return value.length === 1 && value !== '0' ? `0${value}` : value;
}

/** Maximum valid day for the entered month string; 31 when unknown. */
export function maxDayForMonth(monthValue: string): number {
  const m = Number(monthValue);
  if (!Number.isInteger(m) || m < 1 || m > 12) return 31;
  // Year 2000 keeps February 29 valid — the form collects no year.
  return new Date(2000, m, 0).getDate();
}
