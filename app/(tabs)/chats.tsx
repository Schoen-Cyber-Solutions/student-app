import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import SectionHeader from '@/components/SectionHeader';
import CourseCommunityRow from '@/components/CourseCommunityRow';
import { getEnrolledCourses } from '@/services/university';
import { getThreadsForCourse } from '@/data/mockThreads';
import { useEffect, useState } from 'react';
import { Course } from '@/types';

export default function ChatsScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await getEnrolledCourses();
      if (!mounted) return;
      setCourses(list);
      const map: Record<string, number> = {};
      for (const course of list) {
        const threads = await getThreadsForCourse(course.id);
        map[course.id] = threads.length;
      }
      if (mounted) setActivityMap(map);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader safeAreaTop />
      <ScreenWrapper>
        <View style={styles.section}>
          <SectionHeader title="Course Communities" />
          {courses.map((course) => (
            <CourseCommunityRow
              key={course.id}
              course={course}
              activityCount={activityMap[course.id] || undefined}
              onPress={() => router.push(`/chats/${course.id}`)}
            />
          ))}
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
});
