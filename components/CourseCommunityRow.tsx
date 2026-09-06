import { Pressable, StyleSheet, View } from 'react-native';
import { Course } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface CourseCommunityRowProps {
  course: Course;
  activityCount?: number;
  onPress: () => void;
}

export default function CourseCommunityRow({ course, activityCount, onPress }: CourseCommunityRowProps) {
  const colors = Colors[useColorScheme()];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${course.name}, ${course.code}`}>
      <View style={[styles.dot, { backgroundColor: course.color ?? colors.tint }]} />
      <View style={styles.textBlock}>
        <Text style={styles.name} numberOfLines={1}>{course.name}</Text>
        <Text style={[styles.code, { color: colors.secondaryText }]}>{course.code}</Text>
        {activityCount ? (
          <Text style={[styles.activity, { color: colors.tint }]}>
            {activityCount} new discussion{activityCount !== 1 ? 's' : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  textBlock: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontSize: 15,
    marginBottom: 2,
  },
  code: {
    ...typography.caption,
    fontWeight: '500',
  },
  activity: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: 4,
  },
});
