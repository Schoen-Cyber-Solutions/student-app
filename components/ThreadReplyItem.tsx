import { Pressable, StyleSheet } from 'react-native';
import { ThreadMessage } from '@/services/api/communities';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { relativeTime } from '@/utils/time';

interface ThreadReplyItemProps {
  reply: ThreadMessage;
  /** Long-press affordance, used for author-only delete. */
  onLongPress?: () => void;
}

export default function ThreadReplyItem({ reply, onLongPress }: ThreadReplyItemProps) {
  const colors = Colors[useColorScheme()];

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.container,
        { borderBottomColor: colors.divider },
        pressed && onLongPress ? { opacity: 0.7 } : null,
      ]}
      accessibilityLabel={`${reply.authorUsername}, ${relativeTime(reply.createdAt)}`}>
      <Text style={[styles.meta, { color: colors.secondaryText }]}>
        {reply.authorUsername} · {relativeTime(reply.createdAt)}
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>{reply.body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 20,
  },
});
