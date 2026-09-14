import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import CalendarViewSwitcher, { CalendarView } from '@/components/CalendarViewSwitcher';
import WeekTimetable from '@/components/WeekTimetable';
import DayView from '@/components/DayView';
import CourseDetailOverlay from '@/components/CourseDetailOverlay';
import EmptyState from '@/components/EmptyState';
import { Course } from '@/types';
import { useMyCalendar } from '@/hooks/useMyCalendar';
import { MyCalendarEvent } from '@/services/api/calendar';
import {
  getMondayOfWeek,
  getWeekDayDates,
  startOfDay,
  endOfDay,
  formatWeekdayShort,
  formatTime12,
} from '@/utils/time';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const EVENT_PALETTE = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F43F5E',
];

function colorForKey(key: string | null): string | undefined {
  if (!key) return undefined;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % EVENT_PALETTE.length;
  return EVENT_PALETTE[index];
}

function toTimetableCourse(event: MyCalendarEvent): Course {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const isZeroDuration = !end || end.getTime() <= start.getTime();

  return {
    id: event.id,
    name: event.title,
    code: event.courseCode ?? event.courseName ?? '',
    location: event.location ?? '',
    startTime: formatTime12(start),
    endTime: isZeroDuration ? '' : formatTime12(end),
    days: [formatWeekdayShort(start) as Course['days'][number]],
    instructor: '',
    instructorEmail: '',
    color: colorForKey(event.courseCode ?? event.title),
    date: start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    description: event.description ?? undefined,
  };
}

export default function CalendarScreen() {
  const [view, setView] = useState<CalendarView>('week');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const colors = Colors[useColorScheme()];

  const todayMonday = useMemo(() => getMondayOfWeek(new Date()), []);
  const baseMonday = new Date(todayMonday);
  baseMonday.setDate(todayMonday.getDate() + weekOffset * 7);
  const weekDates = getWeekDayDates(baseMonday);

  const range = useMemo(() => {
    const from = startOfDay(weekDates[0]).toISOString();
    const to = endOfDay(weekDates[weekDates.length - 1]).toISOString();
    return { from, to };
  }, [weekDates]);

  const { status, events, retry } = useMyCalendar(range);
  const courses = useMemo(() => events.map(toTimetableCourse), [events]);

  const goToNextWeek = () => setWeekOffset((o) => o + 1);
  const goToPrevWeek = () => setWeekOffset((o) => o - 1);
  const goToToday = () => {
    setWeekOffset(0);
    setSelectedDay(new Date());
  };

  const openDay = (date: Date) => {
    setSelectedDay(date);
    setView('day');
  };

  const goToNextDay = () => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + 1);
    setSelectedDay(d);
    setWeekOffset(
      Math.floor((d.getTime() - todayMonday.getTime()) / (7 * 24 * 60 * 60 * 1000))
    );
  };

  const goToPrevDay = () => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() - 1);
    setSelectedDay(d);
    setWeekOffset(
      Math.floor((d.getTime() - todayMonday.getTime()) / (7 * 24 * 60 * 60 * 1000))
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader safeAreaTop />
      <ScreenWrapper scrollable={false}>
        <View style={styles.switcher}>
          <CalendarViewSwitcher active={view} onChange={setView} />
        </View>

        {view === 'week' && (
          <>
            {status === 'loading' && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            )}

            {(status === 'success' || status === 'empty') && (
              <View style={styles.calendarBody}>
                <WeekTimetable
                  courses={courses}
                  weekDates={weekDates}
                  weekOffset={weekOffset}
                  onSelectCourse={setSelectedCourse}
                  onSelectDay={openDay}
                  onSwipeLeft={goToNextWeek}
                  onSwipeRight={goToPrevWeek}
                  onGoToToday={goToToday}
                />
                {status === 'empty' && (
                  <View style={styles.overlay} pointerEvents="none">
                    <EmptyState
                      title="No events this week"
                      message="Your Blackboard calendar has no events for this week."
                      icon="calendar"
                    />
                  </View>
                )}
              </View>
            )}

            {status === 'unauthorized' && (
              <EmptyState
                title="Not signed in"
                message="Development session token is missing or expired."
                icon="lock.shield"
              />
            )}

            {status === 'error' && (
              <EmptyState
                title="Couldn't load calendar"
                message="Check that the backend is reachable and try again."
                icon="exclamationmark.triangle"
                actionLabel="Retry"
                onAction={retry}
              />
            )}
          </>
        )}

        {view === 'day' && (
          <>
            {status === 'loading' && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            )}

            {(status === 'success' || status === 'empty') && (
              <View style={styles.calendarBody}>
                <DayView
                  selectedDate={selectedDay}
                  courses={courses}
                  onSelectCourse={setSelectedCourse}
                  onPreviousDay={goToPrevDay}
                  onNextDay={goToNextDay}
                  onGoToToday={goToToday}
                />
              </View>
            )}

            {status === 'unauthorized' && (
              <EmptyState
                title="Not signed in"
                message="Development session token is missing or expired."
                icon="lock.shield"
              />
            )}

            {status === 'error' && (
              <EmptyState
                title="Couldn't load calendar"
                message="Check that the backend is reachable and try again."
                icon="exclamationmark.triangle"
                actionLabel="Retry"
                onAction={retry}
              />
            )}
          </>
        )}

        {view === 'month' && (
          <EmptyState
            title="Month view"
            message="Coming soon. Switch to Week or Day to see your timetable."
            icon="calendar"
          />
        )}
      </ScreenWrapper>

      <CourseDetailOverlay course={selectedCourse} onClose={() => setSelectedCourse(null)} />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarBody: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 120,
    left: 24,
    right: 24,
    zIndex: 10,
  },
});
