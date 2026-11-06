import { Pressable, StyleSheet, View, Text as RNText } from 'react-native';
import { radius } from '@/constants/Theme';
import { withAlpha } from '@/constants/Glass';

interface OverlapClusterChipProps {
  /** Number of simultaneous events collapsed into this chip. */
  count: number;
  top: number;
  height: number;
  /** Up-to-N member event colors shown as identity dots. */
  colors: string[];
  /** "5:00 PM" — cluster start. */
  startLabel: string;
  /** "6:30 PM" — cluster end. */
  endLabel: string;
  /** Opens the day view where every event is independently accessible. */
  onPress?: () => void;
}

const MAX_DOTS = 5;

/**
 * Aggregate marker for a cluster of simultaneous events whose per-column
 * width would be unreadable on a phone-width Week column. Shows the event
 * count, time range, and member colors; tapping opens Day view where the
 * events render at full column width — nothing is hidden or dropped.
 */
export default function OverlapClusterChip({
  count,
  top,
  height,
  colors,
  startLabel,
  endLabel,
  onPress,
}: OverlapClusterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { top, height: Math.max(height, 18) },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${count} overlapping events, ${startLabel} to ${endLabel}. Open day view.`}
      accessibilityHint="Shows every overlapping event at full width">
      <View style={styles.dotRow}>
        {colors.slice(0, MAX_DOTS).map((c, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: c }]} />
        ))}
        {colors.length > MAX_DOTS && (
          <RNText style={styles.dotMore}>+{colors.length - MAX_DOTS}</RNText>
        )}
      </View>
      <RNText style={styles.count} numberOfLines={1}>
        {count}
      </RNText>
      <RNText style={styles.range} numberOfLines={1}>
        {startLabel}
      </RNText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: radius.sm,
    backgroundColor: withAlpha('#334155', 0.82),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    overflow: 'hidden',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotMore: {
    fontSize: 6,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  count: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  range: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    fontVariant: ['tabular-nums'],
  },
});
