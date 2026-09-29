import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { applyRecurringAssignmentRule, RecurringPreview } from '@/services/api/calendar';
import { Text } from './Themed';
import { useThemedColors } from './TabTextMode';
import { radius, spacing, typography } from '@/constants/Theme';

interface RecurringAssignSheetProps {
  visible: boolean;
  /** Event that anchored the series (the one the user just assigned). */
  eventId: string | null;
  /** The CourseSection the user picked — the rule assigns this to the series. */
  courseSectionId: string | null;
  /** Human label for the picked course, e.g. "CSIA 301 · 01". */
  courseLabel: string;
  recurring: RecurringPreview | null;
  /** Called after the server-side backfill completes so parents can refresh. */
  onApplied: () => void;
  /** Called when the user keeps this a single-event assignment or cancels. */
  onClose: () => void;
}

/**
 * Confirmation sheet shown after a manual course assignment when the backend
 * detects a reliable weekly series. "This assignment only" leaves the
 * already-saved single assignment as-is; "All matching" creates the rule and
 * backfills the series.
 */
export default function RecurringAssignSheet({
  visible,
  eventId,
  courseSectionId,
  courseLabel,
  recurring,
  onApplied,
  onClose,
}: RecurringAssignSheetProps) {
  const colors = useThemedColors();
  const [saving, setSaving] = useState(false);

  const count = recurring?.matchCount ?? 0;

  const sampleDates = (recurring?.sampleStartAts ?? []).map((iso) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  );

  const applyToAll = () => {
    if (!eventId || !courseSectionId || saving) return;
    setSaving(true);
    applyRecurringAssignmentRule(eventId, courseSectionId)
      .then(() => {
        onClose();
        onApplied();
      })
      .catch(() => {
        Alert.alert('Could not apply to series', 'Please try again.');
      })
      .finally(() => setSaving(false));
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
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Apply {courseLabel} to {count} matching assignment{count === 1 ? '' : 's'}?
          </Text>
          <Text style={[styles.body, { color: colors.secondaryText }]}>
            These appear to be a weekly series with the same due time
            {sampleDates.length ? ` — e.g. ${sampleDates.join(', ')}` : ''}.
            Future imports in this series will be assigned automatically.
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              { borderColor: colors.cardBorder },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="This assignment only">
            <Text style={[styles.buttonText, { color: colors.text }]}>
              This assignment only
            </Text>
          </Pressable>

          <Pressable
            onPress={applyToAll}
            disabled={saving}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint },
              (pressed || saving) && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Apply ${courseLabel} to all matching assignments`}>
            <SymbolView name="checkmark" tintColor="#FFFFFF" size={14} />
            <Text style={styles.primaryButtonText}>
              {saving ? 'Applying…' : `All ${count + 1} matching assignments`}
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <Text style={[styles.cancelText, { color: colors.mutedText }]}>Cancel</Text>
          </Pressable>
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
    paddingHorizontal: spacing.lg,
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  body: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  buttonText: {
    ...typography.bodyRegular,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButtonText: {
    ...typography.bodyRegular,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    ...typography.bodyRegular,
    fontSize: 15,
  },
});
