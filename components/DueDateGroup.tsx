import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Assignment } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import DueDateItem from './DueDateItem';

interface DueDateGroupProps {
  courseCode: string;
  color?: string;
  dueDates: Assignment[];
  completedIds: Set<string>;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: (id: string) => void;
  onViewCourse?: (code: string) => void;
  /** Tapping a row opens the event detail surface. */
  onPressItem?: (id: string) => void;
  /** Unassigned group: tapping "Assign to course" opens the picker. */
  onAssignItem?: (id: string) => void;
}

export default function DueDateGroup({
  courseCode,
  color,
  dueDates,
  completedIds,
  expanded,
  onToggleExpand,
  onToggleComplete,
  onViewCourse,
  onPressItem,
  onAssignItem,
}: DueDateGroupProps) {
  const colors = Colors[useColorScheme()];
  const accent = color ?? colors.tint;

  const nearest = dueDates[0];
  const completedCount = dueDates.filter((d) => completedIds.has(d.id)).length;
  const pendingCount = dueDates.length - completedCount;

  return (
    <View
      style={[
        styles.group,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}>
      <Pressable
        onPress={onToggleExpand}
        style={({ pressed }) => [
          styles.header,
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${courseCode}, ${pendingCount} upcoming due, nearest ${nearest.dueTime}`}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.code, { color: colors.text }]} numberOfLines={1}>
              {courseCode}
            </Text>
            {onViewCourse ? (
              <Pressable
                onPress={() => onViewCourse(courseCode)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`View all due dates for ${courseCode}`}>
                <SymbolView
                  name="chevron.right"
                  tintColor={colors.mutedText}
                  size={14}
                />
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.summary, { color: colors.secondaryText }]}>
            {pendingCount} due{pendingCount !== 1 ? '' : ''} · Next {nearest.dueTime} {nearest.dueDate ? `· ${nearest.dueDate}` : ''}
          </Text>
        </View>
        <View style={styles.chevron}>
          <SymbolView
            name={expanded ? 'chevron.down' : 'chevron.right'}
            tintColor={colors.mutedText}
            size={14}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.list}>
          {dueDates.map((assignment, i) => (
            <DueDateItem
              key={assignment.id}
              assignment={assignment}
              isLast={i === dueDates.length - 1}
              completed={completedIds.has(assignment.id)}
              onToggleComplete={() => onToggleComplete(assignment.id)}
              onPress={onPressItem ? () => onPressItem(assignment.id) : undefined}
              onAssign={onAssignItem ? () => onAssignItem(assignment.id) : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  accent: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  code: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 20,
    flex: 1,
  },
  summary: {
    ...typography.caption,
    marginTop: 2,
  },
  chevron: {
    marginLeft: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
