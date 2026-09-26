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
