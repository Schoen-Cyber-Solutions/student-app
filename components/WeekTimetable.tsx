import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import TimetableCourseBlock from './TimetableCourseBlock';
import { timelineHourTicks } from '@/utils/calendarRange';
import { campusSourceFallbackTitle } from '@/utils/campusSource';
import {
  getMondayOfWeek,
  getWeekDayDates,
  getCoursesForDay,
  eventBlockSpan,
  MIN_EVENT_MINUTES,
  detectOverlaps,
  isSameCalendarDay,
  formatWeekdayShort,
  formatDayOfMonth,
  formatWeekLabel,
  isoWeekNumber,
  weekStartAtPage,
  weekPageIndex,
  WEEK_PAGE_COUNT,
} from '@/utils/time';

interface WeekTimetableProps {
  courses: Course[];
  /** The authoritative visible week — a Monday. Header, pager position and
   *  event data all derive from this single value. */
  weekStart: Date;
  /** Fired when a swipe settles on a different week page. */
  onWeekChange?: (weekStart: Date) => void;
  onSelectCourse?: (course: Course) => void;
  onCourseLongPress?: (course: Course) => void;
  onSelectDay?: (date: Date) => void;
  onGoToToday?: () => void;
  /** User-configured visible window, minutes after midnight. The whole
   *  range is scaled to fit the screen; no vertical scroll. */
  startMin: number;
  endMin: number;
}

const GUTTER_WIDTH = 44;

// Weekends carry far fewer classes — give them less width than Mon–Fri.
const WEEKEND_WEIGHT = 0.62;

export default function WeekTimetable({
  courses,
  weekStart,
  onWeekChange,
  onSelectCourse,
  onCourseLongPress,
  onSelectDay,
  onGoToToday,
  startMin,
  endMin,
}: WeekTimetableProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = glassColors(scheme, useCalendarAccent(), useTextMode());
  const today = new Date();
  const rangeMin = endMin - startMin;
  const hourTicks = timelineHourTicks(startMin, endMin);

  // ── Week pager ─────────────────────────────────────────────────────────
  // A finite paged list of real weeks around today — one page per actual
  // week Monday, keyed by its own ISO date. A page's identity never changes
  // underneath it: after a swipe the visible page IS the destination week,
  // and there is no post-settle recenter to race against. The header and
  // every page derive from the same authoritative `weekStart`.
  const anchorMonday = useMemo(() => getMondayOfWeek(new Date()), []);
  const headerDates = useMemo(() => getWeekDayDates(weekStart), [weekStart]);
  const initialIndex = useMemo(
    () => Math.max(0, weekPageIndex(weekStart, anchorMonday)),
    // Initial mount position only — later moves go through scroll effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const listRef = useRef<FlatList<number>>(null);
  const visibleIndex = useRef(initialIndex);
  const [pageWidth, setPageWidth] = useState(0);

  // Programmatic week changes (Today button, month-date select, view
  // switch, day-pager week crossing) scroll the list directly to that
  // week's own page — never a buffer swap.
  useEffect(() => {
    const target = weekPageIndex(weekStart, anchorMonday);
    if (pageWidth <= 0 || target < 0 || target === visibleIndex.current) return;
    visibleIndex.current = target;
    listRef.current?.scrollToIndex({ index: target, animated: true });
  }, [weekStart, anchorMonday, pageWidth]);

  // A settled swipe lands on exactly one week page — report that page's
  // own Monday so the parent cursor follows the visible page.
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      const clamped = Math.max(0, Math.min(WEEK_PAGE_COUNT - 1, idx));
      if (clamped === visibleIndex.current) return;
      visibleIndex.current = clamped;
      onWeekChange?.(weekStartAtPage(clamped, anchorMonday));
    },
    [pageWidth, anchorMonday, onWeekChange]
  );

  // Measured height of the grid region — events and hour lines scale to fit.
  const [gridHeight, setGridHeight] = useState(0);
  const pxPerMinute = gridHeight > 0 ? gridHeight / rangeMin : 0;

  const [nowMinutes, setNowMinutes] = useState(
    today.getHours() * 60 + today.getMinutes()
  );

  // Per-page day→courses index. Events without an end time are real
  // personal events — they render as default-duration blocks, never as
  // "Due (N)" point clusters (LMS due items never reach this view).
  const buildDayCourses = useCallback(
    (dates: Date[]) =>
      dates.map((date) =>
        // Exact-date match (Course.startAt) — weekday-name matching alone
        // would repeat each meeting on the same weekday of adjacent pages.
        getCoursesForDay(courses, formatWeekdayShort(date) as Course['days'][number], date)
      ),
    [courses]
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

  const showNow = nowMinutes >= startMin && nowMinutes <= endMin;
  const nowTop = showNow ? (nowMinutes - startMin) * pxPerMinute : 0;

  const handleGridLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setGridHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
  }, []);

  const colWeight = (date: Date) =>
    date.getDay() === 0 || date.getDay() === 6 ? WEEKEND_WEIGHT : 1;

  /** One week page — day headers (with the page's own ISO week number over
   *  the time gutter) plus the timetable grid. Everything derives from the
   *  page's own Monday: dates, week number, today column, and events. */
  const renderPage = (monday: Date) => {
    const dates = getWeekDayDates(monday);
    const coursesByDay = buildDayCourses(dates);
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

        {/* Grid region — measured via onLayout (identical on every page);
            everything inside scales to fit the configured visible window. */}
        <View
          style={styles.gridArea}
          onLayout={handleGridLayout}>
          <View style={styles.gridRow}>
            {/* Time gutter — inside the page so the axis slides with the week.
                Labels sit just under their hour boundary line. */}
            <View style={[styles.gutter, { width: GUTTER_WIDTH }]}>
              {gridHeight > 0 &&
                hourTicks.map((hour) => (
                  <Text
                    key={hour}
                    style={[
                      styles.hourLabel,
                      styles.gutterLabel,
                      {
                        color: colors.secondaryText,
                        top: (hour * 60 - startMin) * pxPerMinute,
                      },
                    ]}
                    numberOfLines={1}>
                    {formatHourLabel(hour)}
                  </Text>
                ))}
            </View>

            {/* Day columns — weighted Mon–Fri > Sat–Sun. */}
            <View style={styles.dayColumns}>
              {dates.map((date, colIndex) => {
                const dayCourses = coursesByDay[colIndex];
                const overlapSlots = detectOverlaps(dayCourses, MIN_EVENT_MINUTES);
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
                    {/* Hour grid lines — one per boundary tick plus the
                        closing line at the bottom edge (endMin). */}
                    {gridHeight > 0 &&
                      [...hourTicks.map((h) => h * 60), endMin].map((boundary) => (
                        <View
                          key={boundary}
                          style={[
                            styles.hourLine,
                            {
                              top: (boundary - startMin) * pxPerMinute,
                              borderBottomColor: colors.glassBorder,
                            },
                          ]}
                        />
                      ))}

                    {/* Course blocks — clamped into the configured window so
                        out-of-range events surface as edge slivers instead of
                        breaking the layout. Position and height derive from
                        the event's real start/end times; events without an
                        end time get the documented default duration. */}
                    {gridHeight > 0 &&
                      dayCourses.map((course) => {
                        const span = eventBlockSpan(
                          course.startTime,
                          course.endTime,
                          startMin / 60,
                          endMin / 60
                        );
                        if (!span) return null;

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
                            top={span.startMin * pxPerMinute}
                            height={span.durationMin * pxPerMinute}
                            widthPercent={widthPercent}
                            leftPercent={leftPercent}
                            compact
                            // Week-only label when a saved campus event's
                            // title can't render — the stored title is
                            // untouched (Day/Month/detail keep it).
                            fallbackTitle={
                              course.isCampusEvent
                                ? campusSourceFallbackTitle(course.campusSource)
                                : undefined
                            }
                            onPress={(c) => onSelectCourse?.(c)}
                            onLongPress={(c) => onCourseLongPress?.(c)}
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
          {formatWeekLabel(headerDates)}
        </Text>
        <View style={styles.sideSpacer}>
          {!isSameCalendarDay(weekStart, anchorMonday) && (
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

      {/* Calendar viewport: a native paged list where every page is a real
          week — snapToInterval + disableIntervalMomentum gives 1:1 finger
          following that always settles on exactly one week, and
          onMomentumScrollEnd reports the page actually left visible.
          No post-swipe recenter: the visible page keeps its own identity.
          The full 07:00–24:00 day fits — no vertical scroll. */}
      <View
        style={styles.viewport}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setPageWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
        }}>
        <GlassPanel style={styles.gridPanel} intensity={25} variant="faint">
          {pageWidth > 0 ? (
            <FlatList
              ref={listRef}
              data={PAGE_INDICES}
              horizontal
              // Exactly one page per gesture — a fast flick can never skip
              // a week.
              snapToInterval={pageWidth}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              showsHorizontalScrollIndicator={false}
              // Each page's key is its own week — React never recycles a
              // visible page into a different week.
              keyExtractor={(i) => weekStartAtPage(i, anchorMonday).toISOString()}
              getItemLayout={(_, i) => ({
                length: pageWidth,
                offset: pageWidth * i,
                index: i,
              })}
              initialScrollIndex={initialIndex}
              onMomentumScrollEnd={handleMomentumEnd}
              onScrollToIndexFailed={({ index }) =>
                listRef.current?.scrollToOffset({
                  offset: index * pageWidth,
                  animated: true,
                })
              }
              // Only the visible page plus immediate neighbors mount —
              // swipe lands on already-rendered weeks, no loading state.
              windowSize={3}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              renderItem={({ index }) => (
                <View style={{ width: pageWidth }}>
                  {renderPage(weekStartAtPage(index, anchorMonday))}
                </View>
              )}
            />
          ) : (
            // First layout pass hasn't measured yet — render the current
            // week alone so there's no empty flash.
            <View style={styles.page}>{renderPage(weekStart)}</View>
          )}
        </GlassPanel>
      </View>
    </View>
  );
}

const PAGE_INDICES: number[] = Array.from({ length: WEEK_PAGE_COUNT }, (_, i) => i);

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
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gutterLabel: {
    position: 'absolute',
    right: 6,
    marginTop: 2,
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
