import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { getCampusEvents, CampusEvent, CampusEventsResponse } from '@/services/api/events';
import { formatTime12 } from '@/utils/time';
import { isSafeExternalUrl } from '@/utils/externalLinks';

/** Map raw source categories onto the app's fixed filter buckets. */
function categoryBucket(category: string | null): string {
  const c = (category ?? '').toLowerCase();
  if (/career|job|intern|employ/.test(c)) return 'Career';
  if (/club|organization|leadership|fratern|sororit/.test(c)) return 'Clubs';
  if (/sport|athlet|game|laker sports/.test(c)) return 'Sports';
  if (/social|party|mixer|res hall|fun/.test(c)) return 'Social';
  if (/academ|learning|lecture|common hour|workshop|study|tutor|conference|seminar/.test(c)) return 'Academic';
  return 'Other';
}

const BUCKET_ORDER = ['All', 'Career', 'Clubs', 'Sports', 'Social', 'Academic', 'Other'];

function EventCard({ event }: { event: CampusEvent }) {
  const colors = Colors[useColorScheme()];
  const start = new Date(event.startAt);
  const bucket = categoryBucket(event.category);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        pressed && { opacity: 0.8 },
        event.isCancelled && { opacity: 0.6 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${start.toLocaleDateString()}`}>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.chip, { backgroundColor: colors.tintSoft }]}>
            <Text style={[styles.chipText, { color: colors.tint }]}>{bucket}</Text>
          </View>
          {event.isCancelled ? (
            <Text style={[styles.cancelled, { color: colors.urgent }]}>Cancelled</Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.cardTitle,
            { color: colors.text },
            event.isCancelled && { textDecorationLine: 'line-through' },
          ]}
          numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <SymbolView name="calendar" tintColor={colors.mutedText} size={13} />
          <Text style={[styles.cardMeta, { color: colors.secondaryText }]}>
            {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' · '}
            {formatTime12(start)}
          </Text>
        </View>
        {event.location ? (
          <View style={styles.metaRow}>
            <SymbolView name="mappin.and.ellipse" tintColor={colors.mutedText} size={13} />
            <Text style={[styles.cardMeta, { color: colors.secondaryText }]} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        ) : null}
        {event.organization ? (
          <View style={styles.metaRow}>
            <SymbolView name="person.2" tintColor={colors.mutedText} size={13} />
            <Text style={[styles.cardOrg, { color: colors.mutedText }]} numberOfLines={1}>
              {event.organization}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function CampusEventsScreen() {
  const colors = Colors[useColorScheme()];
  const [data, setData] = useState<CampusEventsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [bucket, setBucket] = useState('All');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      getCampusEvents({ q: query.trim() || undefined })
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch(() => setError('Could not load events. Please try again.'));
    }, 250);
    return () => clearTimeout(t);
  }, [query, reloadTick]);

  // Category chips only for buckets that actually appear in the data.
  const buckets = useMemo(() => {
    const present = new Set((data?.events ?? []).map((e) => categoryBucket(e.category)));
    return BUCKET_ORDER.filter((b) => b === 'All' || present.has(b));
  }, [data]);

  const visible = useMemo(() => {
    const list = data?.events ?? [];
    return bucket === 'All' ? list : list.filter((e) => categoryBucket(e.category) === bucket);
  }, [data, bucket]);

  const openDirectory = () => {
    const url = data?.source?.directoryUrl;
    if (url && isSafeExternalUrl(url)) void Linking.openURL(url);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Campus Events', headerTitleAlign: 'left' }} />
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            {data?.university.name ?? 'Your university'}
            {data?.source ? ` · via ${data.source.providerName}` : ''}
          </Text>
        </View>

        {data?.source?.degraded ? (
          <Pressable
            onPress={openDirectory}
            style={[styles.notice, { backgroundColor: colors.tintSoft, borderColor: colors.tint }]}>
            <Text style={[styles.noticeText, { color: colors.text }]}>
              Event list may be out of date — browse {data.source.providerName} for the latest.
            </Text>
          </Pressable>
        ) : null}

        <View style={[styles.searchRow, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
          <SymbolView name="magnifyingglass" tintColor={colors.mutedText} size={16} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search events"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {buckets.length > 1 ? (
          <View style={styles.chipRow}>
            {buckets.map((b) => (
              <Pressable
                key={b}
                onPress={() => setBucket(b)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: bucket === b ? colors.tint : colors.cardBorder,
                    backgroundColor: bucket === b ? colors.tintSoft : colors.surface,
                  },
                ]}>
                <Text style={{ color: bucket === b ? colors.tint : colors.text, fontSize: 13 }}>{b}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? (
          <EmptyState
            title="Couldn't load events"
            message={error}
            icon="exclamationmark.triangle"
            actionLabel="Retry"
            onAction={() => setReloadTick((n) => n + 1)}
          />
        ) : !data ? (
          <EmptyState title="Loading events" message="Fetching your university's events…" icon="calendar" />
        ) : !data.source ? (
          <EmptyState
            title="Events not connected"
            message={`${data.university.name} doesn't have an events source configured yet.`}
            icon="calendar.badge.exclamationmark"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={query || bucket !== 'All' ? 'No matching events' : 'No upcoming events'}
            message={
              query || bucket !== 'All'
                ? 'Try a different search or filter.'
                : 'Check back later — or browse the full directory.'
            }
            icon="calendar"
            actionLabel={data.source.directoryUrl ? 'Open Laker Connect' : undefined}
            onAction={openDirectory}
          />
        ) : (
          <View style={styles.list}>
            {visible.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </View>
        )}
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    fontSize: 14,
  },
  notice: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    ...typography.caption,
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardBody: {
    padding: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  cancelled: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  cardTitle: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 21,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  cardMeta: {
    ...typography.caption,
    fontSize: 13,
    flex: 1,
  },
  cardOrg: {
    ...typography.caption,
    fontSize: 12,
    flex: 1,
  },
});
