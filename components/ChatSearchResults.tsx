import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import { glassColors, readableAccent } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useTextMode, useThemedColors } from './TabTextMode';
import { relativeTime } from '@/utils/time';
import type { ChatSearchResult } from '@/services/api/communities';
import type { ChatSearchType } from '@/hooks/useChatSearch';

const TYPE_FILTERS: { key: ChatSearchType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'threads', label: 'Threads' },
  { key: 'replies', label: 'Replies' },
];

interface ChatSearchResultsProps {
  results: ChatSearchResult[];
  searching: boolean;
  /** Current trimmed query — distinguishes "no results" from "keep typing". */
  query: string;
  accent?: string;
  /** Hide the community name (already scoped to one community). */
  hideCommunityName?: boolean;
  /** Result-type filter; renders All/Threads/Replies chips when provided. */
  type?: ChatSearchType;
  onTypeChange?: (type: ChatSearchType) => void;
}

/** Result rows for chat search; tapping opens the owning thread. */
export default function ChatSearchResults({
  results,
  searching,
  query,
  accent,
  hideCommunityName = false,
  type,
  onTypeChange,
}: ChatSearchResultsProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemedColors();
  const glass = glassColors(scheme, accent ?? colors.tint, useTextMode());
  const badgeTint = readableAccent(accent ?? colors.tint, scheme);

  if (query.length < 2) {
    return (
      <Text style={[styles.hint, { color: colors.mutedText }]}>
        Type at least 2 characters to search.
      </Text>
    );
  }

  const chips = type && onTypeChange && (
    <View style={styles.filters}>
      {TYPE_FILTERS.map((f) => {
        const active = f.key === type;
        return (
          <Pressable
            key={f.key}
            onPress={() => onTypeChange(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: active ? glass.accentSoft : glass.glassFaint,
                borderColor: active ? badgeTint : glass.glassBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter: ${f.label}`}>
            <Text
              style={[
                styles.filterText,
                { color: active ? badgeTint : colors.secondaryText },
              ]}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (searching && results.length === 0) {
    return (
      <View style={styles.list}>
        {chips}
        <View style={styles.loading}>
          <ActivityIndicator color={accent ?? colors.tint} />
        </View>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.list}>
        {chips}
        <Text style={[styles.hint, { color: colors.mutedText }]}>
          No matches for “{query}”.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {chips}
      {results.map((r, i) => (
        <Pressable
          key={`${r.threadId}-${i}`}
          onPress={() =>
            router.push(
              `/chats/${encodeURIComponent(r.communityId)}/thread/${r.threadId}`,
            )
          }
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: glass.glass, borderColor: glass.glassBorder },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${r.type === 'thread' ? 'Thread' : 'Reply'} in ${r.threadTitle}`}>
          <View style={styles.headerRow}>
            <View style={[styles.badge, { backgroundColor: glass.accentSoft }]}>
              <Text style={[styles.badgeText, { color: badgeTint }]}>
                {r.type === 'thread' ? 'Thread' : 'Reply'}
              </Text>
            </View>
            {!hideCommunityName && (
              <Text style={[styles.community, { color: colors.mutedText }]} numberOfLines={1}>
                {r.communityName}
              </Text>
            )}
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {r.threadTitle}
          </Text>
          <Text style={[styles.snippet, { color: colors.secondaryText }]} numberOfLines={2}>
            {r.snippet}
          </Text>
          <View style={styles.metaRow}>
            <SymbolView name="person" tintColor={colors.mutedText} size={11} />
            <Text style={[styles.meta, { color: colors.mutedText }]}>
              {r.authorUsername} · {relativeTime(r.createdAt)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  loading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  list: {
    gap: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterText: {
    ...typography.caption,
    fontWeight: '600',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  community: {
    ...typography.caption,
    flex: 1,
  },
  title: {
    ...typography.label,
    fontWeight: '700',
    fontSize: 15,
  },
  snippet: {
    ...typography.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  meta: {
    ...typography.caption,
  },
});
