import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { getCalendarStatus, syncCalendar } from '@/services/api/me';
import { useMyCalendar } from '@/hooks/useMyCalendar';
import { useCourseColors } from '@/hooks/useCourseColors';
import { deletePersonalEvent, MyCalendarEvent } from '@/services/api/calendar';
import { toApiError } from '@/services/api/client';

const COLOR_OPTIONS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F43F5E',
  '#6366F1',
  '#14B8A6',
];

function deriveCourseCode(event: MyCalendarEvent): string | null {
  if (event.provider === 'personal') return null;
  return event.courseCode ?? event.courseName ?? null;
}

export default function CalendarEditScreen() {
  const colors = Colors[useColorScheme()];
  const [status, setStatus] = useState<{ connected: boolean; provider: string | null; eventCount: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');

  const now = useMemo(() => new Date(), []);
  const wideRange = useMemo(
    () => ({
      from: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString(),
    }),
    [now]
  );

  const { events, refresh } = useMyCalendar(wideRange);
  const { colors: courseColors, setCourseColor, loading: savingColor } = useCourseColors();

  const loadStatus = useCallback(async () => {
    try {
      const s = await getCalendarStatus();
      setStatus({ connected: s.connected, provider: s.provider, eventCount: s.eventCount });
    } catch {
      setStatus({ connected: false, provider: null, eventCount: 0 });
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const courseCodes = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      const code = deriveCourseCode(e);
      if (code) set.add(code);
    }
    return Array.from(set).sort();
  }, [events]);

  const personalEvents = useMemo(
    () => events.filter((e) => e.provider === 'personal').sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)),
    [events]
  );

  const handleDeletePersonalEvent = (id: string, title: string) => {
    Alert.alert('Delete event', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePersonalEvent(id)
            .then(() => refresh())
            .catch(() => setSyncError('Could not delete event.'));
        },
      },
    ]);
  };

  const handleSync = async () => {
    if (!status?.connected) return;
    setSyncing(true);
    setSyncMessage('');
    setSyncError('');
    try {
      const result = await syncCalendar();
      setSyncMessage(`Synced ${result.eventsSynced} events.`);
      void loadStatus();
      refresh();
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 404) {
        setSyncError('No connected calendar.');
      } else {
        setSyncError('Could not sync calendar.');
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Calendar Options</Text>

        <Pressable
          onPress={() => router.push('/calendar-event')}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.rowText, { color: colors.text }]}>Add personal event</Text>
          <Text style={{ color: colors.tint }}>›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/calendar-connect')}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.rowText, { color: colors.text }]}>
            {status?.connected ? 'Replace calendar connection' : 'Connect calendar'}
          </Text>
          <Text style={{ color: colors.tint }}>›</Text>
        </Pressable>

        {status?.connected && (
          <Pressable
            onPress={handleSync}
            disabled={syncing}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.rowText, { color: colors.text }]}>
              {syncing ? 'Syncing…' : 'Sync calendar now'}
            </Text>
            <Text style={{ color: colors.tint }}>›</Text>
          </Pressable>
        )}

        {syncMessage ? <Text style={[styles.message, { color: colors.success }]}>{syncMessage}</Text> : null}
        {syncError ? <Text style={[styles.error, { color: colors.urgent }]}>{syncError}</Text> : null}

        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Course colors</Text>

        {courseCodes.length === 0 && (
          <Text style={[styles.empty, { color: colors.mutedText }]}>
            Connect a calendar to see courses here.
          </Text>
        )}

        {courseCodes.map((code) => (
          <View key={code} style={styles.courseRow}>
            <Text style={[styles.courseName, { color: colors.text }]}>{code}</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCourseColor(code, c)}
                  disabled={savingColor}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    (courseColors[code] ?? '') === c && styles.colorSelected,
                  ]}
                />
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Personal events</Text>

        {personalEvents.length === 0 && (
          <Text style={[styles.empty, { color: colors.mutedText }]}>
            No personal events yet.
          </Text>
        )}

        {personalEvents.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <View style={[styles.eventDot, { backgroundColor: event.color ?? '#3B82F6' }]} />
            <View style={styles.eventInfo}>
              <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
              <Text style={[styles.eventDate, { color: colors.mutedText }]}>
                {new Date(event.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/calendar-event',
                  params: { id: event.id, date: event.startAt },
                })
              }
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <Text style={{ color: colors.tint, fontSize: 14, marginRight: spacing.md }}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => handleDeletePersonalEvent(event.id, event.title)} hitSlop={8}>
              <Text style={{ color: colors.urgent, fontSize: 14 }}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    ...typography.heading,
    fontSize: 28,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  rowText: {
    ...typography.body,
    fontSize: 16,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 13,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  empty: {
    ...typography.body,
    fontSize: 14,
  },
  courseRow: {
    marginBottom: spacing.md,
  },
  courseName: {
    ...typography.label,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#000000',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: spacing.sm,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    ...typography.body,
    fontSize: 15,
  },
  eventDate: {
    ...typography.caption,
    fontSize: 12,
  },
  message: {
    ...typography.body,
    marginTop: spacing.md,
  },
  error: {
    ...typography.body,
    marginTop: spacing.md,
    color: '#DC2626',
  },
});
