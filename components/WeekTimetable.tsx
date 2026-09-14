import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  PanResponder,
  Animated,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Course } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import TimetableCourseBlock, { HOUR_HEIGHT } from './TimetableCourseBlock';
import {
  getCoursesForDay,
  getHourRange,
  toMinutes,
  durationMinutes,
  detectOverlaps,
  isSameCalendarDay,
  formatWeekdayShort,
  formatDayOfMonth,
  formatWeekLabel,
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

const GUTTER_WIDTH = 40;
const START_HOUR = 0;
const END_HOUR = 24;
const MIN_EVENT_MINUTES = 60;
const BOTTOM_SPACER = HOUR_HEIGHT * 2;
const SCROLL_TO_HOUR = 9;
const SWIPE_COMMIT_THRESHOLD = 55;
const SWIPE_START_THRESHOLD = 12;
const SWIPE_RATIO = 1.5;
const VELOCITY_THRESHOLD = 0.6;
const LIVE_DRAG_MULTIPLIER = 0.5;
const LIVE_DRAG_CAP = 40;
const ENTER_DISTANCE = 100;
const ENTER_DURATION = 150;
const SNAP_DURATION = 150;

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
  const colors = Colors[useColorScheme()];
  const today = new Date();
  const hours = getHourRange(START_HOUR, END_HOUR);
  const gridHeight = hours.length * HOUR_HEIGHT + BOTTOM_SPACER;

  const translateX = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [nowMinutes, setNowMinutes] = useState(
    today.getHours() * 60 + today.getMinutes()
  );

  // Cluster simultaneous point-in-time due events so the Week view stays readable.
  const displayCoursesByDay = useMemo(() => {
    return weekDates.map((date) => {
      const dayName = formatWeekdayShort(date) as Course['days'][number];
      const dayCourses = getCoursesForDay(courses, dayName);
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
    });
  }, [courses, weekDates, colors.urgent]);

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

  // Scroll to 9 AM on mount and whenever the week changes.
  // The offset is derived from HOUR_HEIGHT so the default viewport is consistent.
  useEffect(() => {
    const y = SCROLL_TO_HOUR * HOUR_HEIGHT;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
  }, [weekOffset]);

  const animateTo = useCallback(
    (value: number, duration: number, cb?: () => void) => {
      Animated.timing(translateX, {
        toValue: value,
        duration,
        useNativeDriver: false,
      }).start(cb);
    },
    [translateX]
  );

  const commitSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      const enter = direction === 'left' ? ENTER_DISTANCE : -ENTER_DISTANCE;
      translateX.setValue(enter);

      direction === 'left' ? onSwipeLeft?.() : onSwipeRight?.();

      animateTo(0, ENTER_DURATION, () => {
        isAnimating.current = false;
      });
    },
    [animateTo, onSwipeLeft, onSwipeRight, translateX]
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (isAnimating.current) return false;
        const { dx, dy } = gs;
        return (
          Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO &&
          Math.abs(dx) > SWIPE_START_THRESHOLD
        );
      },
      onPanResponderGrant: () => {
        setScrollEnabled(false);
      },
      onPanResponderMove: (_, gs) => {
        const raw = gs.dx * LIVE_DRAG_MULTIPLIER;
        const clamped = Math.max(-LIVE_DRAG_CAP, Math.min(LIVE_DRAG_CAP, raw));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        setScrollEnabled(true);
        const { dx, vx } = gs;
        const goingLeft =
          dx < -SWIPE_COMMIT_THRESHOLD ||
          (dx < -SWIPE_START_THRESHOLD && vx < -VELOCITY_THRESHOLD);
        const goingRight =
          dx > SWIPE_COMMIT_THRESHOLD ||
          (dx > SWIPE_START_THRESHOLD && vx > VELOCITY_THRESHOLD);

        if (goingLeft) {
          commitSwipe('left');
        } else if (goingRight) {
          commitSwipe('right');
        } else {
          isAnimating.current = true;
          animateTo(0, SNAP_DURATION, () => {
            isAnimating.current = false;
          });
        }
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
        isAnimating.current = true;
        animateTo(0, SNAP_DURATION, () => {
          isAnimating.current = false;
        });
      },
    })
  ).current;

  const isCurrentWeek = weekOffset === 0;
  const todayInWeek = isCurrentWeek
    ? weekDates.find((d) => isSameCalendarDay(d, today))
    : undefined;
  const todayColumnIndex = todayInWeek
    ? weekDates.findIndex((d) => isSameCalendarDay(d, today))
    : -1;

  const showCurrentTime =
    isCurrentWeek &&
    todayColumnIndex >= 0 &&
    nowMinutes >= START_HOUR * 60 &&
    nowMinutes <= END_HOUR * 60;

  const currentTimeTop = showCurrentTime
    ? ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT
    : 0;

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      setScrollY(e.nativeEvent.contentOffset.y);
    },
    []
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportHeight(e.nativeEvent.layout.height);
  }, []);

  const { hasBelow, nextBelow, hasAbove, nextAbove } = useMemo(() => {
    if (!viewportHeight || courses.length === 0) {
      return {
        hasBelow: false,
        nextBelow: undefined as Course | undefined,
        hasAbove: false,
        nextAbove: undefined as Course | undefined,
      };
    }
    const visibleStart = (scrollY / HOUR_HEIGHT) * 60;
    const visibleEnd = ((scrollY + viewportHeight) / HOUR_HEIGHT) * 60;

    const timed = courses.map((c) => {
      const start = toMinutes(c.startTime);
      const end = c.endTime ? toMinutes(c.endTime) : start;
      return { course: c, start, end };
    });

    const below = timed
      .filter(({ end }) => end > visibleEnd)
      .sort((a, b) => a.start - b.start);

    const above = timed
      .filter(({ start }) => start < visibleStart)
      .sort((a, b) => b.start - a.start);

    return {
      hasBelow: below.length > 0,
      nextBelow: below[0]?.course,
      hasAbove: above.length > 0,
      nextAbove: above[0]?.course,
    };
  }, [courses, scrollY, viewportHeight]);

  const scrollToNextBelow = useCallback(() => {
    if (!nextBelow) return;
    const y = (toMinutes(nextBelow.startTime) / 60) * HOUR_HEIGHT;
    scrollRef.current?.scrollTo({ y, animated: true });
  }, [nextBelow]);

  const scrollToNextAbove = useCallback(() => {
    if (!nextAbove) return;
    const y = Math.max(0, (toMinutes(nextAbove.startTime) / 60) * HOUR_HEIGHT);
    scrollRef.current?.scrollTo({ y, animated: true });
  }, [nextAbove]);

  return (
    <View style={styles.container}>
      {/* Week label row */}
      <View style={styles.weekRow}>
        <View style={styles.sideSpacer} />
        <Text
          style={[styles.weekLabel, { color: colors.text }]}
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
                { backgroundColor: colors.tint },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go to today">
              <Text style={styles.todayText}>Today</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Day header row */}
      <View style={styles.headerRow}>
        <View style={[styles.gutter, { width: GUTTER_WIDTH }]} />
        {weekDates.map((date) => {
          const isToday = isSameCalendarDay(date, today);
          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => onSelectDay?.(date)}
              style={({ pressed }) => [
                styles.dayCol,
                styles.dayHeaderPress,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open day view for ${date.toDateString()}`}>
              <Text
                style={[
                  styles.dayHeader,
                  { color: isToday ? colors.tint : colors.text },
                ]}>
                {formatWeekdayShort(date)}
              </Text>
              <Text
                style={[
                  styles.dateHeader,
                  { color: isToday ? colors.tint : colors.text },
                ]}>
                {formatDayOfMonth(date)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Calendar viewport: horizontal swipe + vertical scroll */}
      <View style={styles.viewport} {...panResponder.panHandlers}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onLayout={handleLayout}>
          <View style={[styles.gridRow, { height: gridHeight }]}>
            {/* Time gutter — STATIC, outside the animated area */}
            <View style={[styles.gutter, { width: GUTTER_WIDTH }]}>
              {hours.map((hour) => (
                <View
                  key={hour}
                  style={[
                    styles.hourCell,
                    { height: HOUR_HEIGHT, borderBottomColor: colors.cardBorder },
                  ]}>
                  <Text
                    style={[styles.hourLabel, { color: colors.mutedText }]}>
                    {formatHourLabel(hour)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day columns — ANIMATED, swipeable */}
            <Animated.View
              style={[
                styles.animatedContent,
                { flexDirection: 'row', transform: [{ translateX }] },
              ]}>
              {weekDates.map((date, colIndex) => {
                const dayName = formatWeekdayShort(
                  date
                ) as Course['days'][number];
                const dayCourses = displayCoursesByDay[colIndex];
                const overlapSlots = detectOverlaps(dayCourses);
                const isToday = isSameCalendarDay(date, today);

                return (
                  <View
                    key={date.toISOString()}
                    style={[
                      styles.dayCol,
                      {
                        borderLeftColor: colors.cardBorder,
                        backgroundColor: isToday
                          ? colors.tintSoft
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
                            height: HOUR_HEIGHT,
                            borderBottomColor: colors.cardBorder,
                          },
                        ]}
                      />
                    ))}

                    {/* Current time indicator */}
                    {showCurrentTime && colIndex === todayColumnIndex && (
                      <View
                        style={[
                          styles.currentTimeLine,
                          { top: currentTimeTop, borderTopColor: colors.tint },
                        ]}>
                        <View
                          style={[
                            styles.currentTimeDot,
                            { backgroundColor: colors.tint },
                          ]}
                        />
                      </View>
                    )}

                    {/* Course blocks */}
                    {dayCourses.map((course) => {
                      const slot = overlapSlots.find(
                        (s) => s.courseId === course.id
                      );
                      const top =
                        ((toMinutes(course.startTime) - START_HOUR * 60) /
                          60) *
                        HOUR_HEIGHT;
                      const rawDuration = course.endTime
                        ? durationMinutes(course.startTime, course.endTime)
                        : 0;
                      const displayDuration = Math.max(
                        isNaN(rawDuration) ? 0 : rawDuration,
                        MIN_EVENT_MINUTES
                      );
                      const height =
                        (displayDuration / 60) * HOUR_HEIGHT;

                      const totalCols = slot?.totalColumns ?? 1;
                      const colIndexSlot = slot?.columnIndex ?? 0;
                      const widthPercent = 100 / totalCols;
                      const leftPercent = colIndexSlot * widthPercent;

                      return (
                        <TimetableCourseBlock
                          key={course.id}
                          course={course}
                          top={top}
                          height={height}
                          widthPercent={widthPercent}
                          leftPercent={leftPercent}
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
            </Animated.View>
          </View>
        </ScrollView>

        {hasAbove && (
          <View
            style={[styles.aboveIndicatorContainer, { zIndex: 30 } as any]}
            pointerEvents="box-none">
            <Pressable
              onPress={scrollToNextAbove}
              style={({ pressed }) => [
                styles.floatingPill,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Scroll to event at ${nextAbove?.startTime}`}>
              <SymbolView
                name="chevron.up"
                tintColor={colors.tint}
                size={12}
              />
              <Text style={[styles.floatingText, { color: colors.tint }]}>
                {nextAbove?.startTime}
              </Text>
            </Pressable>
          </View>
        )}

        {hasBelow && (
          <View
            style={styles.belowIndicatorContainer}
            pointerEvents="box-none">
            <Pressable
              onPress={scrollToNextBelow}
              style={({ pressed }) => [
                styles.floatingPill,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Scroll to event at ${nextBelow?.startTime}`}>
              <Text style={[styles.floatingText, { color: colors.tint }]}>
                Next {nextBelow?.startTime}
              </Text>
              <SymbolView
                name="chevron.down"
                tintColor={colors.tint}
                size={12}
              />
            </Pressable>
          </View>
        )}
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
  animatedContent: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 22,
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
    color: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gutter: {
    paddingRight: spacing.sm,
  },
  dayCol: {
    flex: 1,
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
  dateHeader: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  hourCell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  hourLabel: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    opacity: 0.85,
    zIndex: 10,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  currentTimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginTop: -3.75,
  },
  aboveIndicatorContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  belowIndicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  floatingText: {
    ...typography.label,
    fontSize: 12,
    fontWeight: '600',
  },
});
