import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import { useColorScheme } from './useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/Theme';
import { monthGridRows } from '@/utils/monthGrid';
import { formatWeekdayShort, isSameCalendarDay } from '@/utils/time';

interface DatePickerModalProps {
  visible: boolean;
  /** Currently selected date; null = nothing selected yet. */
  value: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Compact month-grid date picker — no native dependency; works in any
 *  Expo dev build. Tapping a day selects it and closes the sheet. */
export default function DatePickerModal({ visible, value, onSelect, onClose }: DatePickerModalProps) {
  const colors = Colors[useColorScheme()];
  const today = new Date();
  const [cursor, setCursor] = useState<Date>(value ?? today);

  // Reset the viewed month to the current value each time the sheet opens.
  const [lastVisible, setLastVisible] = useState(visible);
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) setCursor(value ?? today);
  }

  const weeks = useMemo(() => monthGridRows(cursor), [cursor]);
  const cursorMonth = cursor.getMonth();

  const shift = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => {}}>
          <View style={styles.header}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.arrow}>
              <SymbolView name="chevron.left" tintColor={colors.tint} size={20} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>
              {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable onPress={() => shift(1)} hitSlop={10} style={styles.arrow}>
              <SymbolView name="chevron.right" tintColor={colors.tint} size={20} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LETTERS.map((l, i) => (
              <Text key={i} style={[styles.weekday, { color: colors.mutedText }]}>
                {l}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day) => {
                const inMonth = day.getMonth() === cursorMonth;
                const isToday = isSameCalendarDay(day, today);
                const selected = value ? isSameCalendarDay(day, value) : false;
                return (
                  <Pressable
                    key={day.toDateString()}
                    onPress={() => {
                      onSelect(day);
                      onClose();
                    }}
                    style={[
                      styles.cell,
                      selected && { backgroundColor: colors.tint },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={formatWeekdayShort(day) + ', ' + day.toDateString()}>
                    <View style={[styles.dayWrap, isToday && !selected && { borderColor: colors.tint, borderWidth: 1 }]}>
                      <Text
                        style={[
                          styles.dayText,
                          { color: !inMonth ? colors.mutedText : selected ? '#FFFFFF' : colors.text },
                          isToday && !selected && { color: colors.tint },
                        ]}>
                        {day.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  arrow: {
    padding: spacing.sm,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  dayWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 15,
  },
});
