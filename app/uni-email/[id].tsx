import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import { Text } from '@/components/Themed';
import { EmailMessage } from '@/types';
import { getMessage, markAsRead } from '@/services/email';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';

export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = Colors[useColorScheme()];
  const [email, setEmail] = useState<EmailMessage | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const msg = await getMessage(id);
      if (!mounted) return;
      if (msg) {
        await markAsRead(id);
        setEmail({ ...msg, isRead: true });
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (!email) {
    return (
      <View style={styles.container}>
        <AppHeader safeAreaTop greeting="Email" titleLeft backLabel="Back" />
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.center}>
            <Text>Email not found.</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const senderName = email.sender.name || email.sender.email;
  const toList = email.recipients
    .map((r) => r.name || r.email)
    .join(', ');

  return (
    <View style={styles.container}>
      <AppHeader
        safeAreaTop
        greeting="Email"
        titleLeft
        backLabel="Back"
      />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Sender header */}
        <View style={styles.header}>
          <Text style={[styles.subject, { color: colors.text }]}>
            {email.subject}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.senderBlock}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.tintSoft },
                ]}>
                <Text style={[styles.avatarText, { color: colors.tint }]}>
                  {senderName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.senderInfo}>
                <Text
                  style={[styles.senderName, { color: colors.text }]}>
                  {senderName}
                </Text>
                <Text
                  style={[styles.senderAddress, { color: colors.secondaryText }]}
                  numberOfLines={1}>
                  {email.sender.email}
                </Text>
              </View>
            </View>
            <Text style={[styles.timestamp, { color: colors.mutedText }]}>
              {new Date(email.receivedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <Text style={[styles.toLine, { color: colors.secondaryText }]}>
            To: {toList}
          </Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={[styles.bodyText, { color: colors.text }]}>
            {email.body || email.preview}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  subject: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  senderBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  senderAddress: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 1,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  toLine: {
    ...typography.caption,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bodyText: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
});
