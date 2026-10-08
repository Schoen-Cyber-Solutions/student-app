import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { MessageAttachment, ThreadMessage } from '@/services/api/communities';
import { Text } from './Themed';
import { glassColors, readableAccent } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useTextMode, useThemedColors } from './TabTextMode';
import { relativeTime } from '@/utils/time';
import AttachedImage from './AttachedImage';

interface ThreadReplyItemProps {
  reply: ThreadMessage;
  /** Long-press affordance — delete for own replies, moderation for others'. */
  onLongPress?: () => void;
  /** Visible ⋯ affordance opening the same menu as long-press — without it
   *  the moderation actions are undiscoverable on device. */
  onOptions?: () => void;
  /** Tab accent — own messages get an accent-tinted bubble. */
  accent?: string;
  onPressImage?: (attachment: MessageAttachment) => void;
}

export default function ThreadReplyItem({ reply, onLongPress, onOptions, accent, onPressImage }: ThreadReplyItemProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemedColors();
  const glass = glassColors(scheme, accent ?? colors.tint, useTextMode());
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
        <View style={styles.metaRight}>
          <Text style={[styles.meta, { color: colors.mutedText }]}>
            {relativeTime(reply.createdAt)}
          </Text>
          {onOptions && (
            <Pressable
              onPress={onOptions}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Reply options">
              {({ pressed }) => (
                <SymbolView
                  name="ellipsis"
                  tintColor={colors.mutedText}
                  size={14}
                  style={pressed && { opacity: 0.5 }}
                />
              )}
            </Pressable>
          )}
        </View>
      </View>
      {reply.body.length > 0 && (
        <Text style={[styles.body, { color: colors.text }]}>{reply.body}</Text>
      )}
      {reply.attachment && (
        <AttachedImage attachment={reply.attachment} onPress={onPressImage} style={styles.attachment} />
      )}
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
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  body: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 20,
  },
  attachment: {
    marginTop: spacing.sm,
  },
});
