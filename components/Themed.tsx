/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import { Text as DefaultText, View as DefaultView } from 'react-native';
import { useContext } from 'react';

import { useColorScheme } from './useColorScheme';
import { TextModeContext } from './TabTextMode';

import Colors from '@/constants/Colors';
import { TAB_TEXT_COLORS } from '@/utils/tabAppearance';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const theme = useColorScheme();
  // Inside a tab's TextMode provider, neutral text follows the user's
  // per-tab Light/Dark text preference; explicit lightColor/darkColor props
  // and inline style colors still win.
  const textMode = useContext(TextModeContext);
  const propColor = theme === 'dark' ? darkColor : lightColor;
  const color =
    propColor ?? (textMode ? TAB_TEXT_COLORS[textMode].primary : Colors[theme].text);

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
