import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Assignment } from '@/types';
import { Text } from './Themed';
import { glassColors, readableAccent, withAlpha } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useTextMode, useThemedColors } from './TabTextMode';

interface DueDateItemProps {
  assignment: Assignment;
  /** Hide the bottom divider (e.g. on the last row). */
  isLast?: boolean;
  completed?: boolean;
  onToggleComplete?: () => void;
  /** Tapping the row opens the event detail surface. */
  onPress?: () => void;
  /** Unassigned items: opens the course-assignment picker. */
  onAssign?: () => void;
  /** Accent for the "Assign to course" link (defaults to theme tint). */
  accent?: string;
}

/** Whole-day difference between an ISO date's calendar day and today, ignoring time zones. */
function daysFromToday(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function relativeLabel(isoDate: string): string {
  const days = daysFromToday(isoDate);
  if (days < 0) return 'Past due';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const due = new Date(y, m - 1, d);
  if (days < 7) return due.toLocaleDateString('en-US', { weekday: 'long' });
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DueDateItem({
  assignment,
  isLast = false,
  completed = false,
  onToggleComplete,
  onPress,
  onAssign,
  accent,
}: DueDateItemProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemedColors();
  const glass = glassColors(scheme, undefined, useTextMode());
  const days = daysFromToday(assignment.dueDate);
  const isSoon = days <= 1;
  const label = relativeLabel(assignment.dueDate);
  const time = assignment.dueTime ?? '';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        completed && { opacity: 0.65 },
        pressed && onPress && { opacity: 0.7 },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${assignment.name}, ${assignment.courseCode}, due ${label} ${time}`}>
      {onToggleComplete ? (
        <Pressable
          onPress={onToggleComplete}
          style={styles.check}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={completed ? 'Mark as not done' : 'Mark as done'}>
          <SymbolView
            name={completed ? 'checkmark.circle.fill' : 'circle'}
            // Unchecked ring carries the shared course color; readableAccent
            // lifts near-black accents in dark mode and darkens washed-out
            // ones in light mode so the circle never vanishes into the
            // background.
            tintColor={
              completed
                ? colors.success
                : accent
                  ? readableAccent(accent, scheme)
                  : colors.mutedText
            }
            size={20}
          />
        </Pressable>
      ) : null}

      <View style={styles.left}>
        <Text
          style={[
            styles.name,
            completed && { textDecorationLine: 'line-through' },
            { color: colors.text },
          ]}
          numberOfLines={2}>
          {assignment.name}
        </Text>
        {assignment.courseCode ? (
          <View style={styles.courseRow}>
            {accent ? (
              <View
                style={[
                  styles.courseDot,
                  {
                    // Filled with the shared course color (luminance-guarded
                    // for extreme tones); the ring uses mode-aware text-alpha
                    // so the marker separates from any solid background.
                    backgroundColor: readableAccent(accent, scheme),
                    borderColor: withAlpha(colors.text, 0.3),
                  },
                ]}
              />
            ) : null}
            <Text style={[styles.course, { color: colors.text }]}>{assignment.courseCode}</Text>
          </View>
        ) : null}
        {onAssign ? (
          <Pressable onPress={onAssign} hitSlop={8} accessibilityRole="button" accessibilityLabel="Assign to course">
            {({ pressed }) => (
              <Text style={[styles.assignLink, { color: accent ?? colors.tint }, pressed && { opacity: 0.6 }]}>
                Assign to course
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.right}>
        <View
          style={[
            styles.datePill,
            { backgroundColor: isSoon ? colors.warningSoft : colors.surface },
          ]}>
          <Text
            style={[
              styles.dateText,
              { color: isSoon ? colors.warningText : colors.text },
            ]}>
            {label}
          </Text>
        </View>
        {time ? (
          <View
            style={[
              styles.timePill,
              { backgroundColor: glass.glass, borderColor: glass.glassBorder },
            ]}>
            <Text style={[styles.time, { color: colors.text }]}>{time}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
  },
  check: {
    paddingRight: spacing.md,
    justifyContent: 'center',
  },
  left: {
    flex: 1,
    paddingRight: spacing.md,
  },
  name: {
    ...typography.bodyRegular,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 3,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  courseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  course: {
    ...typography.caption,
    fontWeight: '500',
  },
  assignLink: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  datePill: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dateText: {
    ...typography.caption,
    fontWeight: '600',
  },
  timePill: {
    marginTop: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  time: {
    ...typography.caption,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
