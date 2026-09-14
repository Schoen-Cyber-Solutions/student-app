import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import SectionHeader from '@/components/SectionHeader';
import CourseCommunityRow from '@/components/CourseCommunityRow';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useMyCourses } from '@/hooks/useMyCourses';
import { getThreadsForCourse } from '@/data/mockThreads';
import { useEffect, useState } from 'react';

export default function ChatsScreen() {
  const colors = Colors[useColorScheme()];
  const { status, courses, retry } = useMyCourses();
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});

  // Thread counts are still mock data; only the course list comes from the backend.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const map: Record<string, number> = {};
      for (const course of courses) {
        const threads = await getThreadsForCourse(course.id);
        map[course.id] = threads.length;
      }
      if (mounted) setActivityMap(map);
    })();
    return () => { mounted = false; };
  }, [courses]);

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.tint} />
          </View>
        );
      case 'unauthorized':
        return (
          <EmptyState
            title="Not signed in"
            message="Your session is missing or has expired. Sign in again to see your course communities."
            icon="person.crop.circle.badge.exclamationmark"
            actionLabel="Try again"
            onAction={retry}
          />
        );
      case 'error':
        return (
          <EmptyState
            title="Couldn't load courses"
            message="Check your connection and try again."
            icon="wifi.exclamationmark"
            actionLabel="Retry"
            onAction={retry}
          />
        );
      case 'success':
        if (courses.length === 0) {
          return (
            <EmptyState
              title="No courses yet"
              message="Once your university enrollments sync, your course communities will appear here."
              icon="book.closed"
            />
          );
        }
        return courses.map((course) => (
          <CourseCommunityRow
            key={course.id}
            course={course}
            activityCount={activityMap[course.id] || undefined}
            onPress={() => router.push(`/chats/${course.id}`)}
          />
        ));
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader safeAreaTop />
      <ScreenWrapper>
        <View style={styles.section}>
          <SectionHeader title="Course Communities" />
          {renderBody()}
        </View>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
