import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import ThreadListItem from '@/components/ThreadListItem';
import EmptyState from '@/components/EmptyState';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import { Text } from '@/components/Themed';
import { glassColors, readableAccent } from '@/constants/Glass';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useTextMode } from '@/components/TabTextMode';
import { useMyCommunity } from '@/hooks/useMyCommunities';
import { useChatSearch } from '@/hooks/useChatSearch';
import ChatSearchBar from '@/components/ChatSearchBar';
import ChatSearchResults from '@/components/ChatSearchResults';
import { CommunityThread, communityDisplayName, deleteThread, getCommunityThreads } from '@/services/api/communities';
import { toApiError } from '@/services/api/client';
import { useModeration } from '@/hooks/useModeration';
import { filterOutAuthor } from '@/utils/moderationMenu';
import { useTabAccent } from '@/utils/tabAccent';
import { refreshTabAppearance, useTabAppearance } from '@/utils/tabAppearanceStore';

type ThreadsStatus = 'loading' | 'success' | 'unauthorized' | 'not_found' | 'error';

export default function CommunityScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const scheme = useColorScheme();
  const accent = useTabAccent('chat');
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent, useTextMode());
  const chatAppearance = useTabAppearance('chat');
  const community = useMyCommunity(communityId);
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [status, setStatus] = useState<ThreadsStatus>('loading');
  // Scoped search within this community only.
  const search = useChatSearch({ communityId });
  const moderation = useModeration();

  // A blocked author's threads vanish from this list right away; other
  // screens refetch on focus and get the same server-side filtering.
  const handleAuthorBlocked = useCallback((authorId: string) => {
    setThreads((prev) => filterOutAuthor(prev, authorId));
  }, []);

  const confirmDeleteThread = useCallback(
    (thread: CommunityThread) => {
      Alert.alert('Delete thread?', 'This will remove the thread and all of its messages.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteThread(thread.id);
                setThreads((prev) => prev.filter((t) => t.id !== thread.id));
              } catch {
                Alert.alert('Could not delete', 'Check your connection and try again.');
              }
            })();
          },
        },
      ]);
    },
    [],
  );

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
      void refreshTabAppearance();
    }, [loadThreads])
  );

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.loading}>
            <ActivityIndicator color={accent} />
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
          <GlassPanel style={styles.threadPanel} intensity={30}>
            <View style={styles.threadCards}>
              {threads.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  onPress={() => router.push(`/chats/${encodeURIComponent(communityId ?? '')}/thread/${thread.id}`)}
                  onLongPress={() =>
                    moderation.openContentMenu({
                      kind: 'thread',
                      isAuthor: thread.isAuthor,
                      authorId: thread.authorId,
                      authorUsername: thread.authorUsername,
                      contentId: thread.id,
                      onDelete: thread.isAuthor ? () => confirmDeleteThread(thread) : undefined,
                      onBlocked: handleAuthorBlocked,
                    })
                  }
                />
              ))}
            </View>
          </GlassPanel>
        ) : (
          <EmptyState
            title="No discussions yet"
            message="Start the first discussion."
            icon="bubble.left.and.bubble.right"
          />
        );
    }
  };

  // Navigation options are static in app/(tabs)/chats/_layout.tsx.
  return (
      <View style={styles.container}>
        <CalendarBackground appearance={chatAppearance} />
        <AppHeader
          safeAreaTop
          greeting={community ? communityDisplayName(community) : 'Community'}
          backLabel="Chat"
          accent={accent}
        />
        <ScreenWrapper>

          <View style={styles.searchWrap}>
            <ChatSearchBar
              value={search.query}
              onChange={search.setQuery}
              accent={accent}
              placeholder="Search this community"
            />
          </View>

          {moderation.sheet}
          {search.query.trim().length > 0 ? (
            <View style={styles.searchResults}>
              <ChatSearchResults
                results={search.results}
                searching={search.searching}
                query={search.query.trim()}
                accent={accent}
                type={search.type}
                onTypeChange={search.setType}
                hideCommunityName
              />
            </View>
          ) : (
            <>
          <Pressable
            onPress={() => router.push(`/chats/${encodeURIComponent(communityId ?? '')}/new-thread`)}
            style={({ pressed }) => [
              styles.newThreadButton,
              {
                backgroundColor: glass.accentSoft,
                borderColor: glass.glassBorder,
              },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="New thread">
            <SymbolView
              name="plus"
              tintColor={readableAccent(accent, scheme === 'dark' ? 'dark' : 'light')}
              size={16}
            />
            <Text
              style={[
                styles.newThreadText,
                { color: readableAccent(accent, scheme === 'dark' ? 'dark' : 'light') },
              ]}>
              New Thread
            </Text>
          </Pressable>

          <View style={styles.list}>{renderBody()}</View>
            </>
          )}
        </ScreenWrapper>
      </View>
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
  newThreadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  threadPanel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  threadCards: {
    padding: spacing.sm,
    // 12pt gap separates each thread card — no dividers, no touching cards.
    gap: spacing.md,
  },
  newThreadText: {
    ...typography.label,
    fontWeight: '600',
  },
  list: {
    marginTop: spacing.sm,
  },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  searchResults: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
});
