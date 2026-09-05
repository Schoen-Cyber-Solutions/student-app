import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import SectionHeader from '@/components/SectionHeader';
import CourseCard from '@/components/CourseCard';
import DueDateItem from '@/components/DueDateItem';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { getCourseUpdate, getTodaysCourses } from '@/data/mockCourses';
import { getUpcomingAssignments } from '@/data/mockAssignments';
import { mockStudentIdentity } from '@/data/mockStudentIdentity';

export default function HomeScreen() {
  const colors = Colors[useColorScheme()];
  const courses = getTodaysCourses();
  const assignments = getUpcomingAssignments();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <AppHeader safeAreaTop />
      <ScreenWrapper>
        <View style={styles.greeting}>
          <Text style={[styles.welcome, { color: colors.secondaryText }]}>
            Welcome back, {mockStudentIdentity.firstName}
          </Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Today's Classes"
            detail={courses.length ? `${courses.length} scheduled` : undefined}
          />
          {courses.length ? (
            courses.map((course) => (
              <CourseCard key={course.id} course={course} update={getCourseUpdate(course.id)} />
            ))
          ) : (
            <EmptyState
              title="No classes today"
              message="Enjoy the open schedule. Upcoming work is listed below."
              icon="calendar"
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Upcoming Due Dates" />
          {assignments.length ? (
            <View
              style={[
                styles.list,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}>
              {assignments.map((assignment, i) => (
                <DueDateItem
                  key={assignment.id}
                  assignment={assignment}
                  isLast={i === assignments.length - 1}
                />
              ))}
            </View>
          ) : (
            <EmptyState title="Nothing due soon" message="You're all caught up." />
          )}
        </View>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  greeting: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  welcome: {
    ...typography.label,
    marginBottom: 2,
  },
  date: {
    ...typography.title,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  list: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
});
