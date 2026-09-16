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
import { useMyCourse } from '@/hooks/useMyCourses';
import { CommunityThread, getCourseThreads } from '@/services/api/communities';
import { toApiError } from '@/services/api/client';

type ThreadsStatus = 'loading' | 'success' | 'unauthorized' | 'not_found' | 'error';

export default function CourseCommunityScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const colors = Colors[useColorScheme()];
  const course = useMyCourse(courseId);
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [status, setStatus] = useState<ThreadsStatus>('loading');

  const loadThreads = useCallback(async () => {
    if (!courseId) return;
    try {
      const data = await getCourseThreads(courseId);
      setThreads(data);
      setStatus('success');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'unauthorized') setStatus('unauthorized');
      else if (apiErr.kind === 'not_found') setStatus('not_found');
      else setStatus('error');
    }
  }, [courseId]);

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
            message="You don't have access to this course community."
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
              onPress={() => router.push(`/chats/${courseId}/thread/${thread.id}`)}
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
      <Stack.Screen options={{ title: course?.name ?? 'Course', headerShown: false }} />
      <View style={styles.container}>
        <AppHeader safeAreaTop greeting={course?.name ?? 'Course Community'} backLabel="Chat" />
        <ScreenWrapper>
          {course && (
            <Text style={[styles.code, { color: colors.secondaryText }]}>{course.code}</Text>
          )}

          <Pressable
            onPress={() => router.push(`/chats/${courseId}/new-thread`)}
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
