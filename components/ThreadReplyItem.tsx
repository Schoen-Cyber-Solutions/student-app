import { Pressable, StyleSheet, View } from 'react-native';
import { ThreadMessage } from '@/services/api/communities';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { glassColors, readableAccent } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { relativeTime } from '@/utils/time';

interface ThreadReplyItemProps {
  reply: ThreadMessage;
  /** Long-press affordance, used for author-only delete. */
  onLongPress?: () => void;
  /** Tab accent — own messages get an accent-tinted bubble. */
  accent?: string;
}

export default function ThreadReplyItem({ reply, onLongPress, accent }: ThreadReplyItemProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const glass = glassColors(scheme, accent ?? colors.tint);
  const isMine = reply.isAuthor;

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.bubble,
        {
          backgroundColor: isMine ? glass.accentSoft : glass.glass,
          borderColor: isMine ? accent ?? colors.tint : glass.glassBorder,
        },
        pressed && onLongPress ? { opacity: 0.7 } : null,
      ]}
      accessibilityLabel={`${reply.authorUsername}, ${relativeTime(reply.createdAt)}`}>
      <View style={styles.metaRow}>
        <Text
          style={[
            styles.meta,
            { color: isMine ? readableAccent(accent ?? colors.tint, scheme) : colors.secondaryText },
          ]}>
          {reply.authorUsername}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedText }]}>
          {relativeTime(reply.createdAt)}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.text }]}>{reply.body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    marginHorizontal: spacing.md,
    marginVertical: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: spacing.sm,
  },
  meta: {
    ...typography.caption,
    fontWeight: '600',
    flexShrink: 1,
  },
  body: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 20,
  },
});
