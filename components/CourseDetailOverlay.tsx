import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Course } from '@/types';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';
import { glassColors, withAlpha } from '@/constants/Glass';
import { useCalendarAccent } from '@/utils/calendarAccent';
import { useColorScheme } from './useColorScheme';
import { useTextColors, useTextMode } from './TabTextMode';
import CourseSectionPicker from './CourseSectionPicker';
import { isSafeExternalUrl, resolveExternalLinks, ExternalLinkSpec } from '@/utils/externalLinks';
import { getMyUniversity } from '@/services/api/me';
import {
  assignEventCourse,
  deletePersonalEvent,
  isAssignableEvent,
  isCompletableEvent,
  setEventCompletion,
  MyCalendarEvent,
  RecurringPreview,
} from '@/services/api/calendar';
import RecurringAssignSheet from './RecurringAssignSheet';
import { prettyCourseCode } from '@/utils/courseLabel';

// expo-blur calls requireNativeViewManager at module eval — on a dev client
// that predates the package this throws when the overlay first renders and
// kills the whole calendar screen. The opaque glassStrong fill still gives a
// readable sheet when blur is unavailable.
let NativeBlurView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeBlurView = require('expo-blur').BlurView;
} catch {
  NativeBlurView = null;
}

// The sheet opens to ~72% of the window height. A downward drag past
// DISMISS_DISTANCE (or a fast flick) dismisses it. The gesture must be
// claimed with a very small threshold — the inner ScrollView's native pan
// recognizer engages almost immediately on downward pulls at scroll-top, so
// a large slop loses the race and the sheet never moves.
const SHEET_FRACTION = 0.72;
const DISMISS_DISTANCE = 70;
const DISMISS_VELOCITY = 0.35;
const DRAG_THRESHOLD = 4;

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
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const textMode = useTextMode();
  const text = useTextColors();
  const colors = glassColors(scheme, useCalendarAccent(), textMode);
  // Neutral ink follows the tab's Light/Dark text preference; the sheet fill
  // flips with it so the frosted panel always contrasts with its text.
  const ink = text.primary;
  const inkSecondary = text.secondary;
  const sheetFill =
    textMode === 'light' ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.82)';
  const sheetTint = textMode === 'light' ? 'dark' : 'light';
  const rowFill = withAlpha(text.primary, 0.08);
  const visible = course !== null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = windowHeight * SHEET_FRACTION;

  // Instructor name + official profile URL arrive on the event payload
  // (validated server-side); the university domain is fetched only to re-run
  // the same host allowlist client-side before rendering the link.
  const instructor = event?.instructor ?? null;
  const [links, setLinks] = useState<ExternalLinkSpec[]>([]);

  useEffect(() => {
    if (!visible) {
      setLinks([]);
      return;
    }
    let cancelled = false;
    getMyUniversity()
      .then((university) => {
        if (cancelled) return;
        const resolved = resolveExternalLinks({
          domain: university?.domain ?? null,
          instructor: event?.instructor ?? null,
          instructorProfileUrl: event?.instructorProfileUrl ?? null,
          provider: event?.provider ?? null,
        });
        setLinks(resolved);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, event?.instructor, event?.instructorProfileUrl, event?.provider]);

  // Drag-to-dismiss: translateY follows a downward pull only while the inner
  // ScrollView is scrolled to its top, so normal content scrolling is never
  // hijacked. The responder is claimed in the capture phase (before the
  // ScrollView's pan recognizer engages) and once held it refuses to release
  // mid-gesture.
  const scrollAtTop = useRef(true);
  const scrollRef = useRef<ScrollView>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const dismissSheet = () => {
    Animated.timing(translateY, {
      toValue: sheetHeight + insets.bottom,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  };
  const dismissRef = useRef(dismissSheet);
  dismissRef.current = dismissSheet;

  // Every open starts scrolled to the top — the ScrollView keeps its offset
  // between opens inside the persistent Modal, which would otherwise leave
  // scrollAtTop stale and swallow the dismiss gesture.
  useEffect(() => {
    if (visible) {
      scrollAtTop.current = true;
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      // Claim any downward pull at scroll-top before the ScrollView's
      // gesture recognizer activates. Touches on the drag handle (outside
      // the ScrollView) reach here via the bubble phase.
      onMoveShouldSetPanResponder: (_e, g) =>
        scrollAtTop.current && g.dy > DRAG_THRESHOLD && g.dy > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        scrollAtTop.current && g.dy > DRAG_THRESHOLD && g.dy > Math.abs(g.dx) * 1.2,
      // Once claimed, never hand the drag back to the ScrollView mid-gesture.
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        translateY.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
          dismissRef.current();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    }),
  ).current;

  const assignable = event != null && isAssignableEvent(event);
  const completable = event != null && isCompletableEvent(event);
  // Saved Laker Connect copy — shows source/RSVP links + Remove instead of
  // personal-event editing; source metadata is never mutated here.
  const isCampusEvent = event?.provider === 'laker_connect';
  const campusLink = event?.rsvpUrl ?? event?.sourceUrl ?? null;
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

  const handleRemoveSavedEvent = () => {
    if (!event || saving) return;
    Alert.alert('Remove from Calendar?', 'The event stays in Laker Connect.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setSaving(true);
          // deletePersonalEvent hits the generic user-event DELETE route —
          // saved campus copies are removable; the source event is not.
          deletePersonalEvent(event.id)
            .then(() => {
              onEventChanged?.();
              onClose();
            })
            .catch(() => Alert.alert('Could not remove', 'Please try again.'))
            .finally(() => setSaving(false));
        },
      },
    ]);
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

  const handleOpenLink = (url: string) => {
    if (!isSafeExternalUrl(url)) return;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) return Linking.openURL(url);
        Alert.alert('Cannot open link', 'This link could not be opened on this device.');
        return null;
      })
      .catch(() => Alert.alert('Cannot open link', 'Please try again later.'));
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

        <Animated.View
          style={[
            styles.sheet,
            { borderColor: colors.glassBorder, height: sheetHeight },
            { transform: [{ translateY }] },
          ]}
          {...panResponder.panHandlers}>
          {NativeBlurView ? (
            <NativeBlurView
              intensity={60}
              tint={sheetTint}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: sheetFill },
            ]}
          />
          {/* Handle bar — generously sized so the drag zone is easy to grab */}
          <View style={styles.handleRow}>
            <View
              style={[
                styles.handle,
                { backgroundColor: text.tertiary },
              ]}
            />
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
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg },
              ]}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                scrollAtTop.current = e.nativeEvent.contentOffset.y <= 0;
              }}>
              <View style={styles.header}>
                {course.code ? (
                  <Text style={[styles.code, { color: inkSecondary }]}>{course.code}</Text>
                ) : null}
                <Text style={[styles.name, { color: ink }]} numberOfLines={0}>
                  {course.name}
                </Text>
              </View>

              {course.date ? (
                <View style={styles.row}>
                  <SymbolView name="calendar" tintColor={inkSecondary} size={16} />
                  <Text style={[styles.rowText, { color: ink }]}>{course.date}</Text>
                </View>
              ) : null}

              <View style={styles.row}>
                <SymbolView name="clock" tintColor={inkSecondary} size={16} />
                <Text style={[styles.rowText, { color: ink }]}>
                  {course.startTime}
                  {course.endTime ? ` – ${course.endTime}` : ''}
                </Text>
              </View>

              {course.location ? (
                <View style={styles.row}>
                  <SymbolView name="mappin.and.ellipse" tintColor={inkSecondary} size={16} />
                  <Text style={[styles.rowText, { color: ink }]}>{course.location}</Text>
                </View>
              ) : null}

              {assignable ? (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.row,
                    styles.courseRow,
                    { backgroundColor: rowFill },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Change course">
                  <SymbolView name="book.closed" tintColor={colors.accent} size={16} />
                  <View style={styles.professorText}>
                    <Text style={[styles.courseCaption, { color: inkSecondary }]}>
                      {event?.courseSectionSource === 'recurring_rule'
                        ? 'Course · assigned from recurring rule'
                        : 'Course'}
                    </Text>
                    <Text style={[styles.rowText, { color: courseLabel ? ink : colors.accent }]}>
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
                    { backgroundColor: rowFill },
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
                    <Text style={[styles.courseCaption, { color: inkSecondary }]}>Done</Text>
                    <Text style={[styles.rowText, { color: ink }]}>
                      {completed ? 'Completed — tap to undo' : 'Mark as done'}
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              {course.description ? (
                <View style={[styles.row, styles.descriptionRow]}>
                  <SymbolView name="text.alignleft" tintColor={inkSecondary} size={16} />
                  <Text
                    style={[styles.descriptionText, { color: ink }]}
                    numberOfLines={0}>
                    {course.description}
                  </Text>
                </View>
              ) : null}

              {isCampusEvent ? (
                <View style={styles.row}>
                  <SymbolView name="building.columns" tintColor={inkSecondary} size={16} />
                  <View style={styles.professorText}>
                    <Text style={[styles.courseCaption, { color: inkSecondary }]}>Source</Text>
                    <Text style={[styles.rowText, { color: ink }]}>Laker Connect</Text>
                  </View>
                </View>
              ) : null}

              {isCampusEvent && campusLink ? (
                <Pressable
                  onPress={() => handleOpenLink(campusLink)}
                  style={({ pressed }) => [
                    styles.row,
                    styles.courseRow,
                    { backgroundColor: rowFill },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="View Event and RSVP on Laker Connect">
                  <SymbolView name="safari" tintColor={colors.accent} size={16} />
                  <Text style={[styles.rowText, { color: colors.accent }]}>
                    View Event / RSVP on Laker Connect
                  </Text>
                  <SymbolView
                    name="arrow.up.right"
                    tintColor={colors.mutedText}
                    size={14}
                    style={styles.chevron}
                  />
                </Pressable>
              ) : null}

              {isCampusEvent ? (
                <Pressable
                  onPress={handleRemoveSavedEvent}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.row,
                    styles.courseRow,
                    { backgroundColor: rowFill },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Remove from Calendar">
                  <SymbolView name="calendar.badge.minus" tintColor={colors.urgent} size={16} />
                  <Text style={[styles.rowText, { color: colors.urgent }]}>
                    Remove from Calendar
                  </Text>
                </Pressable>
              ) : null}

              {instructor ? (
                <View style={styles.row}>
                  <SymbolView name="person" tintColor={inkSecondary} size={16} />
                  <View style={styles.professorText}>
                    <Text style={[styles.courseCaption, { color: inkSecondary }]}>Professor</Text>
                    <Text style={[styles.rowText, { color: ink }]}>{instructor}</Text>
                  </View>
                </View>
              ) : null}

              {course.instructor && course.instructorEmail ? (
                <Pressable
                  onPress={handleEmailProfessor}
                  style={({ pressed }) => [
                    styles.row,
                    styles.professorRow,
                    { backgroundColor: rowFill },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Email ${course.instructor}`}>
                  <SymbolView name="envelope" tintColor={colors.accent} size={16} />
                  <View style={styles.professorText}>
                    <Text style={[styles.rowText, { color: ink }]}>{course.instructor}</Text>
                    <Text style={[styles.email, { color: inkSecondary }]}>
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

              {links.map((link) => (
                <Pressable
                  key={link.kind}
                  onPress={() => handleOpenLink(link.url)}
                  style={({ pressed }) => [
                    styles.row,
                    styles.courseRow,
                    { backgroundColor: rowFill },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={link.label}>
                  <SymbolView
                    name={link.kind === 'professor_profile' ? 'person.crop.rectangle' : 'safari'}
                    tintColor={colors.accent}
                    size={16}
                  />
                  <Text style={[styles.rowText, { color: colors.accent }]}>{link.label}</Text>
                  <SymbolView
                    name="arrow.up.right"
                    tintColor={colors.mutedText}
                    size={14}
                    style={styles.chevron}
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Animated.View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  // Generous vertical padding = large invisible grab zone around the
  // visually subtle handle; the row sits above the ScrollView so drags here
  // always reach the sheet's responder.
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    position: 'relative',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
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
  scroll: {
    flexGrow: 0,
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
