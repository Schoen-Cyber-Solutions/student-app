import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from './Themed';
import { useColorScheme } from './useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';

/**
 * iOS-style wheel picker for a single time value (minutes after midnight).
 * Three snap-to columns — hour, minute, AM/PM — inside a bottom sheet.
 * Used by Settings for the Day/Week visible-range endpoints; validation
 * (start < end, bounds) is the caller's job — this only reports a choice.
 */

const ITEM_H = 36;
const VISIBLE_ROWS = 5;
const WHEEL_H = ITEM_H * VISIBLE_ROWS;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0–59
const PERIODS = ['AM', 'PM'] as const;

interface CalendarTimePickerSheetProps {
  visible: boolean;
  /** Sheet title, e.g. "Start Time". */
  title: string;
  /** Current value, minutes after midnight (1440 renders as 12:00 AM). */
  valueMin: number;
  onDone: (minutes: number) => void;
  onCancel: () => void;
}

interface WheelProps<T> {
  items: readonly T[];
  selected: number;
  onSelect: (index: number) => void;
  label: (item: T) => string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  resetKey: number;
}

function Wheel<T>({
  items,
  selected,
  onSelect,
  label,
  textColor,
  mutedColor,
  accentColor,
  resetKey,
}: WheelProps<T>) {
  const ref = useRef<ScrollView>(null);

  // Snap the wheel to the incoming value when the sheet opens.
  useEffect(() => {
    requestAnimationFrame(() => {
      ref.current?.scrollTo({ y: selected * ITEM_H, animated: false });
    });
    // resetKey re-arms the jump each time the sheet re-opens.
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.max(
      0,
      Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)),
    );
    onSelect(idx);
  };

  return (
    <ScrollView
      ref={ref}
      style={styles.wheel}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      onMomentumScrollEnd={handleEnd}
      contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}>
      {items.map((item, i) => (
        <View key={i} style={styles.wheelItem}>
          <Text
            style={[
              styles.wheelText,
              { color: i === selected ? accentColor : mutedColor },
              i === selected && styles.wheelTextSelected,
            ]}>
            {label(item)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export default function CalendarTimePickerSheet({
  visible,
  title,
  valueMin,
  onDone,
  onCancel,
}: CalendarTimePickerSheetProps) {
  const colors = Colors[useColorScheme()];
  // Bump on every open so the wheels re-snap to the persisted value.
  const [resetKey, setResetKey] = useState(0);
  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const v = valueMin >= 24 * 60 ? 0 : valueMin;
    setHour(Math.floor(v / 60) % 12 || 12);
    setMinute(v % 60);
    setPm(Math.floor(v / 60) >= 12);
    setResetKey((k) => k + 1);
  }, [visible, valueMin]);

  const commit = () => {
    onDone(((hour % 12) + (pm ? 12 : 0)) * 60 + minute);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.headerButton, { color: colors.mutedText }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={commit} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.headerButton, { color: colors.tint, fontWeight: '700' }]}>
                Done
              </Text>
            </Pressable>
          </View>

          <View style={styles.wheels}>
            {/* Selection highlight band behind the wheel columns. */}
            <View
              pointerEvents="none"
              style={[
                styles.selectionBand,
                { borderColor: colors.cardBorder },
              ]}
            />
            <Wheel
              items={HOURS}
              selected={HOURS.indexOf(hour)}
              onSelect={(i) => setHour(HOURS[i])}
              label={(h) => String(h)}
              textColor={colors.text}
              mutedColor={colors.mutedText}
              accentColor={colors.text}
              resetKey={resetKey}
            />
            <Wheel
              items={MINUTES}
              selected={minute}
              onSelect={setMinute}
              label={(m) => String(m).padStart(2, '0')}
              textColor={colors.text}
              mutedColor={colors.mutedText}
              accentColor={colors.text}
              resetKey={resetKey}
            />
            <Wheel
              items={PERIODS}
              selected={pm ? 1 : 0}
              onSelect={(i) => setPm(i === 1)}
              label={(p) => p}
              textColor={colors.text}
              mutedColor={colors.mutedText}
              accentColor={colors.text}
              resetKey={resetKey}
            />
          </View>
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
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  headerButton: {
    ...typography.body,
    fontSize: 16,
  },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: WHEEL_H,
  },
  selectionBand: {
    position: 'absolute',
    top: ITEM_H * 2,
    left: spacing.lg,
    right: spacing.lg,
    height: ITEM_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wheel: {
    width: 88,
    height: WHEEL_H,
  },
  wheelItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    ...typography.body,
    fontSize: 17,
  },
  wheelTextSelected: {
    fontWeight: '700',
  },
});
