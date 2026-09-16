import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { relativeTime } from '@/utils/time';

interface ThreadPostProps {
  title: string;
  authorUsername: string;
  createdAt: string;
  body: string;
  /** Shown only when the current user authored the thread. */
  onDelete?: () => void;
}

export default function ThreadPost({ title, authorUsername, createdAt, body, onDelete }: ThreadPostProps) {
  const colors = Colors[useColorScheme()];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.metaRow}>
        <Text style={[styles.author, { color: colors.secondaryText }]}>
          {authorUsername} · {relativeTime(createdAt)}
        </Text>
        {onDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Delete thread">
            {({ pressed }) => (
              <Text style={[styles.delete, pressed && { opacity: 0.5 }]}>Delete</Text>
            )}
          </Pressable>
        )}
      </View>
      <Text style={[styles.body, { color: colors.text }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.heading,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  author: {
    ...typography.label,
  },
  delete: {
    ...typography.caption,
    color: '#DC2626',
    fontWeight: '600',
  },
  body: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
});
