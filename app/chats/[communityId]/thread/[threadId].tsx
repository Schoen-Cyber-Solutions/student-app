import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ThreadPost from '@/components/ThreadPost';
import ThreadReplyItem from '@/components/ThreadReplyItem';
import ReplyComposer from '@/components/ReplyComposer';
import EmptyState from '@/components/EmptyState';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { glassColors } from '@/constants/Glass';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useMyCommunity } from '@/hooks/useMyCommunities';
import { useTabAccent } from '@/utils/tabAccent';
import { refreshTabAppearance, useTabAppearance } from '@/utils/tabAppearanceStore';
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
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const accent = useTabAccent('chat');
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent);
  const chatAppearance = useTabAppearance('chat');
  const insets = useSafeAreaInsets();
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
      void refreshTabAppearance();
    }, [loadData])
  );

  // Dev-only loop diagnostics: a healthy screen renders once per data change,
  // not per keystroke. Watch Metro logs while typing on-device — repeated
  // render lines or rapid keyboard-frame churn pinpoints the loop.
  const renderCount = useRef(0);
  renderCount.current += 1;
  if (__DEV__) {
    console.log(`[thread] render #${renderCount.current} status=${status}`);
  }
  useEffect(() => {
    if (!__DEV__) return;
    const sub = Keyboard.addListener('keyboardDidChangeFrame', (e) => {
      console.log(`[thread] keyboard frame h=${Math.round(e.endCoordinates.height)}`);
    });
    return () => sub.remove();
  }, []);

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
            <ActivityIndicator color={accent} />
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
            {/* One strong glass surface for the whole conversation — the
                replies inside use plain translucent fills, no per-message
                BlurView. */}
            <GlassPanel style={styles.conversation} variant="strong" intensity={30}>
              <ThreadPost
                title={thread.title}
                authorUsername={thread.authorUsername}
                createdAt={thread.createdAt}
                body={openingPost?.body ?? ''}
                onDelete={thread.isAuthor ? handleDeleteThread : undefined}
              />
              <View style={[styles.divider, { borderColor: glass.glassBorder }]}>
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
                  accent={accent}
                  onLongPress={
                    reply.isAuthor ? () => handleDeleteMessage(reply) : undefined
                  }
                />
              ))}
            </GlassPanel>
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
        <CalendarBackground appearance={chatAppearance} />
        <AppHeader
          safeAreaTop
          greeting={community?.name ?? 'Thread'}
          backLabel="Back"
          accent={accent}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // AppHeader + safe area sit above this view — without the offset the
          // composer overshoots when the keyboard opens.
          keyboardVerticalOffset={insets.top + 52}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            // 'interactive' feeds every drag frame back into KAV padding,
            // producing the jitter loop. 'on-drag' dismisses once per drag.
            keyboardDismissMode="on-drag">
            {renderBody()}
          </ScrollView>
          {status === 'success' && (
            <ReplyComposer onSubmit={handleReply} sending={sending} accent={accent} />
          )}
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
  conversation: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  replyCount: {
    ...typography.label,
    fontWeight: '600',
  },
});
