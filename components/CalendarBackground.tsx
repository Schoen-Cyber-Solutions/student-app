import { StyleSheet, View } from 'react-native';
import { useColorScheme } from './useColorScheme';
import { TabAppearance, resolveBackgroundColor } from '@/utils/tabAppearance';

/**
 * Absolute-fill background shared by Home / Calendar / Chat: paints the tab's
 * selected solid color. Nothing else is layered — glass cards and panels sit
 * above this root layer.
 */
export default function CalendarBackground({ appearance }: { appearance: TabAppearance }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: resolveBackgroundColor(appearance, scheme) }]}
      pointerEvents="none"
    />
  );
}
