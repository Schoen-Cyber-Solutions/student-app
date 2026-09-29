import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';
import { useThemedColors } from './TabTextMode';

interface EmptyStateProps {
  title: string;
  message?: string;
  /** SF Symbol name (iOS). */
  icon?: string;
  /** Optional action (e.g. "Retry"). Button renders only when both are provided. */
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  message,
  icon = 'checkmark.circle',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colors = useThemedColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <SymbolView name={icon as any} tintColor={colors.mutedText} size={26} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.secondaryText }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: colors.tintSoft },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}>
          <Text style={[styles.actionText, { color: colors.tint }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
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
  action: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actionText: {
    ...typography.label,
    fontWeight: '600',
  },
});
