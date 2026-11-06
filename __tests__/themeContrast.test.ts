import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

import Colors from '../constants/Colors';
import { luminance } from '../constants/Glass';
import { COURSE_PALETTE, COMPLETED_EVENT_COLOR, COMPLETED_EVENT_TEXT } from '../utils/courseLabel';
import { TAB_TEXT_COLORS, accentForScheme } from '../utils/tabAppearance';

/** WCAG contrast ratio between two '#rrggbb' colors. */
function ratio(fg: string, bg: string): number {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('Light Mode — WCAG AA contrast', () => {
  const c = Colors.light;

  // 4.5:1 for normal text, 3:1 for meaningful non-text UI.
  const textPairs: [string, string, string][] = [
    ['text', 'background', c.background],
    ['text', 'card', c.card],
    ['secondaryText', 'background', c.background],
    ['secondaryText', 'card', c.card],
    ['mutedText', 'background', c.background],
    ['mutedText', 'card', c.card],
    ['mutedText', 'surface', c.surface],
    ['urgent', 'card', c.card],
    ['urgent', 'urgentSoft', c.urgentSoft],
    ['success', 'card', c.card],
    ['info', 'infoSoft', c.infoSoft],
    ['warningText', 'warningSoft', c.warningSoft],
    ['tintText', 'tint', c.tint],
    ['tint', 'tintSoft', c.tintSoft],
  ];

  for (const [token, bgName, bg] of textPairs) {
    it(`${token} on ${bgName} meets 4.5:1`, () => {
      const fg = (c as Record<string, string>)[token];
      expect(ratio(fg, bg), `${token} ${fg} on ${bgName} ${bg}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('inactive tab icon meets 3:1 on the background', () => {
    expect(ratio(c.tabIconDefault, c.background)).toBeGreaterThanOrEqual(3);
  });

  it('selected tab icon meets 3:1 on the background', () => {
    expect(ratio(c.tabIconSelected, c.background)).toBeGreaterThanOrEqual(3);
  });

  it('card border is actually distinguishable from the background', () => {
    expect(c.cardBorder).not.toBe(c.background);
    expect(c.divider).not.toBe(c.background);
    expect(ratio(c.cardBorder, c.background)).toBeGreaterThan(1.1);
  });

  it('dark-text tab tokens match the Light palette', () => {
    expect(TAB_TEXT_COLORS.dark.primary).toBe(c.text);
    expect(TAB_TEXT_COLORS.dark.secondary).toBe(c.secondaryText);
    expect(TAB_TEXT_COLORS.dark.tertiary).toBe(c.mutedText);
    expect(TAB_TEXT_COLORS.dark.border).toBe(c.cardBorder);
  });

  it('Light accent and tab defaults come from the central palette', () => {
    expect(accentForScheme('light')).toBe(c.tint);
    expect(accentForScheme('dark')).toBe(Colors.dark.tint);
  });

  it('completed-event text meets 4.5:1 on its background', () => {
    expect(ratio(COMPLETED_EVENT_TEXT, COMPLETED_EVENT_COLOR)).toBeGreaterThanOrEqual(4.5);
  });

  it('every course palette color gets a ≥4.5:1 readable foreground', () => {
    for (const hex of COURSE_PALETTE) {
      const white = ratio('#FFFFFF', hex);
      const dark = ratio('#0F172A', hex);
      expect(
        Math.max(white, dark),
        `no ≥4.5:1 foreground for course color ${hex}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Dark Mode — unchanged AA baseline', () => {
  const c = Colors.dark;

  const pairs: [string, string, string][] = [
    ['text', 'background', c.background],
    ['text', 'card', c.card],
    ['secondaryText', 'background', c.background],
    ['secondaryText', 'card', c.card],
    ['urgent', 'card', c.card],
    ['success', 'card', c.card],
    ['infoText', 'infoSoft', c.infoSoft],
    ['warningText', 'warningSoft', c.warningSoft],
    ['tintText', 'tint', c.tint],
  ];

  for (const [token, bgName, bg] of pairs) {
    it(`${token} on ${bgName} meets 4.5:1`, () => {
      const fg = (c as Record<string, string>)[token];
      expect(ratio(fg, bg), `${token} ${fg} on ${bgName} ${bg}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
