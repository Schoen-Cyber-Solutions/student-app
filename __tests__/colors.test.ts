import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

import {
  contrastText,
  hexToHsv,
  hsvToHex,
  luminance,
  normalizeHex,
  readableAccent,
} from '../constants/Glass';

describe('normalizeHex', () => {
  it('accepts 6-digit hex with or without #', () => {
    expect(normalizeHex('#3b82f6')).toBe('#3B82F6');
    expect(normalizeHex('0D9488')).toBe('#0D9488');
    expect(normalizeHex('  #fde047 ')).toBe('#FDE047');
  });

  it('expands 3-digit shorthand', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('fff')).toBe('#FFFFFF');
  });

  it('rejects invalid input', () => {
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('#1234567')).toBeNull();
    expect(normalizeHex('#gggggg')).toBeNull();
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
  });
});

describe('hexToHsv / hsvToHex', () => {
  it('round-trips known colors', () => {
    for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#7161EF', '#FDE047', '#0D9488']) {
      const roundTripped = hsvToHex(hexToHsv(hex));
      expect(normalizeHex(roundTripped)).toBe(normalizeHex(hex));
    }
  });

  it('maps pure red correctly', () => {
    expect(hexToHsv('#FF0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00FF00');
  });
});

describe('luminance / contrastText', () => {
  it('black has luminance 0, white has luminance 1', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#FFFFFF')).toBe(1);
  });

  it('returns dark foreground for bright accents', () => {
    expect(contrastText('#FDE047')).toBe('#0F172A'); // bright yellow
    expect(contrastText('#FFFFFF')).toBe('#0F172A');
  });

  it('returns light foreground for dark accents', () => {
    expect(contrastText('#0F172A')).toBe('#FFFFFF');
    expect(contrastText('#1E3A8A')).toBe('#FFFFFF');
  });

  it('picks a readable foreground for every preset', () => {
    // White text fails WCAG AA on the orange preset (≈2.6:1) — dark wins.
    expect(contrastText('#EA873D')).toBe('#0F172A');
    for (const p of ['#3B82F6', '#0D9488', '#7161EF', '#E56B8A', '#64748B']) {
      expect(contrastText(p)).toBe('#FFFFFF');
    }
  });
});

describe('readableAccent', () => {
  it('darkens very light accents in light mode', () => {
    const adjusted = readableAccent('#FDE047', 'light');
    expect(luminance(adjusted)).toBeLessThan(luminance('#FDE047'));
  });

  it('lightens very dark accents in dark mode', () => {
    const adjusted = readableAccent('#0F172A', 'dark');
    expect(luminance(adjusted)).toBeGreaterThan(luminance('#0F172A'));
  });

  it('passes saturated mid-range colors through unchanged', () => {
    expect(readableAccent('#7161EF', 'light')).toBe('#7161EF');
    expect(readableAccent('#0D9488', 'dark')).toBe('#0D9488');
  });
});

import {
  buildCourseColorMap,
  COURSE_PALETTE,
  getCourseColor,
} from '../utils/courseLabel';

describe('getCourseColor', () => {
  const overrides = { CSIA301: '#F43F5E' };

  it('returns a backend-persisted override before any fallback', () => {
    expect(getCourseColor({ courseCode: 'CSIA301' }, overrides)).toBe('#F43F5E');
  });

  it('hashes the course code deterministically into COURSE_PALETTE', () => {
    const a = getCourseColor({ courseCode: 'CSCI150' });
    const b = getCourseColor({ courseCode: 'CSCI150' });
    expect(a).toBe(b);
    expect(COURSE_PALETTE).toContain(a);
  });

  it('gives sections of the same course the same color', () => {
    const s1 = getCourseColor({ courseSectionId: 'sec-a', courseCode: 'CSIA301' });
    const s2 = getCourseColor({ courseSectionId: 'sec-b', courseCode: 'CSIA301' });
    expect(s1).toBe(s2); // identity is the course code, not the section
  });

  it('falls back to normalized course name, then section id', () => {
    const named = getCourseColor({ courseName: 'data structures  ' });
    expect(named).toBe(getCourseColor({ courseName: 'DATA STRUCTURES' }));
    const bySection = getCourseColor({ courseSectionId: 'sec-xyz' });
    expect(COURSE_PALETTE).toContain(bySection);
    // Code wins over name and section when all three are present.
    const all = getCourseColor(
      { courseSectionId: 'sec-xyz', courseCode: 'CSCI150', courseName: 'Data Structures' },
      {},
    );
    expect(all).toBe(getCourseColor({ courseCode: 'CSCI150' }));
  });

  it('returns undefined when no identity is available', () => {
    expect(getCourseColor({})).toBeUndefined();
    expect(getCourseColor({ courseCode: '   ', courseName: null })).toBeUndefined();
  });
});

describe('buildCourseColorMap', () => {
  const codes5 = ['CSIA301', 'CSCI150', 'MATH201', 'ENG101', 'BIO110'];

  it('gives 3/5/8 courses clearly distinct palette colors', () => {
    for (const n of [3, 5, 8]) {
      const map = buildCourseColorMap(codes5.concat(['PSY200', 'HIST210', 'CHEM220']).slice(0, n));
      const values = Object.values(map);
      expect(new Set(values).size).toBe(n); // no two active courses share a color
      values.forEach((c) => expect(COURSE_PALETTE).toContain(c));
    }
  });

  it('assigns the first five sorted courses to distant hue families', () => {
    const map = buildCourseColorMap(codes5);
    const sorted = [...codes5].sort();
    expect(map[sorted[0]]).toBe('#2563EB'); // blue
    expect(map[sorted[1]]).toBe('#EA580C'); // orange
    expect(map[sorted[2]]).toBe('#16A34A'); // green
    expect(map[sorted[3]]).toBe('#9333EA'); // purple
    expect(map[sorted[4]]).toBe('#DC2626'); // red
  });

  it('is stable regardless of input ordering', () => {
    const forward = buildCourseColorMap(codes5);
    const shuffled = buildCourseColorMap([...codes5].reverse());
    expect(forward).toEqual(shuffled);
  });

  it('user overrides win over palette assignment', () => {
    const map = buildCourseColorMap(codes5, { CSIA301: '#123456' });
    expect(map['CSIA301']).toBe('#123456');
  });

  it('wraps the palette when courses exceed its length', () => {
    const many = Array.from({ length: 12 }, (_, i) => `C${100 + i}`);
    const map = buildCourseColorMap(many);
    expect(Object.keys(map)).toHaveLength(12);
    Object.values(map).forEach((c) => expect(COURSE_PALETTE).toContain(c));
  });

  it('getCourseColor prefers the assigned map before hashing', () => {
    const map = buildCourseColorMap(codes5);
    expect(getCourseColor({ courseCode: 'CSIA301' }, {}, map)).toBe(map['CSIA301']);
    // Codes outside the enrolled set fall back to the deterministic hash.
    expect(getCourseColor({ courseCode: 'ZZZ999' }, {}, map)).toBe(
      getCourseColor({ courseCode: 'ZZZ999' }),
    );
  });
});
