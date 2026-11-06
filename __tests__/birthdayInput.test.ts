import { describe, it, expect } from 'vitest';
import {
  applyDayInput,
  applyMonthInput,
  maxDayForMonth,
  normalizeDayOnBlur,
  normalizeMonthOnBlur,
} from '@/utils/birthdayInput';
import { parseBirthday } from '@/utils/birthday';

// Interaction-level tests for the MM/DD smart-entry state machine — what
// each keystroke does to the field value and focus, not just parsing.

describe('applyMonthInput — first digit', () => {
  it.each(['2', '3', '4', '5', '6', '7', '8', '9'])(
    'normalizes single digit %s to zero-padded and advances',
    (d) => {
      const r = applyMonthInput('', d);
      expect(r).toEqual({ value: `0${d}`, advance: true });
    },
  );

  it.each(['0', '1'])('waits on leading %s', (d) => {
    const r = applyMonthInput('', d);
    expect(r).toEqual({ value: d, advance: false });
  });
});

describe('applyMonthInput — second digit', () => {
  it.each([
    ['1', '0', '10'],
    ['1', '1', '11'],
    ['1', '2', '12'],
    ['0', '1', '01'],
    ['0', '9', '09'],
  ])('%s + %s completes as %s and advances', (prev, d, expected) => {
    const r = applyMonthInput(prev, `${prev}${d}`);
    expect(r).toEqual({ value: expected, advance: true });
  });

  it.each([
    ['0', '0', '00'],
    ['1', '3', '13'],
    ['1', '7', '17'],
  ])('rejects %s + %s (%s) without losing the prefix', (prev, d, _pair) => {
    const r = applyMonthInput(prev, `${prev}${d}`);
    expect(r).toEqual({ value: prev, advance: false });
  });

  it('rejects a pasted invalid pair, preserving the field', () => {
    expect(applyMonthInput('', '37')).toEqual({ value: '', advance: false });
    expect(applyMonthInput('12', '37')).toEqual({ value: '12', advance: false });
  });
});

describe('applyMonthInput — editing and backspace', () => {
  it('clears on backspace-to-empty', () => {
    expect(applyMonthInput('1', '')).toEqual({ value: '', advance: false });
    expect(applyMonthInput('12', '1')).toEqual({ value: '1', advance: false });
  });

  it('ignores keystrokes beyond the 2-char cap (never clobbers)', () => {
    // RN fires onChangeText with the raw text; over-cap input is sliced
    // back to the previous pair — the stored value stays untouched.
    expect(applyMonthInput('12', '123')).toEqual({ value: '12', advance: false });
  });

  it('a valid pair typed in one shot advances (paste/autofill)', () => {
    expect(applyMonthInput('', '11')).toEqual({ value: '11', advance: true });
  });
});

describe('normalizeMonthOnBlur', () => {
  it('pads a lone 1 to 01', () => {
    expect(normalizeMonthOnBlur('1')).toBe('01');
  });
  it('leaves complete and empty values alone', () => {
    expect(normalizeMonthOnBlur('12')).toBe('12');
    expect(normalizeMonthOnBlur('')).toBe('');
    // '0' has no valid normalization — parseBirthday reports the error.
    expect(normalizeMonthOnBlur('0')).toBe('0');
  });
});

describe('applyDayInput', () => {
  it.each(['4', '5', '6', '7', '8', '9'])('pads first digit %s (no day ≥ 40)', (d) => {
    expect(applyDayInput('', d, 31)).toEqual({ value: `0${d}`, advance: false });
  });

  it.each(['0', '1', '2', '3'])('waits on leading %s', (d) => {
    expect(applyDayInput('', d, 31)).toEqual({ value: d, advance: false });
  });

  it('accepts valid pairs up to the month max', () => {
    expect(applyDayInput('3', '31', 31)).toEqual({ value: '31', advance: false });
    expect(applyDayInput('2', '29', 29)).toEqual({ value: '29', advance: false });
  });

  it('rejects 00 and days above the month max, preserving the prefix', () => {
    expect(applyDayInput('0', '00', 31)).toEqual({ value: '0', advance: false });
    expect(applyDayInput('3', '32', 31)).toEqual({ value: '3', advance: false });
    // February (leap-permissive) has no 30th.
    expect(applyDayInput('3', '30', 29)).toEqual({ value: '3', advance: false });
  });
});

describe('normalizeDayOnBlur + maxDayForMonth', () => {
  it('pads a lone nonzero digit', () => {
    expect(normalizeDayOnBlur('3')).toBe('03');
    expect(normalizeDayOnBlur('9')).toBe('09');
    expect(normalizeDayOnBlur('0')).toBe('0');
    expect(normalizeDayOnBlur('')).toBe('');
  });

  it('maps months to their day limits', () => {
    expect(maxDayForMonth('02')).toBe(29); // leap-permissive, no year collected
    expect(maxDayForMonth('04')).toBe(30);
    expect(maxDayForMonth('12')).toBe(31);
    expect(maxDayForMonth('')).toBe(31);
    expect(maxDayForMonth('0')).toBe(31);
  });
});

describe('end-to-end with parseBirthday', () => {
  it('a fully typed valid birthday parses', () => {
    const m = applyMonthInput('', '7');
    expect(m).toEqual({ value: '07', advance: true });
    const d = applyDayInput('', '15', maxDayForMonth(m.value));
    expect(parseBirthday(m.value, d.value)).toEqual({
      ok: true,
      birthMonth: 7,
      birthDay: 15,
    });
  });

  it('Feb 29 passes; an impossible Feb 30 cannot be typed', () => {
    expect(parseBirthday('02', '29').ok).toBe(true);
    // The field itself refuses 30 after a '3' prefix in February.
    const r = applyDayInput('3', '30', maxDayForMonth('02'));
    expect(r.value).toBe('3');
    expect(parseBirthday('02', '30').ok).toBe(false);
  });
});
