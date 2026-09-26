import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
import { getCalendarStatus, getPreferences } from '@/services/api/me';
import { useCourseColors } from '@/hooks/useCourseColors';
import {
  getMondayOfWeek,
  getWeekDayDates,
  startOfDay,
  endOfDay,
  formatWeekdayShort,
  formatTime12,
} from '@/utils/time';
import { colorForKey, COMPLETED_EVENT_COLOR } from '@/utils/courseLabel';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function eventColor(event: MyCalendarEvent, courseColors: Record<string, string>): string | undefined {
  // Completed LMS items render neutral gray everywhere — display override only,
  // the saved course color is never modified.
  if (event.isCompleted) return COMPLETED_EVENT_COLOR;
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
    completed: event.isCompleted ?? false,
  };
}

export default function CalendarScreen() {
  // Null until the saved default view is loaded — avoids flickering between
  // Week and the user's preference on a cold open.
  const [view, setView] = useState<CalendarView | null>(null);
  const suppressResetRef = useRef(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
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

  // Apply the saved default view at the start of each Calendar visit. Focus
  // also fires when returning from a pushed screen (event detail / edit /
  // connect) — those pushes set suppressResetRef so the user's in-flight
  // view choice survives.
  useFocusEffect(
    useCallback(() => {
      if (suppressResetRef.current) {
        suppressResetRef.current = false;
        return;
      }
      let active = true;
      getPreferences()
        .then(({ preferences }) => {
          if (active) setView(preferences.defaultCalendarView);
        })
        .catch(() => {
          if (active) setView((v) => v ?? 'week');
        });
      return () => {
        active = false;
      };
    }, [])
  );

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

  const { status, events, retry, refresh } = useMyCalendar(range);
  const courses = useMemo(() => events.map((e) => toTimetableCourse(e, courseColors)), [events, courseColors]);
  // Resolve the selected event from the live list so course-assignment edits
  // (and re-syncs) re-render the detail overlay automatically.
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const selectedCourse = useMemo(
    () => (selectedEvent ? toTimetableCourse(selectedEvent, courseColors) : null),
    [selectedEvent, courseColors]
  );

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
      suppressResetRef.current = true;
      router.push({
        pathname: '/calendar-event',
        params: { id: event.id, date: event.startAt },
      });
    } else {
      setSelectedEventId(event.id);
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
            <Pressable
              onPress={() => {
                suppressResetRef.current = true;
                router.push('/calendar-connect');
              }}>
              <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>Connect</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.header}>
          <Pressable
            onPress={() => {
              suppressResetRef.current = true;
              router.push('/calendar-edit');
            }}
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>Edit</Text>
          </Pressable>
          {view !== null && <CalendarViewSwitcher active={view} onChange={handleViewChange} />}
          <View style={styles.editSpacer} />
        </View>

        {view === null && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        )}

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
                  onSelectCourse={(c) => setSelectedEventId(c.id)}
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
                  onSelectCourse={(c) => setSelectedEventId(c.id)}
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

      <CourseDetailOverlay
        course={selectedCourse}
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        onEventChanged={refresh}
      />
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
