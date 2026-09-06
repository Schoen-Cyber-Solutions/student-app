import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import SectionHeader from '@/components/SectionHeader';
import CourseCommunityRow from '@/components/CourseCommunityRow';
import { mockCourses } from '@/data/mockCourses';
import { getThreadsForCourse } from '@/data/mockThreads';
import { useEffect, useState } from 'react';

export default function ChatsScreen() {
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const map: Record<string, number> = {};
      for (const course of mockCourses) {
        const threads = await getThreadsForCourse(course.id);
        map[course.id] = threads.length;
      }
      if (mounted) setActivityMap(map);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader greeting="Chats" />
      <ScreenWrapper>
        <View style={styles.section}>
          <SectionHeader title="Course Communities" />
          {mockCourses.map((course) => (
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
