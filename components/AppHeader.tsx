import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Link } from 'expo-router';
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
}

export default function AppHeader({
  greeting,
  showMenu = true,
  showProfile = true,
  safeAreaTop = false,
}: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, safeAreaTop && { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {showMenu && (
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
        )}

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
  spacer: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontSize: 17,
    flex: 1,
    marginLeft: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
