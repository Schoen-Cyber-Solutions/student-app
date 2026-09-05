import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface EmptyStateProps {
  title: string;
  message?: string;
  /** SF Symbol name (iOS). */
  icon?: string;
}

export default function EmptyState({ title, message, icon = 'checkmark.circle' }: EmptyStateProps) {
  const colors = Colors[useColorScheme()];
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <SymbolView name={icon as any} tintColor={colors.mutedText} size={26} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.secondaryText }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...typography.body,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  message: {
    ...typography.label,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
