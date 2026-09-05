import { StyleSheet, View } from 'react-native';
import { Assignment } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface DueDateItemProps {
  assignment: Assignment;
  /** Hide the bottom divider (e.g. on the last row). */
  isLast?: boolean;
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

export default function DueDateItem({ assignment, isLast = false }: DueDateItemProps) {
  const colors = Colors[useColorScheme()];
  const days = daysFromToday(assignment.dueDate);
  const isSoon = days <= 1;
  const label = relativeLabel(assignment.dueDate);
  const time = assignment.dueTime ?? '';

  return (
    <View
      style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder }]}
      accessibilityLabel={`${assignment.name}, ${assignment.courseCode}, due ${label} ${time}`}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={2}>
          {assignment.name}
        </Text>
        <Text style={[styles.course, { color: colors.secondaryText }]}>{assignment.courseCode}</Text>
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
          <Text style={[styles.time, { color: colors.mutedText }]}>{time}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
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
  course: {
    ...typography.caption,
    fontWeight: '500',
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
  time: {
    ...typography.caption,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
});
