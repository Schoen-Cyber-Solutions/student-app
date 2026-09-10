import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import EmailListItem from '@/components/email/EmailListItem';
import { EmailMessage } from '@/types';
import { getInbox } from '@/services/email';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { Text } from '@/components/Themed';

export default function UniEmailScreen() {
  const colors = Colors[useColorScheme()];
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const inbox = await getInbox();
    setEmails(inbox);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unreadCount = emails.filter((e) => !e.isRead).length;

  return (
    <View style={styles.container}>
      <AppHeader safeAreaTop />
      <ScreenWrapper scrollable={false}>
        {/* Inbox toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            <Text style={[styles.inboxLabel, { color: colors.text }]}>
              Inbox
            </Text>
            {unreadCount > 0 && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.tintSoft },
                ]}>
                <Text
                  style={[styles.badgeText, { color: colors.tint }]}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => router.push('/uni-email/compose')}
            style={({ pressed }) => [
              styles.composeButton,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Compose new email">
            <SymbolView
              name="square.and.pencil"
              tintColor={colors.tint}
              size={22}
              weight="medium"
            />
          </Pressable>
        </View>

        {/* Email list */}
        {loading ? (
          <View style={styles.center}>
            <Text style={[styles.empty, { color: colors.secondaryText }]}>
              Loading...
            </Text>
          </View>
        ) : emails.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.empty, { color: colors.secondaryText }]}>
              No emails yet.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}>
            {emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                onPress={(e) => router.push(`/uni-email/${e.id}`)}
              />
            ))}
          </ScrollView>
        )}
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inboxLabel: {
    ...typography.heading,
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  composeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...typography.body,
    fontSize: 15,
  },
});
