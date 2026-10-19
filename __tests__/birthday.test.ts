import { describe, expect, it } from 'vitest';
import { parseBirthday } from '../utils/birthday';

describe('parseBirthday', () => {
  it('clears when both fields are empty or whitespace', () => {
    expect(parseBirthday('', '')).toEqual({ ok: true, birthMonth: null, birthDay: null });
    expect(parseBirthday('  ', ' ')).toEqual({ ok: true, birthMonth: null, birthDay: null });
  });

  it('parses a valid month/day', () => {
    expect(parseBirthday('04', '17')).toEqual({ ok: true, birthMonth: 4, birthDay: 17 });
    expect(parseBirthday('12', '31')).toEqual({ ok: true, birthMonth: 12, birthDay: 31 });
    expect(parseBirthday('1', '1')).toEqual({ ok: true, birthMonth: 1, birthDay: 1 });
    expect(parseBirthday('2', '29')).toEqual({ ok: true, birthMonth: 2, birthDay: 29 });
  });

  it('rejects partial input', () => {
    expect(parseBirthday('3', '').ok).toBe(false);
    expect(parseBirthday('', '15').ok).toBe(false);
  });

  it('rejects out-of-range and non-integer values', () => {
    expect(parseBirthday('13', '1').ok).toBe(false);
    expect(parseBirthday('0', '10').ok).toBe(false);
    expect(parseBirthday('4', '0').ok).toBe(false);
    expect(parseBirthday('4', '32').ok).toBe(false);
    expect(parseBirthday('4.5', '17').ok).toBe(false);
    expect(parseBirthday('abc', '17').ok).toBe(false);
  });

  it('rejects impossible calendar days', () => {
    expect(parseBirthday('2', '30').ok).toBe(false);
    expect(parseBirthday('4', '31').ok).toBe(false);
    expect(parseBirthday('11', '31').ok).toBe(false);
    expect(parseBirthday('1', '31').ok).toBe(true); // Jan 31 is fine
  });
});
