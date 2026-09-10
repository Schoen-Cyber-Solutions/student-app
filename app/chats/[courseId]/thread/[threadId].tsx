import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ThreadPost from '@/components/ThreadPost';
import ThreadReplyItem from '@/components/ThreadReplyItem';
import ReplyComposer from '@/components/ReplyComposer';
import EmptyState from '@/components/EmptyState';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { Course, CourseThread, ThreadReply } from '@/types';
import { getCourseById } from '@/services/university';
import { getThread, getRepliesForThread, createReply } from '@/data/mockThreads';

function replyCountLabel(count: number): string {
  if (count === 0) return 'No replies yet';
  if (count === 1) return '1 Reply';
  return `${count} Replies`;
}

export default function ThreadDetailScreen() {
  const { courseId, threadId } = useLocalSearchParams<{
    courseId: string;
    threadId: string;
  }>();
  const colors = Colors[useColorScheme()];
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [thread, setThread] = useState<CourseThread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);

  useEffect(() => {
    let mounted = true;
    getCourseById(courseId).then((c) => {
      if (mounted) setCourse(c);
    });
    return () => { mounted = false; };
  }, [courseId]);

  const loadData = useCallback(async () => {
    const [t, r] = await Promise.all([
      getThread(threadId),
      getRepliesForThread(threadId),
    ]);
    if (t) setThread(t);
    setReplies(r);
  }, [threadId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [t, r] = await Promise.all([
        getThread(threadId),
        getRepliesForThread(threadId),
      ]);
      if (mounted) {
        if (t) setThread(t);
        setReplies(r);
      }
    })();
    return () => { mounted = false; };
  }, [threadId]);

  const handleReply = async (text: string) => {
    await createReply(threadId, { body: text });
    await loadData();
  };

  if (!thread) {
    return (
      <View style={styles.center}>
        <Text>Thread not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: course?.name ?? 'Thread',
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        <AppHeader safeAreaTop greeting={course?.name ?? 'Thread'} backLabel="Back" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive">
            <ThreadPost thread={thread} />

            <View style={[styles.divider, { borderColor: colors.divider }]}>
              <Text style={[styles.replyCount, { color: colors.secondaryText }]}>
                {replyCountLabel(thread.replyCount)}
              </Text>
            </View>

            {replies.length ? (
              replies.map((reply) => (
                <ThreadReplyItem key={reply.id} reply={reply} />
              ))
            ) : (
              <EmptyState
                title="No replies yet"
                message="Be the first to respond."
                icon="bubble.left"
              />
            )}

            <View style={{ height: 16 }} />
          </ScrollView>
          <ReplyComposer onSubmit={handleReply} />
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
