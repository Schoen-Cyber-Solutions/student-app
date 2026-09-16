import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { spacing, typography } from '@/constants/Theme';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import CalendarViewSwitcher, { CalendarView } from '@/components/CalendarViewSwitcher';
import WeekTimetable from '@/components/WeekTimetable';
import DayView from '@/components/DayView';
import MonthView from '@/components/MonthView';
import CourseDetailOverlay from '@/components/CourseDetailOverlay';
import EmptyState from '@/components/EmptyState';
import { Course } from '@/types';
import { useMyCalendar } from '@/hooks/useMyCalendar';
import { MyCalendarEvent } from '@/services/api/calendar';
import { getCalendarStatus } from '@/services/api/me';
import { useCourseColors } from '@/hooks/useCourseColors';
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

function eventColor(event: MyCalendarEvent, courseColors: Record<string, string>): string | undefined {
  if (event.provider === 'personal') return event.color ?? colorForKey(event.title);
  const key = event.courseCode ?? event.title;
  return courseColors[key] ?? colorForKey(key);
}

function toTimetableCourse(event: MyCalendarEvent, courseColors: Record<string, string>): Course {
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
    color: eventColor(event, courseColors),
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
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean } | null>(null);
  const colors = Colors[useColorScheme()];
  const { colors: courseColors } = useCourseColors();

  const loadCalendarStatus = useCallback(async () => {
    try {
      const s = await getCalendarStatus();
      setCalendarStatus({ connected: s.connected });
    } catch {
      setCalendarStatus({ connected: true }); // assume connected if status fails
    }
  }, []);

  useEffect(() => {
    void loadCalendarStatus();
  }, [loadCalendarStatus]);

  const todayMonday = useMemo(() => getMondayOfWeek(new Date()), []);
  const baseMonday = new Date(todayMonday);
  baseMonday.setDate(todayMonday.getDate() + weekOffset * 7);
  const weekDates = getWeekDayDates(baseMonday);

  const range = useMemo(() => {
    if (view === 'month') {
      const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
      const lastOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
      const gridStart = getMondayOfWeek(firstOfMonth);
      const gridEndMonday = getMondayOfWeek(lastOfMonth);
      const gridEnd = new Date(gridEndMonday);
      gridEnd.setDate(gridEndMonday.getDate() + 6);
      return {
        from: startOfDay(gridStart).toISOString(),
        to: endOfDay(gridEnd).toISOString(),
      };
    }
    const from = startOfDay(weekDates[0]).toISOString();
    const to = endOfDay(weekDates[weekDates.length - 1]).toISOString();
    return { from, to };
  }, [view, monthCursor, weekDates]);

  const { status, events, retry } = useMyCalendar(range);
  const courses = useMemo(() => events.map((e) => toTimetableCourse(e, courseColors)), [events, courseColors]);

  const goToNextWeek = () => setWeekOffset((o) => o + 1);
  const goToPrevWeek = () => setWeekOffset((o) => o - 1);
  const goToToday = () => {
    setWeekOffset(0);
    setSelectedDay(new Date());
    setMonthCursor(new Date());
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1);
    setMonthCursor(next);
    // Keep the selected day in sync with the displayed month.
    const daysInNext = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setSelectedDay(new Date(next.getFullYear(), next.getMonth(), Math.min(selectedDay.getDate(), daysInNext)));
  };

  const selectMonthDate = (date: Date) => {
    setSelectedDay(date);
    // Keep the week view in sync if the user switches back.
    setWeekOffset(
      Math.round(
        (getMondayOfWeek(date).getTime() - todayMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
    );
    if (date.getMonth() !== monthCursor.getMonth() || date.getFullYear() !== monthCursor.getFullYear()) {
      setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const handleSelectEvent = (event: MyCalendarEvent) => {
    if (event.provider === 'personal') {
      router.push({
        pathname: '/calendar-event',
        params: { id: event.id, date: event.startAt },
      });
    } else {
      setSelectedCourse(toTimetableCourse(event, courseColors));
    }
  };

  const handleViewChange = (v: CalendarView) => {
    if (v === 'month') {
      setMonthCursor(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1));
    } else {
      setWeekOffset(
        Math.round(
          (getMondayOfWeek(selectedDay).getTime() - todayMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
        )
      );
    }
    setView(v);
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
        {calendarStatus && !calendarStatus.connected && (
          <View style={[styles.banner, { backgroundColor: colors.tintSoft, borderColor: colors.tint }]}>
            <Text style={[styles.bannerText, { color: colors.text }]}>
              University calendar not connected
            </Text>
            <Pressable onPress={() => router.push('/calendar-connect')}>
              <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>Connect</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.header}>
          <Pressable
            onPress={() => router.push('/calendar-edit')}
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>Edit</Text>
          </Pressable>
          <CalendarViewSwitcher active={view} onChange={handleViewChange} />
          <View style={styles.editSpacer} />
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
                      message="Your calendar has no events for this week."
                      icon="calendar"
                    />
                  </View>
                )}
              </View>
            )}

            {status === 'unauthorized' && (
              <EmptyState
                title="Not signed in"
                message="Your session is missing or expired. Sign in again."
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
                message="Your session is missing or expired. Sign in again."
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
          <>
            {(status === 'success' || status === 'empty' || status === 'loading') && (
              <MonthView
                monthCursor={monthCursor}
                selectedDate={selectedDay}
                events={events}
                colorForEvent={(e) => eventColor(e, courseColors)}
                onSelectDate={selectMonthDate}
                onPrevMonth={() => shiftMonth(-1)}
                onNextMonth={() => shiftMonth(1)}
                onGoToToday={goToToday}
                onSelectEvent={handleSelectEvent}
              />
            )}

            {status === 'unauthorized' && (
              <EmptyState
                title="Not signed in"
                message="Your session is missing or expired. Sign in again."
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
      </ScreenWrapper>

      <CourseDetailOverlay course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 4,
  },
  editButton: {
    minWidth: 44,
    paddingVertical: 4,
  },
  editSpacer: {
    minWidth: 44,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  bannerText: {
    ...typography.body,
    fontSize: 14,
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
