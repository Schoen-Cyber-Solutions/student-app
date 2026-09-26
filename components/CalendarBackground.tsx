import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import SafeLinearGradient from './SafeLinearGradient';
import { useColorScheme } from './useColorScheme';
import { CalendarAppearance, DIM_FRACTION } from '@/utils/calendarAppearance';

const LIGHT_GRADIENT = ['#DBEAFE', '#E9E4FF', '#CFFAFE'] as const; // blue → lavender → cyan
const DARK_GRADIENT = ['#172554', '#2E1065', '#0C4A6E'] as const;

/**
 * Absolute-fill background for the Calendar tab: a subtle blue/lavender
 * gradient, optionally covered by the user's photo, plus a dim overlay that
 * keeps glass panels and text readable on bright or busy images.
 */
export default function CalendarBackground({ appearance }: { appearance: CalendarAppearance }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  // Track WHICH uri failed — a boolean would latch across replacements and
  // permanently hide every new photo after a single decode error.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = appearance.imageUri;
  const showImage = Boolean(uri) && uri !== failedUri;
  const dim = DIM_FRACTION[appearance.dim] ?? 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SafeLinearGradient
        colors={scheme === 'dark' ? DARK_GRADIENT : LIGHT_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {showImage ? (
        <Image
          key={uri}
          source={{ uri: uri! }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailedUri(uri)}
        />
      ) : null}
      {dim > 0 ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                scheme === 'dark'
                  ? `rgba(2,6,23,${dim})`
                  : `rgba(255,255,255,${dim})`,
            },
          ]}
        />
      ) : null}
    </View>
  );
}
