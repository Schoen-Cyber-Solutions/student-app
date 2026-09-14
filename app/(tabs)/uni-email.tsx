import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import EmailListItem from '@/components/email/EmailListItem';
import EmptyState from '@/components/EmptyState';
import { Text } from '@/components/Themed';
import { useMyEmail } from '@/hooks/useMyEmail';
import { getMicrosoftConnectUrl } from '@/services/api/email';
import { getSessionToken } from '@/services/auth/devSession';
import { toApiError } from '@/services/api/client';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';

export default function UniEmailScreen() {
  const colors = Colors[useColorScheme()];
  const { status, messages, retry } = useMyEmail();
  const [connecting, setConnecting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      retry();
    }, [retry])
  );

  const REDIRECT_URL = 'studentappdevelopment://oauth';

  const handleConnect = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;

    setConnecting(true);
    try {
      const url = await getMicrosoftConnectUrl(token);
      // eslint-disable-next-line no-console
      console.log('[uni-email] opening Microsoft auth session');
      const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URL);
      // eslint-disable-next-line no-console
      console.log('[uni-email] WebBrowser result type:', result.type);
      if (result.type === 'success') {
        retry();
      }
    } catch (err) {
      const apiErr = toApiError(err);
      console.warn(`[uni-email] connect failed: ${apiErr.kind}${apiErr.status ? ` ${apiErr.status}` : ''}`);
    } finally {
      setConnecting(false);
    }
  }, [retry]);

  const unreadCount = messages.filter((e) => !e.isRead).length;

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
              <View style={[styles.badge, { backgroundColor: colors.tintSoft }]}>
                <Text style={[styles.badgeText, { color: colors.tint }]}>
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

        {/* States */}
        {status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.tint} />
          </View>
        )}

        {status === 'unauthorized' && (
          <EmptyState
            title="Not signed in"
            message="Development session token is missing or expired."
            icon="lock.shield"
          />
        )}

        {status === 'not_connected' && (
          <View style={styles.center}>
            <EmptyState
              title="Connect Outlook"
              message="Sign in with your university Microsoft account to see your inbox."
              icon="envelope"
              actionLabel={connecting ? 'Opening...' : 'Connect Outlook'}
              onAction={handleConnect}
            />
          </View>
        )}

        {status === 'consent_required' && (
          <View style={styles.center}>
            <EmptyState
              title="Needs admin approval"
              message="Your university may require an administrator to approve this app before it can access Outlook."
              icon="person.badge.key"
              actionLabel="Try again"
              onAction={handleConnect}
            />
          </View>
        )}

        {status === 'error' && (
          <View style={styles.center}>
            <EmptyState
              title="Couldn\u2019t load email"
              message="Check that the backend is reachable and try again."
              icon="exclamationmark.triangle"
              actionLabel="Retry"
              onAction={retry}
            />
          </View>
        )}

        {status === 'empty' && (
          <View style={styles.center}>
            <EmptyState
              title="Inbox empty"
              message="No recent messages in your Outlook mailbox."
              icon="tray"
            />
          </View>
        )}

        {status === 'success' && (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}>
            {messages.map((email) => (
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
  },
});
