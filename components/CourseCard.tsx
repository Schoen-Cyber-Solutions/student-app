import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Course, CourseUpdate } from '@/types';
import { Text } from './Themed';
import { glassColors } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useTextMode, useThemedColors } from './TabTextMode';

interface CourseCardProps {
  course: Course;
  update?: CourseUpdate;
  /** When provided, the whole card is tappable (e.g. opens event detail). */
  onPress?: () => void;
}

const updateLabels: Record<CourseUpdate['type'], string> = {
  location_change: 'Room change',
  cancellation: 'Cancelled',
  announcement: 'Announcement',
  schedule_update: 'Schedule update',
  general: 'Update',
};

export default function CourseCard({ course, update, onPress }: CourseCardProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemedColors();
  const glass = glassColors(scheme, undefined, useTextMode());
  const accent = course.color ?? colors.tint;
  const isCancelled = update?.type === 'cancellation';
  const noticeTone =
    isCancelled || update?.type === 'location_change'
      ? { bg: colors.warningSoft, fg: colors.warningText }
      : { bg: colors.infoSoft, fg: colors.infoText };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: glass.glass, borderColor: glass.glassBorder },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${course.name}, ${course.code}, ${course.startTime} to ${course.endTime}, ${course.location}`}>
      <View style={styles.body}>
        <View style={styles.timeColumn}>
          <Text style={[styles.time, isCancelled && styles.struck]}>{course.startTime}</Text>
          <Text style={[styles.timeEnd, { color: colors.text }, isCancelled && styles.struck]}>
            {course.endTime}
          </Text>
        </View>

        <View style={[styles.accent, { backgroundColor: accent }]} />

        <View style={styles.details}>
          <Text style={[styles.code, { color: colors.text }]}>{course.code}</Text>
          <Text style={styles.name} numberOfLines={2}>
            {course.name}
          </Text>

          {course.location ? (
            <View style={styles.metaRow}>
              <SymbolView name="mappin.and.ellipse" tintColor={colors.secondaryText} size={13} />
              <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
                {course.location}
              </Text>
            </View>
          ) : null}
          {course.instructor ? (
            <View style={styles.metaRow}>
              <SymbolView name="person" tintColor={colors.secondaryText} size={13} />
              <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
                {course.instructor}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {update && (
        <View style={[styles.notice, { backgroundColor: noticeTone.bg }]}>
          <Text style={[styles.noticeLabel, { color: noticeTone.fg }]}>
            {updateLabels[update.type]}
          </Text>
          <Text style={[styles.noticeBody, { color: noticeTone.fg }]} numberOfLines={2}>
            {update.body}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  body: {
    flexDirection: 'row',
    padding: spacing.lg,
  },
  timeColumn: {
    width: 68,
    paddingTop: 2,
  },
  time: {
    ...typography.label,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  timeEnd: {
    ...typography.caption,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  accent: {
    width: 3,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  details: {
    flex: 1,
  },
  code: {
    ...typography.overline,
    marginBottom: 2,
  },
  name: {
    ...typography.body,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  meta: {
    ...typography.label,
    fontWeight: '400',
    flex: 1,
  },
  notice: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  noticeLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: 2,
  },
  noticeBody: {
    ...typography.label,
    fontWeight: '400',
    lineHeight: 18,
  },
});
