import { useRef, useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  PanResponder,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { Course } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
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
const SWIPE_COMMIT_THRESHOLD = 60;
const SWIPE_START_THRESHOLD = 20;
const SWIPE_RATIO = 1.5; // dx must exceed dy * this ratio
const SNAP_DURATION = 200;
const SLIDE_OUT_DURATION = 180;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
        useNativeDriver: true,
      }).start(cb);
    },
    [translateX]
  );

  const commitSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      const exit = direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH;
      animateTo(exit, SLIDE_OUT_DURATION, () => {
        direction === 'left' ? onSwipeLeft?.() : onSwipeRight?.();
        translateX.setValue(0);
        isAnimating.current = false;
      });
    },
    [animateTo, onSwipeLeft, onSwipeRight, translateX]
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => {
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
        translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        setScrollEnabled(true);
        const dx = gs.dx;
        if (dx < -SWIPE_COMMIT_THRESHOLD) {
          commitSwipe('left');
        } else if (dx > SWIPE_COMMIT_THRESHOLD) {
          commitSwipe('right');
        } else {
          animateTo(0, SNAP_DURATION);
        }
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
        animateTo(0, SNAP_DURATION);
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
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.animatedContent,
          { transform: [{ translateX }] },
        ]}>
        {/* Week label row */}
        <View style={styles.weekRow}>
          <Text
            style={[styles.weekLabel, { color: colors.secondaryText }]}
            numberOfLines={1}>
            {formatWeekLabel(weekDates)}
          </Text>
          {weekOffset !== 0 && (
            <Pressable
              onPress={onGoToToday}
              style={styles.todayButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go to today">
              <Text style={[styles.todayText, { color: colors.tint }]}>
                Today
              </Text>
            </Pressable>
          )}
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
                    { color: isToday ? colors.tint : colors.secondaryText },
                  ]}>
                  {formatWeekdayShort(date)}
                </Text>
                <Text
                  style={[
                    styles.dateHeader,
                    { color: isToday ? colors.tint : colors.mutedText },
                  ]}>
                  {formatDayOfMonth(date)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Scrollable timetable grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}>
          <View style={[styles.gridRow, { height: gridHeight }]}>
            {/* Time gutter */}
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

            {/* Day columns */}
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
          </View>
        </ScrollView>
      </Animated.View>
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
  animatedContent: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    minHeight: 22,
  },
  weekLabel: {
    ...typography.label,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  todayButton: {
    position: 'absolute',
    right: 0,
    paddingVertical: 2,
  },
  todayText: {
    ...typography.label,
    fontWeight: '600',
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
    ...typography.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateHeader: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
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
