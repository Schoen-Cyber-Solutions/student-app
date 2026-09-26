import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Link, router } from 'expo-router';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { glassColors, readableAccent } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

// Same guarded pattern as GlassPanel — expo-blur must not kill screens on
// a dev client that predates the package.
let NativeBlurView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeBlurView = require('expo-blur').BlurView;
} catch {
  NativeBlurView = null;
}

interface AppHeaderProps {
  /** Optional title shown between the menu and profile buttons. */
  greeting?: string;
  showMenu?: boolean;
  showProfile?: boolean;
  /** Pad the header for the top safe area (use when the native header is hidden). */
  safeAreaTop?: boolean;
  /** When provided, shows a back button with this label instead of the menu hamburger. */
  backLabel?: string;
  /** Align the title to the left instead of centering it. */
  titleLeft?: boolean;
  /** Tab accent color for title + icons (defaults to the theme tint). */
  accent?: string;
}

export default function AppHeader({
  greeting,
  showMenu = true,
  showProfile = true,
  safeAreaTop = false,
  backLabel,
  titleLeft = false,
  accent,
}: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const glass = glassColors(scheme, accent ?? colors.tint);
  // Accent used directly on translucent surfaces/photos — pull it toward
  // readable when it's extremely light or dark.
  const iconAccent = readableAccent(accent ?? colors.tint, scheme);

  /** Compact frosted-glass button surface — blur + translucent fill + border. */
  const glassButton = (circle: boolean, child: ReactNode) => (
    <View
      style={[
        styles.glassButton,
        {
          borderRadius: circle ? 20 : radius.sm + 4,
          borderColor: glass.glassBorder,
        },
      ]}>
      {NativeBlurView ? (
        <NativeBlurView
          intensity={40}
          tint={scheme}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: glass.glass,
            borderRadius: circle ? 20 : radius.sm + 4,
          },
        ]}
      />
      {child}
    </View>
  );

  const leftControl = backLabel ? (
    <Pressable
      onPress={() => router.back()}
      style={styles.backButton}
      accessibilityRole="button"
      accessibilityLabel={`Back to ${backLabel}`}
      hitSlop={8}>
      {({ pressed }) => (
        <View style={styles.backRow}>
          <SymbolView
            name="chevron.left"
            tintColor={iconAccent}
            size={18}
            weight="medium"
            style={{ opacity: pressed ? 0.5 : 1 }}
          />
          <Text
            style={[
              styles.backLabel,
              { color: iconAccent },
              pressed && { opacity: 0.5 },
            ]}
            numberOfLines={1}>
            {backLabel}
          </Text>
        </View>
      )}
    </Pressable>
  ) : showMenu ? (
    <Link href="/menu" asChild>
      <Pressable
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        hitSlop={8}>
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.55 : 1 }}>
            {glassButton(
              false,
              <SymbolView
                name="line.3.horizontal"
                tintColor={iconAccent}
                size={20}
                weight="medium"
              />,
            )}
          </View>
        )}
      </Pressable>
    </Link>
  ) : null;

  const rightControl = showProfile ? (
    <Link href="/profile" asChild>
      <Pressable
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        hitSlop={8}>
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.55 : 1 }}>
            {glassButton(
              true,
              <SymbolView name="person.fill" tintColor={iconAccent} size={16} />,
            )}
          </View>
        )}
      </Pressable>
    </Link>
  ) : null;

  return (
    <View style={[styles.container, safeAreaTop && { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {/* Left */}
        <View style={[styles.sideLeft, titleLeft && styles.sideLeftCompact]}>
          {leftControl}
        </View>

        {/* Title */}
        {greeting ? (
          <View
            style={titleLeft ? styles.titleLeft : styles.titleCenter}
            pointerEvents="none">
            <Text
              style={[
                titleLeft ? styles.titleTextLeft : styles.titleText,
                { color: iconAccent },
              ]}
              numberOfLines={1}>
              {greeting}
            </Text>
          </View>
        ) : null}

        {/* Right */}
        <View style={styles.sideRight}>{rightControl}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
  },
  sideLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  // titleLeft places the title immediately next to the left control.
  sideLeftCompact: {
    flex: 0,
    marginRight: spacing.sm,
  },
  sideRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 2,
    maxWidth: 90,
  },

  titleText: {
    ...typography.body,
    fontSize: 17,
    textAlign: 'center',
    maxWidth: 220,
  },
  titleTextLeft: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'left',
  },
});
