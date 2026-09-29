import Colors from './Colors';
import { DEFAULT_ACCENT, TAB_TEXT_COLORS, TextMode } from '@/utils/tabAppearance';

type Scheme = 'light' | 'dark';

/** Soft-tint an opaque hex course color (e.g. '#3B82F6' → '#3B82F6CC'). */
export function withAlpha(color: string, alpha: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
      .toString(16)
      .padStart(2, '0');
    return `${color}${a}`;
  }
  return color;
}

/** Darken (f < 0) or lighten (f > 0) a '#rrggbb' color by fraction f. */
export function shade(hex: string, f: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const adj = (c: number) =>
    Math.min(255, Math.max(0, Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f))));
  const r = adj((n >> 16) & 0xff);
  const g = adj((n >> 8) & 0xff);
  const b = adj(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** WCAG relative luminance of a '#rrggbb' color (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * ch((n >> 16) & 0xff) +
    0.7152 * ch((n >> 8) & 0xff) +
    0.0722 * ch(n & 0xff)
  );
}

/** Readable foreground (white or near-black) for text/icons drawn on `hex`. */
export function contrastText(hex: string): string {
  return luminance(hex) > 0.35 ? '#0F172A' : '#FFFFFF';
}

/** Adjust `hex` for use AS a text/icon color over translucent surfaces and
 *  photos — very light accents get darkened in light mode, very dark accents
 *  get lifted in dark mode. Saturated mid-range colors pass through. */
export function readableAccent(hex: string, scheme: 'light' | 'dark'): string {
  const l = luminance(hex);
  if (scheme === 'light' && l > 0.45) return shade(hex, -0.35);
  if (scheme === 'dark' && l < 0.06) return shade(hex, 0.45);
  return hex;
}

/** '#rgb', 'rgb', '#rrggbb' or 'rrggbb' → normalized '#rrggbb', else null. */
export function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s.split('').map((c) => c + c).join('')}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`.toUpperCase();
  return null;
}

export interface HSV {
  h: number; // 0–360
  s: number; // 0–1
  v: number; // 0–1
}

export function hexToHsv(hex: string): HSV {
  const m = /^#([0-9a-fA-F]{6})$/.exec(normalizeHex(hex) ?? '');
  if (!m) return { h: 0, s: 0, v: 1 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex({ h, s, v }: HSV): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const seg = Math.floor((((h % 360) + 360) % 360) / 60) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg];
  const to = (f: number) =>
    Math.round((f + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/**
 * Base palette with the neutral text tokens remapped by the tab's textMode
 * ('light' = light text, 'dark' = dark text). Semantic colors (warning,
 * info, success, urgent) and surfaces are untouched; accent is unaffected.
 * When textMode is omitted the plain scheme palette is returned.
 */
export function themedColors(scheme: Scheme, textMode?: TextMode | null) {
  const base = Colors[scheme];
  if (!textMode) return base;
  const t = TAB_TEXT_COLORS[textMode];
  // Neutral surfaces (solid cards, chips, borders) flip to the contrasting
  // palette so the chosen text stays readable — light text gets dark
  // surfaces and vice versa. Translucent glass fills are unaffected.
  const surfaces = textMode === 'light' ? Colors.dark : Colors.light;
  return {
    ...base,
    text: t.primary,
    secondaryText: t.secondary,
    mutedText: t.tertiary,
    tabIconDefault: t.icon,
    surface: surfaces.surface,
    card: surfaces.card,
    cardBorder: surfaces.cardBorder,
    divider: surfaces.divider,
  };
}

/**
 * Glassmorphism tokens for the Calendar redesign. Surfaces stay genuinely
 * translucent so a custom background photo remains visible; borders are
 * hairlines; `accent` is the user's configurable Calendar accent (persisted
 * in calendar appearance prefs) — text colors follow the tab's textMode when
 * provided, otherwise the base theme. Course colors are never altered by
 * the accent or textMode.
 */
export function glassColors(
  scheme: Scheme,
  accent: string = DEFAULT_ACCENT,
  textMode?: TextMode | null,
) {
  const base = themedColors(scheme, textMode);
  const dark = scheme === 'dark';
  return {
    ...base,
    /** Translucent panel fill over the background image. */
    glass: dark ? 'rgba(30,41,59,0.30)' : 'rgba(255,255,255,0.28)',
    /** Slightly stronger fill for text-heavy surfaces (agenda rows, sheets). */
    glassStrong: dark ? 'rgba(30,41,59,0.40)' : 'rgba(255,255,255,0.40)',
    /** Barely-there fill for large timetable areas so the photo shows
     *  through the grid itself, not just around panel edges. */
    glassFaint: dark ? 'rgba(30,41,59,0.20)' : 'rgba(255,255,255,0.18)',
    /** Hairline panel border. */
    glassBorder: dark ? 'rgba(148,163,184,0.24)' : 'rgba(255,255,255,0.55)',
    /** User-configurable accent for selection + the floating add button. */
    accent,
    accentDark: shade(accent, -0.22),
    accentSoft: dark ? withAlpha(accent, 0.28) : withAlpha(accent, 0.16),
  };
}

export type GlassColors = ReturnType<typeof glassColors>;
