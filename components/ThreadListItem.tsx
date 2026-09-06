import { Pressable, StyleSheet, View } from 'react-native';
import { CourseThread } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import ThreadCategoryBadge from './ThreadCategoryBadge';
import { relativeTime } from '@/utils/time';

interface ThreadListItemProps {
  thread: CourseThread;
  onPress: () => void;
}

export default function ThreadListItem({ thread, onPress }: ThreadListItemProps) {
  const colors = Colors[useColorScheme()];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.divider },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${thread.title}, by ${thread.authorPseudonym}`}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {thread.title}
      </Text>
      <ThreadCategoryBadge category={thread.category} />
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: colors.secondaryText }]}>
          by {thread.authorPseudonym}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedText }]}>
          {thread.replyCount} repl{thread.replyCount === 1 ? 'y' : 'ies'} · {relativeTime(thread.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...typography.body,
    fontSize: 15,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  meta: {
    ...typography.caption,
    fontWeight: '400',
  },
});
