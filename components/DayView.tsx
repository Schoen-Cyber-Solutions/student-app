import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Course } from '@/types';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';
import { contrastText, glassColors, readableAccent } from '@/constants/Glass';
import { useCalendarAccent } from '@/utils/calendarAccent';
import { useColorScheme } from './useColorScheme';
import { useTextMode } from './TabTextMode';
import EmptyState from './EmptyState';
import GlassPanel from './GlassPanel';
import PagerStrip from './PagerStrip';
import TimetableCourseBlock, { HOUR_HEIGHT } from './TimetableCourseBlock';
import { timelineHourTicks } from '@/utils/calendarRange';
import {
  formatWeekdayShort,
  formatDayOfMonth,
  getMondayOfWeek,
  getWeekDayDates,
  getCoursesForDay,
  detectOverlaps,
  eventBlockSpan,
  MIN_EVENT_MINUTES,
  isSameCalendarDay,
} from '@/utils/time';

interface DayViewProps {
  selectedDate: Date;
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onCourseLongPress?: (course: Course) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onGoToToday?: () => void;
  onSelectDay?: (date: Date) => void;
  /** User-configured visible window, minutes after midnight. */
  startMin: number;
  endMin: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h = hour24 % 12 || 12;
  return `${h} ${period}`;
}

export default function DayView({
  selectedDate,
  courses,
  onSelectCourse,
  onCourseLongPress,
  onPreviousDay,
  onNextDay,
  onGoToToday,
  onSelectDay,
  startMin,
  endMin,
}: DayViewProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = glassColors(scheme, useCalendarAccent(), useTextMode());
  const today = new Date();
  const rangeMin = endMin - startMin;
  const pxPerMinute = HOUR_HEIGHT / 60;
  const timelineHeight = rangeMin * pxPerMinute;
  // Hour labels + grid lines at each whole-hour boundary inside the window,
  // plus the closing line at the bottom edge (endMin).
  const hourTicks = timelineHourTicks(startMin, endMin);

  // Each page's ScrollView opens around 9 AM. Slot-keyed pages keep their
  // own scroll position across rotations like a real pager; the callback is
  // stable so it only fires when a ScrollView actually mounts.
  const scrollToMorning = useCallback(
    (sv: ScrollView | null) => {
      if (!sv) return;
      requestAnimationFrame(() => {
        sv.scrollTo({ y: Math.max(0, (9 * 60 - startMin) * pxPerMinute), animated: false });
      });
    },
    [startMin, pxPerMinute],
  );

  /** Paging content for one day — a continuous 24h timeline where every
   *  event block is positioned by its real start time and sized by its
   *  real duration (same geometry as Week). The header and week strip are
   *  fixed chrome above the pager. */
  const renderDayContent = (date: Date) => {
    const dayName = formatWeekdayShort(date) as Course['days'][number];
    // Exact-date match — `courses` may hold events from adjacent weeks;
    // weekday-only matching would ghost them into this day.
    const dayCourses = getCoursesForDay(courses, dayName, date);
    const overlapSlots = detectOverlaps(dayCourses, MIN_EVENT_MINUTES);

    return dayCourses.length === 0 ? (
      <GlassPanel style={styles.gridPanel} intensity={25}>
        <EmptyState
          title="No events today"
          message="Your calendar has no events for this day."
          icon="calendar"
        />
      </GlassPanel>
    ) : (
      <GlassPanel style={styles.gridPanel} intensity={25} variant="faint">
      <ScrollView
        ref={scrollToMorning}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.timeline}>
          {/* Time gutter — labels sit just under their hour boundary line. */}
          <View style={[styles.gutter, { height: timelineHeight }]}>
            {hourTicks.map((hour) => (
              <Text
                key={hour}
                style={[
                  styles.hourLabel,
                  styles.gutterLabel,
                  { color: colors.secondaryText, top: (hour * 60 - startMin) * pxPerMinute },
                ]}>
                {formatHourLabel(hour)}
              </Text>
            ))}
          </View>

          {/* Day column — hour grid lines plus duration-positioned blocks. */}
          <View
            style={[
              styles.dayColumn,
              { borderLeftColor: colors.glassBorder, height: timelineHeight },
            ]}>
            {[...hourTicks.map((h) => h * 60), endMin].map((boundary) => (
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
            {dayCourses.map((course) => {
              const span = eventBlockSpan(course.startTime, course.endTime, startMin / 60, endMin / 60);
              if (!span) return null;
              const slot = overlapSlots.find((s) => s.courseId === course.id);
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
                  onPress={onSelectCourse}
                  onLongPress={onCourseLongPress}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
      </GlassPanel>
    );
  };

  const isToday = isSameCalendarDay(selectedDate, today);
  const weekDates = getWeekDayDates(getMondayOfWeek(selectedDate));

  return (
    <View style={styles.container}>
      {/* Fixed chrome — never slides during day paging. */}
      <GlassPanel style={styles.headerPanel} intensity={40}>
      <View style={styles.header}>
          <Pressable
            onPress={onPreviousDay}
            style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Previous day">
            <SymbolView name="chevron.left" tintColor={colors.accent} size={22} />
          </Pressable>

          <View style={styles.title}>
            <Text style={[styles.weekday, { color: readableAccent(colors.accent, scheme) }]}>
              {formatWeekdayShort(selectedDate)}
            </Text>
            <Text style={[styles.date, { color: colors.secondaryText }]}>
              {selectedDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            {isToday ? (
              <View style={[styles.todayPill, { backgroundColor: colors.accent }]}>
                <Text style={[styles.todayText, { color: contrastText(colors.accent) }]}>
                  Today
                </Text>
              </View>
            ) : onGoToToday ? (
              <Pressable
                onPress={onGoToToday}
                style={({ pressed }) => [
                  styles.todayPill,
                  { backgroundColor: colors.accentSoft },
                  pressed && { opacity: 0.8 },
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Go to today">
                <Text style={[styles.todayText, { color: colors.accent }]}>
                  Today
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={onNextDay}
            style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Next day">
            <SymbolView name="chevron.right" tintColor={colors.accent} size={22} />
          </Pressable>
        </View>
        </GlassPanel>

        {/* Horizontal week strip — tap a day to switch. */}
        <GlassPanel style={styles.stripPanel} intensity={40}>
        <View style={styles.weekStrip}>
          {weekDates.map((weekDate) => {
            const selected = isSameCalendarDay(weekDate, selectedDate);
            const isStripToday = isSameCalendarDay(weekDate, today);
            return (
              <Pressable
                key={weekDate.toDateString()}
                onPress={() => onSelectDay?.(weekDate)}
                style={({ pressed }) => [
                  styles.stripDay,
                  selected && {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accent,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Open ${weekDate.toDateString()}`}>
                <Text
                  style={[
                    styles.stripWeekday,
                    { color: selected ? colors.accent : colors.secondaryText },
                  ]}>
                  {formatWeekdayShort(weekDate)}
                </Text>
                <View
                  style={[
                    styles.stripDateWrap,
                    isStripToday && { backgroundColor: colors.accent },
                  ]}>
                  <Text
                    style={[
                      styles.stripDate,
                      { color: isStripToday ? contrastText(colors.accent) : selected ? colors.accent : colors.text },
                    ]}>
                    {formatDayOfMonth(weekDate)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        </GlassPanel>

      {/* Only the day's content pages horizontally — header, week strip and
          screen chrome stay fixed. The parent swaps selectedDate after the
          snap completes, so the destination day stays mounted continuously. */}
      <PagerStrip
        style={styles.pager}
        position={selectedDate.getTime()}
        renderPage={(slot) =>
          renderDayContent(new Date(selectedDate.getTime() + slot * DAY_MS))
        }
        onSwipeLeft={onNextDay}
        onSwipeRight={onPreviousDay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  headerPanel: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stripPanel: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  arrow: {
    padding: spacing.sm,
  },
  title: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  weekday: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  date: {
    ...typography.caption,
    marginTop: 2,
  },
  todayPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 2,
    marginTop: 4,
  },
  todayText: {
    ...typography.caption,
    fontWeight: '700',
  },
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  stripDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 3,
  },
  stripWeekday: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  stripDateWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripDate: {
    ...typography.heading,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  gridPanel: {
    flex: 1,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  timeline: {
    flexDirection: 'row',
    paddingBottom: 96, // room for the floating add button
  },
  gutter: {
    width: 46,
    paddingRight: spacing.sm,
    position: 'relative',
  },
  gutterLabel: {
    position: 'absolute',
    right: spacing.sm,
    marginTop: 2,
  },
  hourLabel: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    marginRight: spacing.sm,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
