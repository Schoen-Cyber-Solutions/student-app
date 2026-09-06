import { StyleSheet, View } from 'react-native';
import { ThreadReply } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { relativeTime } from '@/utils/time';

interface ThreadReplyItemProps {
  reply: ThreadReply;
}

export default function ThreadReplyItem({ reply }: ThreadReplyItemProps) {
  const colors = Colors[useColorScheme()];

  return (
    <View style={[styles.container, { borderBottomColor: colors.divider }]}>
      <Text style={[styles.meta, { color: colors.secondaryText }]}>
        {reply.authorPseudonym} · {relativeTime(reply.createdAt)}
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>{reply.body}</Text>
    </View>
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
