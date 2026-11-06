// Emy brand palette — deep navy surfaces with electric-cyan accents,
// matched to the Study with Emy app icon.
const tintColorLight = '#3D4F6B'; // muted navy — Warm Academic Light accent
const tintColorDark = '#38BDF8';  // sky-400 — Emy cyan

export default {
  light: {
    text: '#292524',       // stone-800 — warm near-black text
    secondaryText: '#57534E', // stone-600
    mutedText: '#6B635A',  // warm gray — WCAG AA on bg and cards (was slate-400)
    background: '#F5F2EC', // warm paper ivory
    surface: '#FFFDF8',    // soft cream
    tint: tintColorLight,
    /** Foreground drawn ON `tint` — Emy cyan on muted navy. */
    tintText: '#7DD3FC',
    tintSoft: '#EAE6DA',   // warm parchment highlight wash
    tabIconDefault: '#6B635A',
    tabIconSelected: tintColorLight,
    card: '#FFFDF8',
    cardBorder: '#E4DECF', // warm hairline — visible against the paper bg
    divider: '#EAE5D8',    // warm separator (was identical to background)
    urgent: '#B91C1C',     // red-700 — AA-compliant error/destructive text
    urgentSoft: '#FAE8E5',
    warning: '#F59E0B',
    warningSoft: '#FBF2DE',
    warningText: '#92400E',
    info: '#075985',       // sky-800 — distinguishable info accent
    infoSoft: '#E8F0F4',
    infoText: '#075985',
    success: '#3F6212',    // olive-700 — AA-compliant success text
  },
  dark: {
    text: '#F1F5F9',       // slate-100
    secondaryText: '#94A3B8', // slate-400
    mutedText: '#64748B',  // slate-500
    background: '#020617', // slate-950 — deep navy (Emy icon base)
    surface: '#0F172A',    // slate-900
    tint: tintColorDark,
    /** Foreground drawn ON `tint` — navy on cyan (same value contrastText yields). */
    tintText: '#0F172A',
    tintSoft: '#082F49',   // sky-950 — cyan on navy
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    card: '#0F172A',
    cardBorder: '#1E293B',
    divider: '#0F172A',
    urgent: '#F87171',
    urgentSoft: '#3F1D1D',
    warning: '#FBBF24',
    warningSoft: '#3B2A0C',
    warningText: '#FCD34D',
    info: '#38BDF8',
    infoSoft: '#082F49',
    infoText: '#7DD3FC',
    success: '#34D399',
  },
};
