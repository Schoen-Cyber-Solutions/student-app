import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { Course, CourseThread } from '@/types';
import { getCourseById } from '@/services/university';
import { getThreadsForCourse } from '@/data/mockThreads';

export default function CourseCommunityScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const colors = Colors[useColorScheme()];
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [threads, setThreads] = useState<CourseThread[]>([]);

  useEffect(() => {
    let mounted = true;
    getCourseById(courseId).then((c) => {
      if (mounted) setCourse(c);
    });
    return () => { mounted = false; };
  }, [courseId]);

  const loadThreads = useCallback(async () => {
    const data = await getThreadsForCourse(courseId);
    setThreads(data);
  }, [courseId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await getThreadsForCourse(courseId);
      if (mounted) setThreads(data);
    })();
    return () => { mounted = false; };
  }, [courseId]);

  useFocusEffect(
    useCallback(() => {
      loadThreads();
    }, [loadThreads])
  );

  if (!course) {
    return (
      <View style={styles.center}>
        <Text>Course not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: course.name, headerShown: false }} />
      <View style={styles.container}>
        <AppHeader safeAreaTop greeting={course.name} backLabel="Chat" />
        <ScreenWrapper>
          <Text style={[styles.code, { color: colors.secondaryText }]}>{course.code}</Text>

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

          <View style={styles.list}>
            {threads.length ? (
              threads.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  onPress={() =>
                    router.push(`/chats/${courseId}/thread/${thread.id}`)
                  }
                />
              ))
            ) : (
              <EmptyState
                title="No discussions yet"
                message="Start the first conversation for this course."
                icon="bubble.left.and.bubble.right"
              />
            )}
          </View>
        </ScreenWrapper>
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
