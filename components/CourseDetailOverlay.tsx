import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Course } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import CourseSectionPicker from './CourseSectionPicker';
import {
  assignEventCourse,
  isAssignableEvent,
  isCompletableEvent,
  setEventCompletion,
  MyCalendarEvent,
  RecurringPreview,
} from '@/services/api/calendar';
import RecurringAssignSheet from './RecurringAssignSheet';
import { prettyCourseCode } from '@/utils/courseLabel';

interface CourseDetailOverlayProps {
  course: Course | null;
  /** Source event; enables the course-assignment row for imported (LMS)
   *  events. Pass the live event object so edits re-render after refetch. */
  event?: MyCalendarEvent | null;
  onClose: () => void;
  /** Called after the course association changes so parents can refetch. */
  onEventChanged?: () => void;
}

export default function CourseDetailOverlay({
  course,
  event,
  onClose,
  onEventChanged,
}: CourseDetailOverlayProps) {
  const colors = Colors[useColorScheme()];
  const visible = course !== null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const assignable = event != null && isAssignableEvent(event);
  const completable = event != null && isCompletableEvent(event);
  const completed = event?.isCompleted ?? false;
  const [recurringPrompt, setRecurringPrompt] = useState<{
    eventId: string;
    courseSectionId: string;
    courseLabel: string;
    recurring: RecurringPreview;
  } | null>(null);

  const courseLabel = event?.courseSectionId
    ? `${prettyCourseCode(event.courseCode ?? event.courseName ?? 'Course')}${
        event.courseSectionCode ? ` · ${event.courseSectionCode}` : ''
      }`
    : null;

  const handlePick = (sectionId: string | null, label?: string) => {
    if (!event) return;
    setPickerOpen(false);
    setSaving(true);
    assignEventCourse(event.id, sectionId)
      .then((result) => {
        onEventChanged?.();
        if (sectionId && result.recurring) {
          setRecurringPrompt({
            eventId: event.id,
            courseSectionId: sectionId,
            courseLabel: label ?? 'course',
            recurring: result.recurring,
          });
        }
      })
      .catch(() => Alert.alert('Could not assign', 'Please try again.'))
      .finally(() => setSaving(false));
  };

  const handleToggleComplete = () => {
    if (!event || saving) return;
    setSaving(true);
    // setEventCompletion notifies calendar subscribers after the write.
    setEventCompletion(event.id, !completed)
      .then(() => onEventChanged?.())
      .catch(() => Alert.alert('Could not update', 'Please try again.'))
      .finally(() => setSaving(false));
  };

  const handleEmailProfessor = () => {
    if (!course) return;
    onClose();
    router.push({
      pathname: '/uni-email/compose',
      params: {
        toName: course.instructor,
        toAddress: course.instructorEmail,
      },
    });
  };

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
          {/* Handle bar */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}>
              <SymbolView name="xmark.circle.fill" tintColor={colors.mutedText} size={24} />
            </Pressable>
          </View>

          {course && (
            <View style={styles.content}>
              <View style={styles.header}>
                {course.code ? (
                  <Text style={[styles.code, { color: colors.secondaryText }]}>{course.code}</Text>
                ) : null}
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={0}>
                  {course.name}
                </Text>
              </View>

              {course.date ? (
                <View style={styles.row}>
                  <SymbolView name="calendar" tintColor={colors.mutedText} size={16} />
                  <Text style={[styles.rowText, { color: colors.text }]}>{course.date}</Text>
                </View>
              ) : null}

              <View style={styles.row}>
                <SymbolView name="clock" tintColor={colors.mutedText} size={16} />
                <Text style={[styles.rowText, { color: colors.text }]}>
                  {course.startTime}
                  {course.endTime ? ` – ${course.endTime}` : ''}
                </Text>
              </View>

              {course.location ? (
                <View style={styles.row}>
                  <SymbolView name="mappin.and.ellipse" tintColor={colors.mutedText} size={16} />
                  <Text style={[styles.rowText, { color: colors.text }]}>{course.location}</Text>
                </View>
              ) : null}

              {assignable ? (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.row,
                    styles.courseRow,
                    { backgroundColor: colors.surface },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Change course">
                  <SymbolView name="book.closed" tintColor={colors.tint} size={16} />
                  <View style={styles.professorText}>
                    <Text style={[styles.courseCaption, { color: colors.secondaryText }]}>
                      {event?.courseSectionSource === 'recurring_rule'
                        ? 'Course · assigned from recurring rule'
                        : 'Course'}
                    </Text>
                    <Text style={[styles.rowText, { color: courseLabel ? colors.text : colors.tint }]}>
                      {courseLabel ?? 'Unassigned — assign to course'}
                    </Text>
                  </View>
                  <SymbolView name="pencil" tintColor={colors.mutedText} size={14} style={styles.chevron} />
                </Pressable>
              ) : null}

              {completable ? (
                <Pressable
                  onPress={handleToggleComplete}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.row,
                    styles.courseRow,
                    { backgroundColor: colors.surface },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={completed ? 'Mark as not done' : 'Mark as done'}>
                  <SymbolView
                    name={completed ? 'checkmark.circle.fill' : 'circle'}
                    tintColor={completed ? colors.success : colors.mutedText}
                    size={16}
                  />
                  <View style={styles.professorText}>
                    <Text style={[styles.courseCaption, { color: colors.secondaryText }]}>Done</Text>
                    <Text style={[styles.rowText, { color: colors.text }]}>
                      {completed ? 'Completed — tap to undo' : 'Mark as done'}
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              {course.description ? (
                <View style={[styles.row, styles.descriptionRow]}>
                  <SymbolView name="text.alignleft" tintColor={colors.mutedText} size={16} />
                  <Text
                    style={[styles.descriptionText, { color: colors.text }]}
                    numberOfLines={0}>
                    {course.description}
                  </Text>
                </View>
              ) : null}

              {course.instructor && course.instructorEmail ? (
                <Pressable
                  onPress={handleEmailProfessor}
                  style={({ pressed }) => [
                    styles.row,
                    styles.professorRow,
                    { backgroundColor: colors.surface },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Email ${course.instructor}`}>
                  <SymbolView name="envelope" tintColor={colors.tint} size={16} />
                  <View style={styles.professorText}>
                    <Text style={[styles.rowText, { color: colors.text }]}>{course.instructor}</Text>
                    <Text style={[styles.email, { color: colors.secondaryText }]}>
                      {course.instructorEmail}
                    </Text>
                  </View>
                  <SymbolView
                    name="chevron.right"
                    tintColor={colors.mutedText}
                    size={14}
                    style={styles.chevron}
                  />
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </View>
      {event ? (
        <CourseSectionPicker
          visible={pickerOpen}
          selectedSectionId={event.courseSectionId ?? null}
          onSelect={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
      <RecurringAssignSheet
        visible={recurringPrompt !== null}
        eventId={recurringPrompt?.eventId ?? null}
        courseSectionId={recurringPrompt?.courseSectionId ?? null}
        courseLabel={recurringPrompt?.courseLabel ?? ''}
        recurring={recurringPrompt?.recurring ?? null}
        onApplied={() => onEventChanged?.()}
        onClose={() => setRecurringPrompt(null)}
      />
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
    maxHeight: '75%',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    position: 'relative',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  code: {
    ...typography.overline,
    marginBottom: 4,
  },
  name: {
    ...typography.heading,
    fontSize: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.sm,
  },
  rowText: {
    ...typography.bodyRegular,
    fontSize: 15,
    flex: 1,
    flexWrap: 'wrap',
  },
  descriptionRow: {
    alignItems: 'flex-start',
  },
  descriptionText: {
    ...typography.bodyRegular,
    fontSize: 15,
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 21,
  },
  professorRow: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  courseRow: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  courseCaption: {
    ...typography.caption,
    marginBottom: 2,
  },
  professorText: {
    flex: 1,
  },
  email: {
    ...typography.caption,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
