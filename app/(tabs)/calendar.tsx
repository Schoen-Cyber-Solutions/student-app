import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/Themed';
import { spacing, typography } from '@/constants/Theme';
import AppHeader from '@/components/AppHeader';
import CalendarViewSwitcher, { CalendarView } from '@/components/CalendarViewSwitcher';
import { DraggableFab } from '@/components/DraggableFab';
import WeekTimetable from '@/components/WeekTimetable';
import DayView from '@/components/DayView';
import MonthView from '@/components/MonthView';
import CourseDetailOverlay from '@/components/CourseDetailOverlay';
import EmptyState from '@/components/EmptyState';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import { useCalendarAccent } from '@/utils/calendarAccent';
import { refreshTabAppearance, useTabAppearance } from '@/utils/tabAppearanceStore';
import { glassColors } from '@/constants/Glass';
import { Course } from '@/types';
import { useMyCalendar } from '@/hooks/useMyCalendar';
import { CALENDAR_VIEW_PROVIDERS, MyCalendarEvent } from '@/services/api/calendar';
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
import { colorForKey, getCourseColor, COMPLETED_EVENT_COLOR } from '@/utils/courseLabel';
import { useColorScheme } from '@/components/useColorScheme';
import { TabTextModeProvider, useTextMode, useThemedColors } from '@/components/TabTextMode';

// Standard iOS tab-bar content height (the glass bar floats over the scene,
// so the FAB must clear it plus the home-indicator inset).
const TAB_BAR_HEIGHT = 49;

function eventColor(
  event: MyCalendarEvent,
  courseColors: Record<string, string>,
  colorMap?: Record<string, string>,
): string | undefined {
  // Completed LMS items render neutral gray everywhere — display override only,
  // the saved course color is never modified.
  if (event.isCompleted) return COMPLETED_EVENT_COLOR;
  if (event.provider === 'personal') return event.color ?? colorForKey(event.title);
  return getCourseColor(
    {
      courseSectionId: event.courseSectionId,
      courseCode: event.courseCode,
      courseName: event.courseName ?? event.title,
    },
    courseColors,
    colorMap,
  );
}

function toTimetableCourse(
  event: MyCalendarEvent,
  courseColors: Record<string, string>,
  colorMap?: Record<string, string>,
): Course {
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
    color: eventColor(event, courseColors, colorMap),
    date: start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    startAt: event.startAt,
    description: event.description ?? undefined,
    completed: event.isCompleted ?? false,
  };
}

export default function CalendarScreen() {
  return (
    <TabTextModeProvider tab="calendar">
      <CalendarScreenContent />
    </TabTextModeProvider>
  );
}

function CalendarScreenContent() {
  // Null until the saved default view is loaded — avoids flickering between
  // Week and the user's preference on a cold open.
  const [view, setView] = useState<CalendarView | null>(null);
  const suppressResetRef = useRef(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean } | null>(null);
  const appearance = useTabAppearance('calendar');
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const textMode = useTextMode();
  const colors = useThemedColors();
  const accent = useCalendarAccent();
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent, textMode);
  const { colors: courseColors, colorMap } = useCourseColors();

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
      void refreshTabAppearance();
      return () => {
        active = false;
      };
    }, [])
  );

  const todayMonday = useMemo(() => getMondayOfWeek(new Date()), []);
  const baseMonday = new Date(todayMonday);
  baseMonday.setDate(todayMonday.getDate() + weekOffset * 7);
  const weekDates = getWeekDayDates(baseMonday);

  /** ISO range covering the Mon–Sun grid of the month `delta` steps from
   *  monthCursor. */
  const monthGridRange = useCallback(
    (delta: number) => {
      const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1);
      const lastOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta + 1, 0);
      const gridStart = getMondayOfWeek(firstOfMonth);
      const gridEndMonday = getMondayOfWeek(lastOfMonth);
      const gridEnd = new Date(gridEndMonday);
      gridEnd.setDate(gridEndMonday.getDate() + 6);
      return {
        from: startOfDay(gridStart).toISOString(),
        to: endOfDay(gridEnd).toISOString(),
      };
    },
    [monthCursor]
  );

  const range = useMemo(() => {
    if (view === 'month') {
      // Fetch prev+current+next month grids — the month pager pre-renders
      // both neighbors so a swipe lands on loaded event dots.
      const prev = monthGridRange(-1);
      const next = monthGridRange(1);
      return { from: prev.from, to: next.to };
    }
    // Week view fetches the surrounding weeks too — the timetable pager
    // pre-renders previous/next pages so a swipe lands on loaded events.
    const rangeStart = new Date(weekDates[0]);
    rangeStart.setDate(rangeStart.getDate() - 7);
    const rangeEnd = new Date(weekDates[weekDates.length - 1]);
    rangeEnd.setDate(rangeEnd.getDate() + 7);
    return {
      from: startOfDay(rangeStart).toISOString(),
      to: endOfDay(rangeEnd).toISOString(),
    };
  }, [view, monthCursor, weekDates, monthGridRange]);

  // Ranges to warm after each load — the windows a pager swipe would land on
  // next. Week/day ranges slide by exactly 7 days; month pages slide one
  // month-grid each way (the fetch range already covers ±1 month, so ±2
  // grids are the newly exposed pages).
  const prefetchRanges = useMemo(() => {
    if (view === 'month') {
      return [monthGridRange(-2), monthGridRange(2)];
    }
    const step = 7 * 24 * 60 * 60 * 1000;
    return [-1, 1].map((dir) => ({
      from: new Date(Date.parse(range.from) + dir * step).toISOString(),
      to: new Date(Date.parse(range.to) + dir * step).toISOString(),
    }));
  }, [view, monthGridRange, range.from, range.to]);

  // The Calendar shows class meetings + personal events only; LMS
  // assignment/due events are excluded at the API layer (Home's Due list
  // still receives them via its own unfiltered fetch).
  // After each load, the hook silently prefetches the adjacent page windows
  // (next/prev week for Week/Day, next/prev month grid for Month) so pager
  // navigation never waits on the network — stale-while-revalidate keeps
  // the current page mounted either way.
  const { status, events, retry, refresh } = useMyCalendar(range, {
    providers: CALENDAR_VIEW_PROVIDERS,
    prefetchRanges,
  });
  const courses = useMemo(() => events.map((e) => toTimetableCourse(e, courseColors, colorMap)), [events, courseColors, colorMap]);
  // Resolve the selected event from the live list so course-assignment edits
  // (and re-syncs) re-render the detail overlay automatically.
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const selectedCourse = useMemo(
    () => (selectedEvent ? toTimetableCourse(selectedEvent, courseColors, colorMap) : null),
    [selectedEvent, courseColors, colorMap]
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

  const openAddSheet = () => {
    const handle = (index: number) => {
      if (index === 0) {
        suppressResetRef.current = true;
        router.push('/calendar-event');
      } else if (index === 1) {
        suppressResetRef.current = true;
        router.push('/calendar-edit');
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Add Personal Event', 'Edit Calendar', 'Cancel'], cancelButtonIndex: 2 },
        handle,
      );
    } else {
      Alert.alert('Calendar', undefined, [
        { text: 'Add Personal Event', onPress: () => handle(0) },
        { text: 'Edit Calendar', onPress: () => handle(1) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CalendarBackground appearance={appearance} />
      <AppHeader safeAreaTop greeting="Calendar" titleLeft accent={accent} />
      {/* Transparent container — ScreenWrapper paints an opaque themed
          background that would cover CalendarBackground. */}
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.content}>
        {calendarStatus && !calendarStatus.connected && (
          <View style={[styles.banner, { backgroundColor: glass.accentSoft, borderColor: glass.accent }]}>
            <Text style={[styles.bannerText, { color: colors.text }]}>
              University calendar not connected
            </Text>
            <Pressable
              onPress={() => {
                suppressResetRef.current = true;
                router.push('/calendar-connect');
              }}>
              <Text style={{ color: glass.accent, fontWeight: '600', fontSize: 14 }}>Connect</Text>
            </Pressable>
          </View>
        )}

        {/* Compact glass segmented control — date context lives in each
            view's own header (week label / day heading / month label). */}
        {view !== null && (
          <View style={styles.switcherWrap}>
            <CalendarViewSwitcher active={view} onChange={handleViewChange} />
          </View>
        )}

        {view === null && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        )}

        {view === 'week' && (
          <>
            {status === 'loading' && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={accent} />
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
                <ActivityIndicator size="large" color={accent} />
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
                  onSelectDay={setSelectedDay}
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
                colorForEvent={(e) => eventColor(e, courseColors, colorMap)}
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
      </View>
      </SafeAreaView>

      <CourseDetailOverlay
        course={selectedCourse}
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        onEventChanged={refresh}
      />

      {/* Floating add button — draggable, persists its position. */}
      <DraggableFab
        colors={[glass.accent, glass.accentDark]}
        bottomBase={insets.bottom + TAB_BAR_HEIGHT + 14}
        topInset={insets.top}
        bottomKeepout={insets.bottom + TAB_BAR_HEIGHT}
        shadowColor={accent}
        onPress={openAddSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  switcherWrap: {
    marginTop: spacing.xs,
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
