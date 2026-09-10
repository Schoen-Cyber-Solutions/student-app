import { useRef, useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  PanResponder,
  Animated,
  Pressable,
} from 'react-native';
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
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onGoToToday?: () => void;
}

const GUTTER_WIDTH = 44;
const START_HOUR = 8;
const END_HOUR = 22;
const SWIPE_COMMIT_THRESHOLD = 55;
const SWIPE_START_THRESHOLD = 12;
const SWIPE_RATIO = 1.5; // dx must exceed dy * this ratio
const VELOCITY_THRESHOLD = 0.6; // px/ms (≈ 600 px/s)
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
  onSwipeLeft,
  onSwipeRight,
  onGoToToday,
}: WeekTimetableProps) {
  const colors = Colors[useColorScheme()];
  const today = new Date();
  const hours = getHourRange(START_HOUR, END_HOUR);
  const gridHeight = hours.length * HOUR_HEIGHT;

  const translateX = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [nowMinutes, setNowMinutes] = useState(
    today.getHours() * 60 + today.getMinutes()
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

      // 1. Position the new week offscreen in the swipe direction
      const enter = direction === 'left' ? ENTER_DISTANCE : -ENTER_DISTANCE;
      translateX.setValue(enter);

      // 2. Update week state immediately (triggers re-render with new data)
      direction === 'left' ? onSwipeLeft?.() : onSwipeRight?.();

      // 3. Animate the new week in quickly
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
            <View key={date.toISOString()} style={styles.dayCol}>
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
            </View>
          );
        })}
      </View>

      {/* Calendar viewport: horizontal swipe + vertical scroll */}
      <View style={styles.viewport} {...panResponder.panHandlers}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}>
          <View style={[styles.gridRow, { height: gridHeight }]}>
            {/* Time gutter — STATIC, outside the animated area */}
            <View style={[styles.gutter, { width: GUTTER_WIDTH }]}>
              {hours.map((hour) => (
                <View
                  key={hour}
                  style={[
                    styles.hourCell,
                    { height: HOUR_HEIGHT, borderBottomColor: colors.divider },
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
                const dayCourses = getCoursesForDay(courses, dayName);
                const overlapSlots = detectOverlaps(dayCourses);
                const isToday = isSameCalendarDay(date, today);

                return (
                  <View
                    key={date.toISOString()}
                    style={[
                      styles.dayCol,
                      {
                        borderLeftColor: colors.divider,
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
                            borderBottomColor: colors.divider,
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
                      const height =
                        (durationMinutes(
                          course.startTime,
                          course.endTime
                        ) /
                          60) *
                        HOUR_HEIGHT;

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
                          onPress={onSelectCourse}
                        />
                      );
                    })}
                  </View>
                );
              })}
            </Animated.View>
          </View>
        </ScrollView>
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
    paddingHorizontal: spacing.lg,
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
});
