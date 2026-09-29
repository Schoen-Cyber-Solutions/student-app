import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { Course } from '@/types';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';
import { contrastText, glassColors, readableAccent } from '@/constants/Glass';
import { useCalendarAccent } from '@/utils/calendarAccent';
import { useColorScheme } from './useColorScheme';
import { useTextMode } from './TabTextMode';
import GlassPanel from './GlassPanel';
import PagerStrip from './PagerStrip';
import TimetableCourseBlock from './TimetableCourseBlock';
import {
  getCoursesForDay,
  getHourRange,
  toMinutes,
  detectOverlaps,
  isSameCalendarDay,
  formatWeekdayShort,
  formatDayOfMonth,
  formatWeekLabel,
  isoWeekNumber,
} from '@/utils/time';

interface WeekTimetableProps {
  courses: Course[];
  weekDates: Date[];
  weekOffset: number;
  onSelectCourse?: (course: Course) => void;
  onSelectDay?: (date: Date) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onGoToToday?: () => void;
}

const GUTTER_WIDTH = 44;
// Student-day window — the whole range fits the screen; no vertical scroll.
const START_HOUR = 7;
const END_HOUR = 24;
const RANGE_MINUTES = (END_HOUR - START_HOUR) * 60;
// Point-in-time and very short events still get a readable block.
const MIN_EVENT_MINUTES = 40;
// Weekends carry far fewer classes — give them less width than Mon–Fri.
const WEEKEND_WEIGHT = 0.62;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function WeekTimetable({
  courses,
  weekDates,
  weekOffset,
  onSelectCourse,
  onSelectDay,
  onSwipeLeft,
  onSwipeRight,
  onGoToToday,
}: WeekTimetableProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = glassColors(scheme, useCalendarAccent(), useTextMode());
  const today = new Date();
  const hours = getHourRange(START_HOUR, END_HOUR);

  // ── Pager pages ────────────────────────────────────────────────────────
  // Three week pages: previous | current | next. PagerStrip owns the
  // measured width, finger-following transform, and commit/snap-back; the
  // re-center on weekOffset change is invisible because the settled page's
  // content is already the center page.
  const pageDates = useMemo(
    () => [
      weekDates.map((d) => new Date(d.getTime() - WEEK_MS)),
      weekDates,
      weekDates.map((d) => new Date(d.getTime() + WEEK_MS)),
    ],
    [weekDates]
  );

  // Measured height of the grid region — events and hour lines scale to fit.
  const [gridHeight, setGridHeight] = useState(0);
  const pxPerMinute = gridHeight > 0 ? gridHeight / RANGE_MINUTES : 0;

  const [nowMinutes, setNowMinutes] = useState(
    today.getHours() * 60 + today.getMinutes()
  );

  // Cluster simultaneous point-in-time due events so the Week view stays
  // readable. Built per page — shared memo so the strip never recomputes
  // during a drag.
  const buildDayCourses = useCallback(
    (dates: Date[]) =>
      dates.map((date) => {
        const dayName = formatWeekdayShort(date) as Course['days'][number];
        // Exact-date match (Course.startAt) — the pager fetches ±1 week of
        // events, so weekday-name matching alone would repeat each meeting
        // on the same weekday of the neighboring pages.
        const dayCourses = getCoursesForDay(courses, dayName, date);
        const pointEvents = dayCourses.filter((c) => !c.endTime);
        const timedEvents = dayCourses.filter((c) => c.endTime);

        const byStart = new Map<string, Course[]>();
        for (const c of pointEvents) {
          const list = byStart.get(c.startTime) ?? [];
          list.push(c);
          byStart.set(c.startTime, list);
        }

        const clustered: Course[] = [];
        for (const [startTime, group] of byStart.entries()) {
          if (group.length === 1) {
            clustered.push(group[0]);
          } else {
            clustered.push({
              id: `cluster-${date.toISOString()}-${startTime}`,
              name: `Due (${group.length})`,
              code: '',
              instructor: '',
              instructorEmail: '',
              location: '',
              startTime,
              endTime: '',
              days: [dayName],
              color: colors.urgent,
              isCluster: true,
              clusterCount: group.length,
              date: date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              }),
            });
          }
        }

        return [...timedEvents, ...clustered].sort(
          (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
        );
      }),
    [courses, colors.urgent]
  );

  const pageCourses = useMemo(
    () => pageDates.map(buildDayCourses),
    [pageDates, buildDayCourses]
  );

  // Current-time ticker
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const showNow = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;
  const nowTop = showNow ? (nowMinutes - START_HOUR * 60) * pxPerMinute : 0;

  const handleGridLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setGridHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
  }, []);

  const colWeight = (date: Date) =>
    date.getDay() === 0 || date.getDay() === 6 ? WEEKEND_WEIGHT : 1;

  /** One page of the week pager — day headers (with the page's own ISO week
   *  number over the time gutter) plus the timetable grid. `slot` is the
   *  stable pager slot (-1/0/1), not the date — pages keyed by slot never
   *  remount when the buffer rotates. */
  const renderPage = (dates: Date[], coursesByDay: Course[][], slot: number) => {
    const weekNumber = isoWeekNumber(dates[0]);
    const todayColIndex = dates.findIndex((d) => isSameCalendarDay(d, today));
    const pageHasToday = todayColIndex >= 0;

    return (
      <View style={styles.page}>
        <View style={styles.headerRow}>
          {/* ISO week number sits left of Monday, aligned over the time axis. */}
          <View style={[styles.gutter, styles.kwCell, { width: GUTTER_WIDTH }]}>
            <Text style={[styles.kwLabel, { color: colors.secondaryText }]}>Week</Text>
            <Text style={[styles.kwNumber, { color: colors.accent }]}>{weekNumber}</Text>
          </View>
          {dates.map((date) => {
            const isToday = isSameCalendarDay(date, today);
            return (
              <Pressable
                key={date.toISOString()}
                onPress={() => onSelectDay?.(date)}
                style={({ pressed }) => [
                  styles.dayCol,
                  styles.dayHeaderPress,
                  { flex: colWeight(date) },
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open day view for ${date.toDateString()}`}>
                <Text
                  style={[
                    styles.dayHeader,
                    { color: isToday ? colors.accent : colors.secondaryText },
                  ]}
                  numberOfLines={1}>
                  {formatWeekdayShort(date)}
                </Text>
                <View
                  style={[
                    styles.datePill,
                    isToday && { backgroundColor: colors.accent },
                  ]}>
                  <Text
                    style={[
                      styles.dateHeader,
                      { color: isToday ? contrastText(colors.accent) : colors.accent },
                    ]}>
                    {formatDayOfMonth(date)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Grid region — measured once via onLayout on the center page;
            everything inside scales to fit the full 07:00–24:00 window. */}
        <View
          style={styles.gridArea}
          onLayout={slot === 0 ? handleGridLayout : undefined}>
          <View style={styles.gridRow}>
            {/* Time gutter — inside the page so the axis slides with the week. */}
            <View style={[styles.gutter, { width: GUTTER_WIDTH }]}>
              {hours.map((hour) => (
                <View
                  key={hour}
                  style={[
                    styles.hourCell,
                    { flex: 1, borderBottomColor: colors.glassBorder },
                  ]}>
                  <Text
                    style={[styles.hourLabel, { color: colors.secondaryText }]}
                    numberOfLines={1}>
                    {formatHourLabel(hour)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day columns — weighted Mon–Fri > Sat–Sun. */}
            <View style={styles.dayColumns}>
              {dates.map((date, colIndex) => {
                const dayCourses = coursesByDay[colIndex];
                const overlapSlots = detectOverlaps(dayCourses);
                const isToday = isSameCalendarDay(date, today);

                return (
                  <View
                    key={date.toISOString()}
                    style={[
                      styles.dayCol,
                      {
                        flex: colWeight(date),
                        borderLeftColor: colors.glassBorder,
                        backgroundColor: isToday
                          ? colors.accentSoft
                          : undefined,
                      },
                    ]}>
                    {/* Hour grid lines */}
                    {hours.map((hour) => (
                      <View
                        key={hour}
                        style={[
                          styles.hourCell,
                          {
                            flex: 1,
                            borderBottomColor: colors.glassBorder,
                          },
                        ]}
                      />
                    ))}

                    {/* Course blocks — clamped into the 07:00–24:00 window so
                        out-of-range events surface as edge slivers instead of
                        breaking the layout. */}
                    {gridHeight > 0 &&
                      dayCourses.map((course) => {
                        const rawStart = toMinutes(course.startTime);
                        const rawEnd = course.endTime
                          ? toMinutes(course.endTime)
                          : rawStart + MIN_EVENT_MINUTES;
                        if (
                          isNaN(rawStart) ||
                          rawEnd <= START_HOUR * 60 ||
                          rawStart >= END_HOUR * 60
                        ) {
                          return null;
                        }
                        const start = Math.max(rawStart, START_HOUR * 60);
                        const duration = Math.max(
                          isNaN(rawEnd) ? MIN_EVENT_MINUTES : rawEnd - start,
                          MIN_EVENT_MINUTES
                        );
                        const clampedEnd = Math.min(
                          start + duration,
                          END_HOUR * 60
                        );

                        const slot = overlapSlots.find(
                          (s) => s.courseId === course.id
                        );
                        const totalCols = slot?.totalColumns ?? 1;
                        const widthPercent = 100 / totalCols;
                        const leftPercent = (slot?.columnIndex ?? 0) * widthPercent;

                        return (
                          <TimetableCourseBlock
                            key={course.id}
                            course={course}
                            top={(start - START_HOUR * 60) * pxPerMinute}
                            height={(clampedEnd - start) * pxPerMinute}
                            widthPercent={widthPercent}
                            leftPercent={leftPercent}
                            compact
                            onPress={(c) =>
                              c.isCluster
                                ? onSelectDay?.(date)
                                : onSelectCourse?.(c)
                            }
                          />
                        );
                      })}
                  </View>
                );
              })}

              {/* Current-time line: starts exactly at the event-grid boundary
                  and spans all day columns — no text, just the accent rule
                  and its leading dot. The axis labels alone carry the time. */}
              {pageHasToday && showNow && gridHeight > 0 && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.currentTimeLine,
                    { top: nowTop, borderTopColor: colors.accent },
                  ]}>
                  <View
                    style={[
                      styles.currentTimeDot,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week label row */}
      <GlassPanel style={styles.weekPanel} intensity={40}>
      <View style={styles.weekRow}>
        <View style={styles.sideSpacer} />
        <Text
          style={[styles.weekLabel, { color: readableAccent(colors.accent, scheme) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}>
          {formatWeekLabel(weekDates)}
        </Text>
        <View style={styles.sideSpacer}>
          {weekOffset !== 0 && (
            <Pressable
              onPress={onGoToToday}
              style={({ pressed }) => [
                styles.todayButton,
                { backgroundColor: colors.accent },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go to today">
              <Text style={[styles.todayText, { color: contrastText(colors.accent) }]}>
                Today
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      </GlassPanel>

      {/* Calendar viewport: three pre-rendered week pages in a horizontal
          strip — drags move the strip 1:1, release settles to the adjacent
          page or springs back, and the parent swaps weekOffset only after
          the snap completes. The full 07:00–24:00 day fits — no scroll. */}
      <View style={styles.viewport}>
        <GlassPanel style={styles.gridPanel} intensity={25} variant="faint">
          <PagerStrip
            position={weekOffset}
            renderPage={(slot) =>
              renderPage(pageDates[slot + 1], pageCourses[slot + 1], slot)
            }
            onSwipeLeft={onSwipeLeft}
            onSwipeRight={onSwipeRight}
          />
        </GlassPanel>
      </View>
    </View>
  );
}

function formatHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h = hour24 % 12 || 12;
  return `${h} ${period}`;
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewport: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  gridArea: {
    flex: 1,
    overflow: 'hidden',
  },
  dayColumns: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    zIndex: 15,
  },
  currentTimeDot: {
    position: 'absolute',
    left: -3,
    top: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  weekPanel: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 30,
    gap: spacing.sm,
  },
  weekLabel: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    flexShrink: 1,
  },
  sideSpacer: {
    minWidth: 62,
  },
  todayButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  todayText: {
    ...typography.label,
    fontWeight: '600',
  },
  kwCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  kwLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kwNumber: {
    ...typography.heading,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    flex: 1,
  },
  gutter: {
    // Small gap between the axis labels and the event grid — labels are
    // right-aligned so they sit adjacent to their hour lines.
    paddingRight: 6,
  },
  dayCol: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  dayHeaderPress: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayHeader: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  datePill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  dateHeader: {
    ...typography.heading,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  gridPanel: {
    flex: 1,
  },
  hourCell: {
    justifyContent: 'flex-start',
  },
  hourLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    alignSelf: 'stretch',
    textAlign: 'right',
  },
});
