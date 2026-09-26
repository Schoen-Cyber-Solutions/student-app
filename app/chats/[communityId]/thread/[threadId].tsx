import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ThreadPost from '@/components/ThreadPost';
import ThreadReplyItem from '@/components/ThreadReplyItem';
import ReplyComposer from '@/components/ReplyComposer';
import EmptyState from '@/components/EmptyState';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useMyCommunity } from '@/hooks/useMyCommunities';
import {
  ThreadDetail,
  ThreadMessage,
  getThread,
  postThreadMessage,
  deleteThread,
  deleteMessage,
} from '@/services/api/communities';
import { toApiError } from '@/services/api/client';

type LoadStatus = 'loading' | 'success' | 'unavailable' | 'error';

export default function ThreadDetailScreen() {
  const { communityId, threadId } = useLocalSearchParams<{
    communityId: string;
    threadId: string;
  }>();
  const colors = Colors[useColorScheme()];
  const community = useMyCommunity(communityId);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    if (!threadId) return;
    try {
      const data = await getThread(threadId);
      setThread(data.thread);
      setMessages(data.messages);
      setStatus('success');
    } catch (err) {
      const apiErr = toApiError(err);
      setStatus(
        apiErr.kind === 'unauthorized' || apiErr.kind === 'not_found'
          ? 'unavailable'
          : 'error',
      );
    }
  }, [threadId]);

  useFocusEffect(
    useCallback(() => {
      setStatus((prev) => (prev === 'success' ? prev : 'loading'));
      void loadData();
    }, [loadData])
  );

  const handleReply = async (text: string) => {
    if (!threadId || sending) return;
    setSending(true);
    try {
      const message = await postThreadMessage(threadId, text);
      setMessages((prev) => [...prev, message]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    } catch (err) {
      const apiErr = toApiError(err);
      Alert.alert(
        'Could not send reply',
        apiErr.kind === 'unauthorized' || apiErr.kind === 'not_found'
          ? 'You no longer have access to this discussion.'
          : 'Check your connection and try again.',
      );
    } finally {
      setSending(false);
    }
  };

  const handleDeleteThread = () => {
    if (!threadId) return;
    Alert.alert('Delete thread?', 'This will remove the thread and all of its messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteThread(threadId);
              router.back();
            } catch {
              Alert.alert('Could not delete', 'Check your connection and try again.');
            }
          })();
        },
      },
    ]);
  };

  const handleDeleteMessage = (message: ThreadMessage) => {
    Alert.alert('Delete message?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteMessage(message.id);
              setMessages((prev) => prev.filter((m) => m.id !== message.id));
            } catch {
              Alert.alert('Could not delete', 'Check your connection and try again.');
            }
          })();
        },
      },
    ]);
  };

  // The first message is the thread's opening post.
  const openingPost = messages[0];
  const replies = messages.slice(1);

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.tint} />
          </View>
        );
      case 'unavailable':
        return (
          <EmptyState
            title="Discussion unavailable"
            message="This discussion may have been removed, or you no longer have access."
            icon="lock.shield"
          />
        );
      case 'error':
        return (
          <EmptyState
            title="Couldn't load discussion"
            message="Check your connection and try again."
            icon="wifi.exclamationmark"
            actionLabel="Retry"
            onAction={() => {
              setStatus('loading');
              void loadData();
            }}
          />
        );
      case 'success':
        if (!thread) return null;
        return (
          <>
            <ThreadPost
              title={thread.title}
              authorUsername={thread.authorUsername}
              createdAt={thread.createdAt}
              body={openingPost?.body ?? ''}
              onDelete={thread.isAuthor ? handleDeleteThread : undefined}
            />
            <View style={[styles.divider, { borderColor: colors.divider }]}>
              <Text style={[styles.replyCount, { color: colors.secondaryText }]}>
                {replies.length === 0
                  ? 'No replies yet'
                  : `${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}`}
              </Text>
            </View>
            {replies.map((reply) => (
              <ThreadReplyItem
                key={reply.id}
                reply={reply}
                onLongPress={
                  reply.isAuthor ? () => handleDeleteMessage(reply) : undefined
                }
              />
            ))}
            <View style={{ height: 16 }} />
          </>
        );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: community?.name ?? 'Thread',
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        <AppHeader safeAreaTop greeting={community?.name ?? 'Thread'} backLabel="Back" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive">
            {renderBody()}
          </ScrollView>
          {status === 'success' && <ReplyComposer onSubmit={handleReply} sending={sending} />}
        </KeyboardAvoidingView>
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
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  replyCount: {
    ...typography.label,
    fontWeight: '600',
  },
});
