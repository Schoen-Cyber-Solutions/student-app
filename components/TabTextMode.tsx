import { createContext, useContext, ReactNode } from 'react';
import { themedColors } from '@/constants/Glass';
import { useColorScheme } from './useColorScheme';
import { useTabAppearance } from '@/utils/tabAppearanceStore';
import {
  resolveTextMode,
  TabKey,
  TabTextColors,
  TAB_TEXT_COLORS,
  TextMode,
} from '@/utils/tabAppearance';

/**
 * Per-tab neutral-text mode ('light' = light text, 'dark' = dark text),
 * provided once at the root of each tab's screen tree. Components inside the
 * tab use useTextMode / useTextColors / useThemedColors instead of hardcoding
 * scheme text colors. Outside a provider the hooks fall back to the OS
 * scheme default, so shared components used elsewhere keep their behavior.
 */

export const TextModeContext = createContext<TextMode | null>(null);

export function TabTextModeProvider({
  tab,
  children,
}: {
  tab: TabKey;
  children: ReactNode;
}) {
  const appearance = useTabAppearance(tab);
  const scheme = useColorScheme();
  const mode = resolveTextMode(appearance, scheme === 'dark' ? 'dark' : 'light');
  return <TextModeContext.Provider value={mode}>{children}</TextModeContext.Provider>;
}

/** Effective text mode for the current tab subtree (or the OS default). */
export function useTextMode(): TextMode {
  const ctx = useContext(TextModeContext);
  const scheme = useColorScheme();
  return ctx ?? (scheme === 'dark' ? 'light' : 'dark');
}

/** Neutral text tokens for the current tab subtree. */
export function useTextColors(): TabTextColors {
  return TAB_TEXT_COLORS[useTextMode()];
}

/** Full theme palette with text tokens remapped to the tab's textMode. */
export function useThemedColors() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return themedColors(scheme, useTextMode());
}
