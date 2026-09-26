import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import ThreadListItem from '@/components/ThreadListItem';
import EmptyState from '@/components/EmptyState';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useMyCommunity } from '@/hooks/useMyCommunities';
import { CommunityThread, getCommunityThreads } from '@/services/api/communities';
import { toApiError } from '@/services/api/client';

type ThreadsStatus = 'loading' | 'success' | 'unauthorized' | 'not_found' | 'error';

export default function CommunityScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const colors = Colors[useColorScheme()];
  const community = useMyCommunity(communityId);
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [status, setStatus] = useState<ThreadsStatus>('loading');

  const loadThreads = useCallback(async () => {
    if (!communityId) return;
    try {
      const data = await getCommunityThreads(communityId);
      setThreads(data);
      setStatus('success');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'unauthorized') setStatus('unauthorized');
      else if (apiErr.kind === 'not_found') setStatus('not_found');
      else setStatus('error');
    }
  }, [communityId]);

  useFocusEffect(
    useCallback(() => {
      setStatus((prev) => (prev === 'success' ? prev : 'loading'));
      void loadThreads();
    }, [loadThreads])
  );

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.tint} />
          </View>
        );
      case 'unauthorized':
      case 'not_found':
        return (
          <EmptyState
            title="Community unavailable"
            message="You don't have access to this community."
            icon="lock.shield"
          />
        );
      case 'error':
        return (
          <EmptyState
            title="Couldn't load discussions"
            message="Check your connection and try again."
            icon="wifi.exclamationmark"
            actionLabel="Retry"
            onAction={() => {
              setStatus('loading');
              void loadThreads();
            }}
          />
        );
      case 'success':
        return threads.length ? (
          threads.map((thread) => (
            <ThreadListItem
              key={thread.id}
              thread={thread}
              onPress={() => router.push(`/chats/${encodeURIComponent(communityId ?? '')}/thread/${thread.id}`)}
            />
          ))
        ) : (
          <EmptyState
            title="No discussions yet"
            message="Start the first discussion."
            icon="bubble.left.and.bubble.right"
          />
        );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: community?.name ?? 'Community', headerShown: false }} />
      <View style={styles.container}>
        <AppHeader safeAreaTop greeting={community?.name ?? 'Community'} backLabel="Chat" />
        <ScreenWrapper>
          {community && (
            <Text style={[styles.code, { color: colors.secondaryText }]}>{community.subtitle}</Text>
          )}

          <Pressable
            onPress={() => router.push(`/chats/${encodeURIComponent(communityId ?? '')}/new-thread`)}
            style={({ pressed }) => [
              styles.newThreadButton,
              { backgroundColor: colors.tintSoft },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="New thread">
            <SymbolView name="plus" tintColor={colors.tint} size={16} />
            <Text style={[styles.newThreadText, { color: colors.tint }]}>
              New Thread
            </Text>
          </Pressable>

          <View style={styles.list}>{renderBody()}</View>
        </ScreenWrapper>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  code: {
    ...typography.overline,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  newThreadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  newThreadText: {
    ...typography.label,
    fontWeight: '600',
  },
  list: {
    marginTop: spacing.sm,
  },
});
