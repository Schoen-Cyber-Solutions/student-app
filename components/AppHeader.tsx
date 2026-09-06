import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Link, router } from 'expo-router';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface AppHeaderProps {
  /** Optional title shown between the menu and profile buttons. */
  greeting?: string;
  showMenu?: boolean;
  showProfile?: boolean;
  /** Pad the header for the top safe area (use when the native header is hidden). */
  safeAreaTop?: boolean;
  /** When provided, shows a back button with this label instead of the menu hamburger. */
  backLabel?: string;
}

export default function AppHeader({
  greeting,
  showMenu = true,
  showProfile = true,
  safeAreaTop = false,
  backLabel,
}: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, safeAreaTop && { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {backLabel ? (
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
                  tintColor={colors.tint}
                  size={18}
                  weight="medium"
                  style={{ opacity: pressed ? 0.5 : 1 }}
                />
                <Text
                  style={[
                    styles.backLabel,
                    { color: colors.tint },
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
                <SymbolView
                  name="line.3.horizontal"
                  tintColor={colors.text}
                  size={22}
                  weight="medium"
                  style={{ opacity: pressed ? 0.5 : 1 }}
                />
              )}
            </Pressable>
          </Link>
        ) : null}

        {greeting ? (
          <Text style={styles.title} numberOfLines={1}>
            {greeting}
          </Text>
        ) : (
          <View style={styles.spacer} />
        )}

        {showProfile && (
          <Link href="/profile" asChild>
            <Pressable
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              hitSlop={8}>
              {({ pressed }) => (
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.tintSoft, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <SymbolView name="person.fill" tintColor={colors.tint} size={16} />
                </View>
              )}
            </Pressable>
          </Link>
        )}
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
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: 120,
  },
  spacer: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
