import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ThreadPost from '@/components/ThreadPost';
import ThreadReplyItem from '@/components/ThreadReplyItem';
import ReplyComposer from '@/components/ReplyComposer';
import EmptyState from '@/components/EmptyState';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import { Text } from '@/components/Themed';
import { glassColors } from '@/constants/Glass';
import { spacing, typography, TAB_BAR_CLEARANCE } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useTextMode, useThemedColors } from '@/components/TabTextMode';
import { useMyCommunity } from '@/hooks/useMyCommunities';
import { useTabAccent } from '@/utils/tabAccent';
import { refreshTabAppearance, useTabAppearance } from '@/utils/tabAppearanceStore';
import {
  ChatImageDraft,
  MessageAttachment,
  ThreadDetail,
  ThreadMessage,
  chatAttachmentSource,
  communityDisplayName,
  getThread,
  postThreadMessage,
  deleteThread,
  deleteMessage,
} from '@/services/api/communities';
import { toApiError } from '@/services/api/client';
import ImageViewerModal from '@/components/ImageViewerModal';
import { useModeration } from '@/hooks/useModeration';
import { filterOutAuthor } from '@/utils/moderationMenu';

type LoadStatus = 'loading' | 'success' | 'unavailable' | 'error';

export default function ThreadDetailScreen() {
  const { communityId, threadId } = useLocalSearchParams<{
    communityId: string;
    threadId: string;
  }>();
  const scheme = useColorScheme();
  const colors = useThemedColors();
  const accent = useTabAccent('chat');
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent, useTextMode());
  const chatAppearance = useTabAppearance('chat');
  const community = useMyCommunity(communityId);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [sending, setSending] = useState(false);
  const [viewingImage, setViewingImage] = useState<{
    attachment: MessageAttachment;
    isAuthor: boolean;
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const moderation = useModeration();

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

  // Returns success so the composer only clears its draft on a real send —
  // a failed upload keeps the typed text and picked image.
  const handleReply = async (text: string, image: ChatImageDraft | null): Promise<boolean> => {
    if (!threadId || sending) return false;
    setSending(true);
    try {
      const message = await postThreadMessage(threadId, text, image);
      setMessages((prev) => [...prev, message]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
      return true;
    } catch (err) {
      if (__DEV__) console.warn('[thread] reply failed:', err);
      const apiErr = toApiError(err);
      Alert.alert(
        'Could not send reply',
        apiErr.kind === 'forbidden'
          ? 'Your account is currently restricted from posting.'
          : apiErr.kind === 'unauthorized' || apiErr.kind === 'not_found'
          ? 'You no longer have access to this discussion.'
          : apiErr.kind === 'client'
            ? 'Your reply was rejected. Check the image and text length.'
            : 'Check your connection and try again.',
      );
      return false;
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

  // Blocking takes effect immediately: drop the author's loaded messages
  // locally, and leave the thread entirely when its author was blocked.
  const handleAuthorBlocked = useCallback(
    (authorId: string) => {
      if (thread?.authorId === authorId) {
        router.back();
        return;
      }
      setMessages((prev) => filterOutAuthor(prev, authorId));
    },
    [thread?.authorId],
  );

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
                attachment={openingPost?.attachment}
                onPressImage={(attachment) =>
                  setViewingImage({ attachment, isAuthor: thread.isAuthor })
                }
                onDelete={thread.isAuthor ? handleDeleteThread : undefined}
                onOptions={
                  thread.isAuthor
                    ? undefined
                    : () =>
                        moderation.openContentMenu({
                          kind: 'thread',
                          isAuthor: false,
                          authorId: thread.authorId,
                          authorUsername: thread.authorUsername,
                          attachmentId: openingPost?.attachment?.id,
                          contentId: thread.id,
                          onBlocked: handleAuthorBlocked,
                        })
                }
              />
              <View style={[styles.divider, { borderColor: glass.glassBorder }]}>
                <Text style={[styles.replyCount, { color: colors.secondaryText }]}>
                  {replies.length === 0
                    ? 'No replies yet. Start the conversation.'
                    : `${replies.length} ${replies.length === 1 ? 'Reply' : 'Replies'}`}
                </Text>
              </View>
              {replies.map((reply) => (
                <ThreadReplyItem
                  key={reply.id}
                  reply={reply}
                  accent={accent}
                  onPressImage={(attachment) =>
                    setViewingImage({ attachment, isAuthor: reply.isAuthor })
                  }
                  onLongPress={() =>
                    moderation.openContentMenu({
                      kind: 'reply',
                      isAuthor: reply.isAuthor,
                      authorId: reply.authorId,
                      authorUsername: reply.authorUsername,
                      attachmentId: reply.attachment?.id,
                      contentId: reply.id,
                      onDelete: reply.isAuthor
                        ? () => handleDeleteMessage(reply)
                        : undefined,
                      onBlocked: handleAuthorBlocked,
                    })
                  }
                />
              ))}
            </GlassPanel>
            <View style={{ height: 16 }} />
          </>
        );
    }
  };

  // Navigation options are static in app/(tabs)/chats/_layout.tsx.
  return (
    <View style={styles.container}>
        <CalendarBackground appearance={chatAppearance} />
        {/* Header prefers the thread title; falls back to the community name
            while loading. Left-aligned, truncates with ellipsis. */}
        <AppHeader
          safeAreaTop
          greeting={thread?.title ?? (community ? communityDisplayName(community) : 'Thread')}
          backLabel="Back"
          accent={accent}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // keyboardVerticalOffset is measured from the TOP OF THE SCREEN to
          // the top of this view's parent frame — our AppHeader lives inside
          // the RN tree above the KAV, so the frame already accounts for it.
          // Passing the header height again would over-pad by ~100pt and float
          // the composer a full header-height above the keyboard.
          keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            // flex:1 + flexGrow pins the composer at the bottom — without it a
            // tall thread overflows the KAV column and pushes the composer
            // off-screen (the actual "cannot reply" symptom).
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            // 'interactive' feeds every drag frame back into KAV padding,
            // producing the jitter loop. 'on-drag' dismisses once per drag.
            keyboardDismissMode="on-drag">
            {renderBody()}
          </ScrollView>
          {status === 'success' && (
            <ReplyComposer
              onSubmit={handleReply}
              sending={sending}
              accent={accent}
              // Clear the floating tab bar while the keyboard is closed.
              reservedBottom={TAB_BAR_CLEARANCE}
            />
          )}
        </KeyboardAvoidingView>
        <ImageViewerModal
          source={viewingImage ? chatAttachmentSource(viewingImage.attachment) : null}
          onClose={() => setViewingImage(null)}
          onReport={
            viewingImage && !viewingImage.isAuthor
              ? () => {
                  const id = viewingImage.attachment.id;
                  setViewingImage(null);
                  moderation.openReport('attachment', id);
                }
              : undefined
          }
        />
        {moderation.sheet}
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
