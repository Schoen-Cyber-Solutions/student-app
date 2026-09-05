import { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import CalendarViewSwitcher, { CalendarView } from '@/components/CalendarViewSwitcher';
import WeekTimetable from '@/components/WeekTimetable';
import CourseDetailOverlay from '@/components/CourseDetailOverlay';
import EmptyState from '@/components/EmptyState';
import { Course } from '@/types';
import { mockCourses } from '@/data/mockCourses';
import { getMondayOfWeek, getWeekDayDates } from '@/utils/time';

export default function CalendarScreen() {
  const [view, setView] = useState<CalendarView>('week');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const baseMonday = getMondayOfWeek(new Date());
  const weekMonday = new Date(baseMonday);
  weekMonday.setDate(baseMonday.getDate() + weekOffset * 7);
  const weekDates = getWeekDayDates(weekMonday);

  const goToNextWeek = useCallback(() => setWeekOffset((o) => o + 1), []);
  const goToPrevWeek = useCallback(() => setWeekOffset((o) => o - 1), []);
  const goToToday = useCallback(() => setWeekOffset(0), []);

  return (
    <View style={styles.container}>
      <AppHeader safeAreaTop greeting="Calendar" />
      <ScreenWrapper>
        <View style={styles.switcher}>
          <CalendarViewSwitcher active={view} onChange={setView} />
        </View>

        {view === 'week' && (
          <WeekTimetable
            courses={mockCourses}
            weekDates={weekDates}
            weekOffset={weekOffset}
            onSelectCourse={setSelectedCourse}
            onSwipeLeft={goToNextWeek}
            onSwipeRight={goToPrevWeek}
            onGoToToday={goToToday}
          />
        )}

        {view === 'day' && (
          <EmptyState
            title="Day view"
            message="Coming soon. Switch to Week to see your timetable."
            icon="calendar"
          />
        )}

        {view === 'month' && (
          <EmptyState
            title="Month view"
            message="Coming soon. Switch to Week to see your timetable."
            icon="calendar"
          />
        )}
      </ScreenWrapper>

      <CourseDetailOverlay
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  switcher: {
    paddingTop: 8,
    paddingBottom: 4,
  },
});
