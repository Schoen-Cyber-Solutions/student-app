import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { getMyEnrollments, EnrollmentInfo } from '@/services/api/academic';
import { useCourseColors } from '@/hooks/useCourseColors';
import { colorForKey, prettyCourseCode } from '@/utils/courseLabel';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface CourseSectionPickerProps {
  visible: boolean;
  /** Currently effective CourseSection id (null = Unassigned is selected). */
  selectedSectionId: string | null;
  /** Called with the chosen section id (null = "Unassigned") and its display
   *  label (e.g. "CSIA 301 · 01") when a real section was picked. */
  onSelect: (sectionId: string | null, label?: string) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet picker for manually associating an imported calendar event
 * with one of the user's enrolled CourseSections. Reused by Home and the
 * calendar event-detail overlay.
 */
export default function CourseSectionPicker({
  visible,
  selectedSectionId,
  onSelect,
  onClose,
}: CourseSectionPickerProps) {
  const colors = Colors[useColorScheme()];
  const { colors: courseColors } = useCourseColors();
  const [enrollments, setEnrollments] = useState<EnrollmentInfo[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setEnrollments(null);
    getMyEnrollments()
      .then((list) => {
        if (active) setEnrollments(list);
      })
      .catch(() => {
        if (active) setEnrollments([]);
      });
    return () => {
      active = false;
    };
  }, [visible]);

  const options = (enrollments ?? []).slice().sort((a, b) => {
    const aLabel = `${a.section.course.code} ${a.section.sectionCode}`;
    const bLabel = `${b.section.course.code} ${b.section.sectionCode}`;
    return aLabel.localeCompare(bLabel);
  });

  const row = (
    key: string,
    title: string,
    subtitle: string | null,
    color: string | undefined,
    selected: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.optionRow,
        { borderColor: colors.cardBorder },
        selected && { backgroundColor: colors.surface },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={[styles.dot, { backgroundColor: color ?? colors.mutedText }]} />
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.optionSubtitle, { color: colors.secondaryText }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {selected ? <SymbolView name="checkmark" tintColor={colors.tint} size={18} /> : null}
    </Pressable>
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="overFullScreen">
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropHit} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Course</Text>

          {enrollments === null ? (
            <ActivityIndicator size="small" color={colors.tint} style={styles.spinner} />
          ) : (
            <ScrollView style={styles.list} bounces={false}>
              {row(
                'unassigned',
                'Unassigned',
                'Not linked to a course',
                undefined,
                selectedSectionId === null,
                () => onSelect(null),
              )}
              {options.map((enr) => {
                const code = enr.section.course.code;
                return row(
                  enr.section.id,
                  `${prettyCourseCode(code)} · ${enr.section.sectionCode}`,
                  enr.section.course.name,
                  courseColors[code] ?? colorForKey(code),
                  selectedSectionId === enr.section.id,
                  () => onSelect(enr.section.id, `${prettyCourseCode(code)} · ${enr.section.sectionCode}`),
                );
              })}
              {options.length === 0 ? (
                <Text style={[styles.empty, { color: colors.secondaryText }]}>
                  No enrolled courses found
                </Text>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backdropHit: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 0,
    marginBottom: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyRegular,
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    ...typography.caption,
    marginTop: 1,
  },
  empty: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
