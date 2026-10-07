import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
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
  AdminReportItem,
  AdminReportStatus,
  getModerationReports,
} from '@/services/api/admin';
import { REPORT_REASON_LABELS, ReportReason } from '@/services/api/moderation';

const STATUS_TABS: { id: AdminReportStatus; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'actioned', label: 'Actioned' },
];

const TARGET_LABELS: Record<string, string> = {
  thread: 'Thread',
  reply: 'Reply',
  attachment: 'Image',
  user: 'User',
};

const TARGET_ICONS: Record<string, string> = {
  thread: 'bubble.left.and.bubble.right',
  reply: 'bubble.left',
  attachment: 'photo',
  user: 'person',
};

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

export default function ModerationQueueScreen() {
  const colors = Colors[useColorScheme()];
  const [status, setStatus] = useState<AdminReportStatus>('open');
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const load = useCallback(async (s: AdminReportStatus) => {
    try {
      const data = await getModerationReports({ status: s });
      setReports(data);
      setLoadState('ready');
    } catch (err) {
      const apiErr = toApiError(err);
      setLoadState(
        apiErr.kind === 'unauthorized' || apiErr.kind === 'forbidden' ? 'forbidden' : 'error',
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
      void load(status);
    }, [load, status]),
  );

  const previewOf = (item: AdminReportItem): string => {
    const t = item.target;
    if (t.kind === 'missing') return 'Content no longer available';
    if (t.title) return t.title;
    if (t.excerpt) return t.excerpt;
    return TARGET_LABELS[t.kind] ?? t.kind;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Moderation', headerTitleAlign: 'left' }} />
      <ScreenWrapper>
        <View style={styles.tabs}>
          {STATUS_TABS.map((tab) => {
            const active = tab.id === status;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setStatus(tab.id)}
                style={[
                  styles.tab,
                  { borderColor: colors.cardBorder },
                  active && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? '#FFFFFF' : colors.secondaryText },
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
        ) : loadState === 'error' ? (
          <EmptyState
            title="Couldn't load reports"
            message="Check your connection and try again."
            icon="wifi.exclamationmark"
            actionLabel="Retry"
            onAction={() => {
              setLoadState('loading');
              void load(status);
            }}
          />
        ) : reports.length === 0 ? (
          <EmptyState
            title={`No ${status} reports`}
            message="Reports submitted by users appear here."
            icon="checkmark.shield"
          />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {reports.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/admin/report/${item.id}`)}
                style={({ pressed }) => [
                  styles.reportRow,
                  index < reports.length - 1 && {
                    borderBottomColor: colors.cardBorder,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${TARGET_LABELS[item.targetType] ?? item.targetType} report, ${item.reason}`}>
                <View style={[styles.iconWrap, { backgroundColor: colors.cardBorder }]}>
                  <SymbolView
                    name={(TARGET_ICONS[item.targetType] ?? 'flag') as never}
                    tintColor={colors.secondaryText}
                    size={18}
                  />
                </View>
                <View style={styles.reportBody}>
                  <View style={styles.reportHeader}>
                    <Text style={[styles.reportTitle, { color: colors.text }]} numberOfLines={1}>
                      {TARGET_LABELS[item.targetType] ?? item.targetType}
                      {' · '}
                      {REPORT_REASON_LABELS[item.reason as ReportReason] ?? item.reason}
                    </Text>
                    {item.reportCount > 1 && (
                      <Text style={[styles.countBadge, { color: colors.tint }]}>
                        ×{item.reportCount}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.preview, { color: colors.secondaryText }]} numberOfLines={2}>
                    {previewOf(item)}
                    {item.target.removed ? ' (removed)' : ''}
                  </Text>
                  <Text style={[styles.meta, { color: colors.mutedText }]} numberOfLines={1}>
                    {relativeTime(item.createdAt)} · by {item.reporterUsername}
                  </Text>
                </View>
                <SymbolView name="chevron.right" tintColor={colors.mutedText} size={13} />
              </Pressable>
            ))}
          </View>
        )}
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 13,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBody: {
    flex: 1,
    gap: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reportTitle: {
    ...typography.label,
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
  },
  countBadge: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  preview: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 17,
  },
  meta: {
    ...typography.caption,
    fontSize: 12,
  },
});
