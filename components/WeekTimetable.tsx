import { useRef, useEffect, useCallback } from 'react';
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
  weekDates: Date[]; // Mon–Fri
  weekOffset: number;
  onSelectCourse?: (course: Course) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onGoToToday?: () => void;
}

const GUTTER_WIDTH = 44;
const START_HOUR = 8;
const END_HOUR = 22;
const SWIPE_THRESHOLD = 50;
const SWIPE_START_THRESHOLD = 15;

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

  // Subtle opacity animation on week change
  const animatedOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    animatedOpacity.setValue(0.6);
    Animated.timing(animatedOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [weekDates]);

  const handleSwipe = useCallback(
    (dx: number) => {
      if (dx < -SWIPE_THRESHOLD) onSwipeLeft?.();
      if (dx > SWIPE_THRESHOLD) onSwipeRight?.();
    },
    [onSwipeLeft, onSwipeRight]
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // Capture only clearly horizontal gestures past a small start threshold.
        // Vertical gestures fall through to the inner ScrollView.
        return (
          Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_START_THRESHOLD
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        handleSwipe(gestureState.dx);
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={[styles.content, { opacity: animatedOpacity }]}>
        {/* Week label row with optional Today button */}
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

        {/* Scrollable grid */}
        <ScrollView showsVerticalScrollIndicator={false}>
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
            {weekDates.map((date) => {
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
                    const colIndex = slot?.columnIndex ?? 0;
                    const widthPercent = 100 / totalCols;
                    const leftPercent = colIndex * widthPercent;

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
  content: {
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
});
