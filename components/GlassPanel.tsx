import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColorScheme } from './useColorScheme';
import { glassColors } from '@/constants/Glass';
import { radius } from '@/constants/Theme';

// expo-blur calls requireNativeViewManager at module eval — on a dev client
// that predates the package this throws and kills any importing screen.
// Load it defensively; the translucent fill alone still gives a glass look.
let NativeBlurView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeBlurView = require('expo-blur').BlurView;
} catch {
  NativeBlurView = null;
}

interface GlassPanelProps {
  children: ReactNode;
  style?: ViewStyle;
  /** 0–100 blur intensity; keep low inside scroll-heavy areas. */
  intensity?: number;
  /** Panel corner radius (default: radius.lg). */
  cornerRadius?: number;
  /** Fill translucency: default chrome panels, 'strong' for text-heavy
   *  surfaces, 'faint' for large timetable areas over the background. */
  variant?: 'default' | 'strong' | 'faint';
}

/**
 * Frosted-glass container. Layer order: frame (border + clip + radius) →
 * BlurView (decorative, absolute, pointerEvents none) → fill (translucent,
 * rounded, holds children). `flexGrow` on fill lets it fill flex parents
 * without collapsing auto-height ones (unlike flex:1's flexBasis:0).
 *
 * The frame's `style` must be margin/flex only — padding on the frame insets
 * the fill while the blur stays full-size, producing a misaligned rim.
 */
export default function GlassPanel({
  children,
  style,
  intensity = 35,
  cornerRadius = radius.lg,
  variant = 'default',
}: GlassPanelProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = glassColors(scheme);
  const fillColor =
    variant === 'faint'
      ? colors.glassFaint
      : variant === 'strong'
        ? colors.glassStrong
        : colors.glass;

  return (
    <View
      style={[
        styles.frame,
        { borderRadius: cornerRadius, borderColor: colors.glassBorder },
        style,
      ]}>
      {NativeBlurView ? (
        <NativeBlurView
          intensity={intensity}
          tint={scheme}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius }]}
        />
      ) : null}
      <View
        style={[
          styles.fill,
          { backgroundColor: fillColor, borderRadius: cornerRadius },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  fill: {
    // flexGrow fills bounded flex parents; flexShrink + minHeight guarantee
    // the fill never exceeds its frame (a content-sized fill would leave the
    // ScrollView inside it with nothing to scroll). Auto-height frames keep
    // their content size because shrink only applies when overflowing.
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
});
