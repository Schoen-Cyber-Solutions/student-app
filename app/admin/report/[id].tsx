import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import EmptyState from '@/components/EmptyState';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { relativeTime } from '@/utils/time';
import { toApiError } from '@/services/api/client';
import {
  AdminReportDetail,
  getModerationReport,
  removeContent,
  suspendUser,
  unsuspendUser,
  updateReportStatus,
} from '@/services/api/admin';
import { REPORT_REASON_LABELS, ReportReason } from '@/services/api/moderation';
import { SUSPENSION_OPTIONS } from '@/utils/suspensionOptions';

type LoadState = 'loading' | 'ready' | 'error' | 'forbidden';

/** The user a moderator may suspend — the report's target user or the
 *  reported content's author. */
function targetUserId(detail: AdminReportDetail): string | null {
  const t = detail.target;
  if (t.kind === 'user') return t.id;
  if (t.kind === 'thread' || t.kind === 'reply' || t.kind === 'attachment') return t.author.id;
  return null;
}

function targetRemoved(detail: AdminReportDetail): boolean {
  const t = detail.target;
  return t.kind === 'thread' || t.kind === 'reply' || t.kind === 'attachment' ? t.removed : true;
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = Colors[useColorScheme()];
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setDetail(await getModerationReport(id));
      setLoadState('ready');
    } catch (err) {
      const apiErr = toApiError(err);
      setLoadState(
        apiErr.kind === 'unauthorized' || apiErr.kind === 'forbidden' ? 'forbidden' : 'error',
      );
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await load();
    } catch {
      Alert.alert('Action failed', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = () => {
    if (!detail) return;
    Alert.alert('Remove this content?', 'It will no longer be visible to users.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          void run(() =>
            removeContent({
              targetType: detail.report.targetType as 'thread' | 'reply' | 'attachment',
              targetId: detail.report.targetId,
              reportId: detail.report.id,
            }),
          ),
      },
    ]);
  };

  const confirmSuspend = () => {
    const userId = detail ? targetUserId(detail) : null;
    if (!detail || !userId) return;
    Alert.alert('Suspend this user?', 'They will not be able to post while suspended.', [
      ...SUSPENSION_OPTIONS.map((o) => ({
        text: o.label,
        onPress: () =>
          void run(() =>
            suspendUser(userId, { durationHours: o.durationHours, reportId: detail.report.id }),
          ),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const confirmUnsuspend = () => {
    const userId = detail ? targetUserId(detail) : null;
    if (!detail || !userId) return;
    Alert.alert('Restore this user?', 'They will be able to post again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: () =>
          void run(() => unsuspendUser(userId, detail.report.id)),
      },
    ]);
  };

  const ActionRow = ({
    label,
    icon,
    destructive,
    onPress,
  }: {
    label: string;
    icon: string;
    destructive?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.actionRow,
        { borderBottomColor: colors.cardBorder },
        (pressed || busy) && { opacity: 0.6 },
      ]}
      accessibilityRole="button">
      <SymbolView
        name={icon as never}
        tintColor={destructive ? colors.urgent : colors.tint}
        size={18}
      />
      <Text style={[styles.actionLabel, { color: destructive ? colors.urgent : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );

  const renderTarget = () => {
    if (!detail) return null;
    const t = detail.target;
    if (t.kind === 'missing') {
      return <Text style={[styles.targetBody, { color: colors.mutedText }]}>Content no longer available</Text>;
    }
    if (t.kind === 'user') {
      const suspended = t.moderationStatus === 'suspended';
      return (
        <>
          <Text style={[styles.targetTitle, { color: colors.text }]}>@{t.username}</Text>
          <Text style={[styles.targetBody, { color: colors.secondaryText }]}>
            {t.threadCount} threads · {t.messageCount} messages · joined {relativeTime(t.createdAt)}
          </Text>
          <Text style={[styles.targetBody, { color: suspended ? colors.urgent : colors.secondaryText }]}>
            {suspended
              ? `Suspended${t.suspendedUntil ? ` until ${new Date(t.suspendedUntil).toLocaleString()}` : ' indefinitely'}`
              : 'Account active'}
          </Text>
          {t.moderationHistory.length > 0 && (
            <View style={styles.history}>
              {t.moderationHistory.map((h, i) => (
                <Text key={i} style={[styles.metaText, { color: colors.mutedText }]}>
                  {h.actionType.replace(/_/g, ' ')} · {relativeTime(h.createdAt)}
                </Text>
              ))}
            </View>
          )}
        </>
      );
    }
    const title = t.kind === 'thread' ? t.title : t.kind === 'reply' ? t.body : `${t.mimeType} image`;
    const community =
      t.kind === 'attachment' || t.kind === 'reply' ? t.thread?.communityName : t.communityName;
    const threadTitle = t.kind === 'attachment' || t.kind === 'reply' ? t.thread?.title : undefined;
    return (
      <>
        <Text style={[styles.targetTitle, { color: colors.text }]}>
          {t.kind === 'attachment' ? `Image (${t.mimeType})` : title}
          {t.removed ? ' — removed' : ''}
        </Text>
        {t.kind === 'thread' && t.body.length > 0 && (
          <Text style={[styles.targetBody, { color: colors.secondaryText }]}>{t.body}</Text>
        )}
        {t.kind === 'attachment' && t.parentMessage && (
          <Text style={[styles.targetBody, { color: colors.secondaryText }]}>
            Attached to: {t.parentMessage.body || '(image-only message)'}
          </Text>
        )}
        {threadTitle && (
          <Text style={[styles.metaText, { color: colors.mutedText }]}>In: {threadTitle}</Text>
        )}
        <Text style={[styles.metaText, { color: colors.mutedText }]}>
          {t.author.username}
          {community ? ` · ${community}` : ''}
          {` · ${relativeTime(t.createdAt)}`}
        </Text>
      </>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Report', headerTitleAlign: 'left' }} />
      <ScreenWrapper>
        {loadState === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.tint} />
          </View>
        ) : loadState === 'forbidden' ? (
          <EmptyState
            title="Not authorized"
            message="Moderation review requires a moderator or admin account."
            icon="lock.shield"
          />
        ) : loadState === 'error' || !detail ? (
          <EmptyState
            title="Couldn't load report"
            message="Check your connection and try again."
            icon="wifi.exclamationmark"
            actionLabel="Retry"
            onAction={() => {
              setLoadState('loading');
              void load();
            }}
          />
        ) : (
          <>
            {/* Reported content */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.sectionPad}>{renderTarget()}</View>
            </View>

            {/* Report context */}
            <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>Report</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.sectionPad}>
                <Text style={[styles.targetTitle, { color: colors.text }]}>
                  {REPORT_REASON_LABELS[detail.report.reason as ReportReason] ?? detail.report.reason}
                  <Text style={{ color: colors.mutedText }}>{`  ·  ${detail.report.status}`}</Text>
                </Text>
                {detail.report.details && (
                  <Text style={[styles.targetBody, { color: colors.secondaryText }]}>
                    “{detail.report.details}”
                  </Text>
                )}
                <Text style={[styles.metaText, { color: colors.mutedText }]}>
                  Reported by {detail.report.reporterUsername} · {relativeTime(detail.report.createdAt)}
                  {detail.allReportsForTarget.length > 1
                    ? ` · ${detail.allReportsForTarget.length} reports on this target`
                    : ''}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>Actions</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {detail.report.status === 'open' && (
                <>
                  <ActionRow
                    label="Mark Reviewed"
                    icon="eye"
                    onPress={() => void run(() => updateReportStatus(detail.report.id, 'reviewed'))}
                  />
                  <ActionRow
                    label="Dismiss Report"
                    icon="xmark.circle"
                    onPress={() => void run(() => updateReportStatus(detail.report.id, 'dismissed'))}
                  />
                </>
              )}
              {!targetRemoved(detail) &&
                detail.report.status !== 'dismissed' &&
                (detail.report.targetType !== 'user') && (
                  <ActionRow
                    label="Remove Content"
                    icon="trash"
                    destructive
                    onPress={confirmRemove}
                  />
                )}
              {targetUserId(detail) && detail.report.status !== 'dismissed' && (
                detail.target.kind === 'user' && detail.target.moderationStatus === 'suspended' ? (
                  <ActionRow label="Unsuspend User" icon="checkmark.circle" onPress={confirmUnsuspend} />
                ) : (
                  <ActionRow label="Suspend User" icon="hand.raised" destructive onPress={confirmSuspend} />
                )
              )}
            </View>
          </>
        )}
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sectionPad: {
    padding: spacing.md,
    gap: 6,
  },
  targetTitle: {
    ...typography.label,
    fontWeight: '600',
    fontSize: 15,
  },
  targetBody: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    ...typography.caption,
    fontSize: 12,
  },
  history: {
    marginTop: spacing.sm,
    gap: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    ...typography.body,
    fontSize: 15,
    flex: 1,
  },
});
