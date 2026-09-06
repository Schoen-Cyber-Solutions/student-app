import { StyleSheet, View } from 'react-native';
import { CourseThread } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import ThreadCategoryBadge from './ThreadCategoryBadge';
import { relativeTime } from '@/utils/time';

interface ThreadPostProps {
  thread: CourseThread;
}

export default function ThreadPost({ thread }: ThreadPostProps) {
  const colors = Colors[useColorScheme()];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{thread.title}</Text>
      <ThreadCategoryBadge category={thread.category} />
      <Text style={[styles.author, { color: colors.secondaryText }]}>
        {thread.authorPseudonym} · {relativeTime(thread.createdAt)}
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>{thread.body}</Text>
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
  author: {
    ...typography.label,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
});
