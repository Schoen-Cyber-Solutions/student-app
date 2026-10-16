// Emy brand palette — deep navy surfaces with electric-cyan accents,
// matched to the Study with Emy app icon.
const tintColorLight = '#0284C7'; // sky-600 — readable cyan on white
const tintColorDark = '#38BDF8';  // sky-400 — Emy cyan

export default {
  light: {
    text: '#0F172A',       // slate-900 — dark navy text
    secondaryText: '#64748B', // slate-500
    mutedText: '#94A3B8',  // slate-400
    background: '#F1F5F9', // slate-100 — light cool blue-gray
    surface: '#FFFFFF',
    tint: tintColorLight,
    tintSoft: '#E0F2FE',   // sky-100
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    divider: '#F1F5F9',    // slate-100
    urgent: '#EF4444',
    urgentSoft: '#FEF2F2',
    warning: '#F59E0B',
    warningSoft: '#FFFBEB',
    warningText: '#92400E',
    info: '#0284C7',
    infoSoft: '#E0F2FE',
    infoText: '#075985',
    success: '#10B981',
  },
  dark: {
    text: '#F1F5F9',       // slate-100
    secondaryText: '#94A3B8', // slate-400
    mutedText: '#64748B',  // slate-500
    background: '#020617', // slate-950 — deep navy (Emy icon base)
    surface: '#0F172A',    // slate-900
    tint: tintColorDark,
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
