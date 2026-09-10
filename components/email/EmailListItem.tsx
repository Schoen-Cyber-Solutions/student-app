import { Pressable, StyleSheet, View } from 'react-native';
import { EmailMessage } from '@/types';
import { Text } from '../Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '../useColorScheme';
import { relativeTime } from '@/utils/time';

interface EmailListItemProps {
  email: EmailMessage;
  onPress: (email: EmailMessage) => void;
}

export default function EmailListItem({ email, onPress }: EmailListItemProps) {
  const colors = Colors[useColorScheme()];
  const senderName = email.sender.name || email.sender.email;
  const timeLabel = relativeTime(email.receivedAt);

  return (
    <Pressable
      onPress={() => onPress(email)}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surface },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${email.subject}, from ${senderName}`}>
      <View style={styles.content}>
        {/* Top row: sender + time */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.sender,
              !email.isRead && styles.unread,
              { color: email.isRead ? colors.text : colors.text },
            ]}
            numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={[styles.time, { color: colors.mutedText }]}>
            {timeLabel}
          </Text>
        </View>

        {/* Subject */}
        <Text
          style={[
            styles.subject,
            !email.isRead && styles.unread,
            { color: email.isRead ? colors.text : colors.text },
          ]}
          numberOfLines={1}>
          {email.subject}
        </Text>

        {/* Preview */}
        <Text
          style={[
            styles.preview,
            { color: email.isRead ? colors.secondaryText : colors.secondaryText },
          ]}
          numberOfLines={2}>
          {email.preview}
        </Text>
      </View>

      {/* Unread dot */}
      {!email.isRead && (
        <View style={styles.dotRow}>
          <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sender: {
    ...typography.body,
    fontSize: 14,
    flex: 1,
    marginRight: spacing.sm,
  },
  unread: {
    fontWeight: '700',
  },
  time: {
    ...typography.caption,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  subject: {
    ...typography.body,
    fontSize: 15,
    marginBottom: 2,
  },
  preview: {
    ...typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  dotRow: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
