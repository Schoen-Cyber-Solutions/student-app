import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import { useColorScheme } from './useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import {
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  ReportReason,
  ReportTargetType,
  submitReport,
} from '@/services/api/moderation';
import { toApiError } from '@/services/api/client';

export interface ReportTarget {
  targetType: ReportTargetType;
  targetId: string;
}

interface ReportSheetProps {
  /** The content being reported, or null when the sheet is closed. */
  target: ReportTarget | null;
  onClose: () => void;
  /** Called once after a successful submission (sheet already closed). */
  onSubmitted?: () => void;
}

/**
 * "Why are you reporting this?" sheet — reason list, optional details for
 * "Other", then Submit Report. Deliberately quiet: no legal language, no
 * promises about what moderation will do.
 */
export default function ReportSheet({ target, onClose, onSubmitted }: ReportSheetProps) {
  const colors = Colors[useColorScheme()];
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state each time the sheet opens for a new target.
  const [lastTarget, setLastTarget] = useState<ReportTarget | null>(target);
  if (target !== lastTarget) {
    setLastTarget(target);
    setReason(null);
    setDetails('');
    setSubmitting(false);
    setError(null);
  }

  const submit = async () => {
    if (!target || !reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({
        targetType: target.targetType,
        targetId: target.targetId,
        reason,
        details: reason === 'other' ? details : undefined,
      });
      onClose();
      onSubmitted?.();
    } catch (err) {
      const apiErr = toApiError(err);
      setError(
        apiErr.kind === 'not_found'
          ? 'This content is no longer available.'
          : 'Check your connection and try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => {}}>
          <Text style={[styles.title, { color: colors.text }]}>
            Why are you reporting this?
          </Text>

          {REPORT_REASONS.map((r) => {
            const selected = r === reason;
            return (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                style={[styles.reasonRow, { borderBottomColor: colors.cardBorder }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Text style={[styles.reasonLabel, { color: colors.text }]}>
                  {REPORT_REASON_LABELS[r]}
                </Text>
                <SymbolView
                  name={selected ? 'checkmark.circle.fill' : 'circle'}
                  tintColor={selected ? colors.tint : colors.mutedText}
                  size={20}
                />
              </Pressable>
            );
          })}

          {reason === 'other' && (
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Tell us more (optional)"
              placeholderTextColor={colors.mutedText}
              multiline
              maxLength={500}
              style={[
                styles.detailsInput,
                { color: colors.text, borderColor: colors.cardBorder },
              ]}
            />
          )}

          {error && (
            <Text style={[styles.error, { color: colors.urgent }]}>{error}</Text>
          )}

          <Pressable
            onPress={() => void submit()}
            disabled={!reason || submitting}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.tint },
              (!reason || submitting) && { opacity: 0.5 },
              pressed && reason && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Submit report">
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitText}>Submit Report</Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 17,
    marginBottom: spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  reasonLabel: {
    ...typography.body,
    fontSize: 15,
    flex: 1,
  },
  detailsInput: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.caption,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
