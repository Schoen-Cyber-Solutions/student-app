import { useMemo, useRef, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Course } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import EmptyState from './EmptyState';
import { HOUR_HEIGHT } from './TimetableCourseBlock';
import {
  formatWeekdayShort,
  getCoursesForDay,
  toMinutes,
  isSameCalendarDay,
} from '@/utils/time';

interface DayViewProps {
  selectedDate: Date;
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onGoToToday?: () => void;
}

function formatHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h = hour24 % 12 || 12;
  return `${h} ${period}`;
}

function DayEventCard({
  course,
  onPress,
}: {
  course: Course;
  onPress: (course: Course) => void;
}) {
  const colors = Colors[useColorScheme()];

  const timeText = course.endTime
    ? `${course.startTime} – ${course.endTime}`
    : course.startTime;

  return (
    <Pressable
      onPress={() => onPress(course)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          borderLeftColor: course.color ?? colors.tint,
        },
        pressed && { opacity: 0.8 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${course.name}, ${timeText}${
        course.location ? `, ${course.location}` : ''
      }`}>
      {course.code ? (
        <Text style={[styles.cardCode, { color: colors.secondaryText }]}>
          {course.code}
        </Text>
      ) : null}
      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
        {course.name}
      </Text>
      <Text style={[styles.cardMeta, { color: colors.mutedText }]}>
        {timeText}
      </Text>
      {course.location ? (
        <Text
          style={[styles.cardMeta, { color: colors.secondaryText }]}>
          {course.location}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function DayView({
  selectedDate,
  courses,
  onSelectCourse,
  onPreviousDay,
  onNextDay,
  onGoToToday,
}: DayViewProps) {
  const colors = Colors[useColorScheme()];
  const scrollRef = useRef<ScrollView>(null);
  const today = new Date();
  const isToday = isSameCalendarDay(selectedDate, today);

  const dayName = formatWeekdayShort(selectedDate) as Course['days'][number];
  const dayCourses = useMemo(
    () => getCoursesForDay(courses, dayName),
    [courses, dayName]
  );

  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => i).map((hour) => ({
        hour,
        events: dayCourses.filter((c) => {
          const start = toMinutes(c.startTime);
          return Math.floor(start / 60) === hour;
        }),
      })),
    [dayCourses]
  );

  // Default viewport around 9 AM when the day is first opened.
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 9 * HOUR_HEIGHT, animated: false });
    });
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onPreviousDay}
          style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous day">
          <SymbolView name="chevron.left" tintColor={colors.tint} size={22} />
        </Pressable>

        <View style={styles.title}>
          <Text style={[styles.weekday, { color: colors.text }]}>
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
            <View style={[styles.todayPill, { backgroundColor: colors.tint }]}>
              <Text style={styles.todayText}>Today</Text>
            </View>
          ) : onGoToToday ? (
            <Pressable
              onPress={onGoToToday}
              style={({ pressed }) => [
                styles.todayPill,
                { backgroundColor: colors.tintSoft },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go to today">
              <Text style={[styles.todayText, { color: colors.tint }]}>
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
          <SymbolView name="chevron.right" tintColor={colors.tint} size={22} />
        </Pressable>
      </View>

      {dayCourses.length === 0 ? (
        <EmptyState
          title="No events today"
          message="Your calendar has no events for this day."
          icon="calendar"
        />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {hours.map(({ hour, events }) => (
              <View key={hour} style={styles.hourRow}>
                <View style={styles.gutter}>
                  <Text style={[styles.hourLabel, { color: colors.mutedText }]}>
                    {formatHourLabel(hour)}
                  </Text>
                </View>
                <View style={styles.eventsColumn}>
                  {events.map((course) => (
                    <DayEventCard
                      key={course.id}
                      course={course}
                      onPress={onSelectCourse}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
    paddingBottom: spacing.md,
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: HOUR_HEIGHT,
    paddingVertical: 3,
  },
  gutter: {
    width: 40,
    paddingRight: spacing.sm,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  hourLabel: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  eventsColumn: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  card: {
    borderLeftWidth: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardCode: {
    ...typography.overline,
    marginBottom: 2,
  },
  cardName: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 3,
  },
  cardMeta: {
    ...typography.caption,
    fontWeight: '500',
    marginTop: 1,
  },
});
