import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

/**
 * Inline back row for screens that hide the native stack header (the
 * onboarding-style centered-card layouts). Renders nothing when there is no
 * previous screen to return to.
 */
export default function BackButton({ label = 'Back' }: { label?: string }) {
  const colors = Colors[useColorScheme()];
  if (!router.canGoBack()) return null;
  return (
    <Pressable
      onPress={() => router.back()}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}>
      {({ pressed }) => (
        <View style={[styles.row, pressed && { opacity: 0.5 }]}>
          <SymbolView name="chevron.left" tintColor={colors.tint} size={17} weight="medium" />
          <Text style={[styles.label, { color: colors.tint }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    height: 40,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '500',
  },
});
