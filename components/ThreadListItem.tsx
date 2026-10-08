import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { CommunityThread } from '@/services/api/communities';
import { Text } from './Themed';
import { glassColors } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useTextMode, useThemedColors } from './TabTextMode';
import { relativeTime } from '@/utils/time';

interface ThreadListItemProps {
  thread: CommunityThread;
  onPress: () => void;
  /** Long-press menu — delete for own threads, moderation for others'. */
  onLongPress?: () => void;
  /** Visible ⋯ affordance opening the same menu as long-press — without it
   *  the moderation actions are undiscoverable on device. */
  onOptions?: () => void;
}

export default function ThreadListItem({ thread, onPress, onLongPress, onOptions }: ThreadListItemProps) {
  const scheme = useColorScheme();
  const colors = useThemedColors();
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', undefined, useTextMode());

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: glass.glass,
          borderColor: glass.glassBorder,
        },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${thread.title}, by ${thread.authorUsername}`}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {thread.title}
      </Text>
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: colors.secondaryText }]} numberOfLines={1}>
          {thread.authorUsername}
        </Text>
        <View style={styles.metaRight}>
          <Text style={[styles.meta, { color: colors.mutedText }]} numberOfLines={1}>
            {thread.messageCount} message{thread.messageCount === 1 ? '' : 's'} · {relativeTime(thread.createdAt)}
          </Text>
          {onOptions && (
            <Pressable
              onPress={onOptions}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Thread options">
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Standalone translucent card — spacing between cards comes from the
  // parent list's `gap`, no hairline dividers.
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  meta: {
    ...typography.caption,
    fontWeight: '400',
    flexShrink: 1,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
});
