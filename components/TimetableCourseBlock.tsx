import { Pressable, StyleSheet, View } from 'react-native';
import { Course } from '@/types';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';

const HOUR_HEIGHT = 52;

interface TimetableCourseBlockProps {
  course: Course;
  /** Vertical position in pixels from the top of the grid. */
  top: number;
  /** Height in pixels. */
  height: number;
  /** Width as a percentage of the day column (0–100). */
  widthPercent: number;
  /** Horizontal offset as a percentage of the day column (0–100). */
  leftPercent: number;
  onPress?: (course: Course) => void;
}

export default function TimetableCourseBlock({
  course,
  top,
  height,
  widthPercent,
  leftPercent,
  onPress,
}: TimetableCourseBlockProps) {
  const canShowName = height >= 42;

  return (
    <Pressable
      style={[
        styles.block,
        {
          top,
          height,
          width: `${widthPercent}%`,
          left: `${leftPercent}%`,
          backgroundColor: course.color ?? '#64748B',
        },
      ]}
      onPress={() => onPress?.(course)}
      accessibilityLabel={`${course.name}, ${course.code}, ${course.startTime} to ${course.endTime}, ${course.location}`}
      accessibilityRole="button">
      <Text style={[styles.code, canShowName && styles.codeWithName]} numberOfLines={1}>
        {course.code}
      </Text>
      {canShowName ? (
        <Text style={styles.name} numberOfLines={2}>
          {course.name}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  code: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  codeWithName: {
    marginBottom: 1,
  },
  name: {
    color: '#FFFFFF',
    ...typography.caption,
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 13,
    opacity: 0.95,
  },
});

export { HOUR_HEIGHT };
