import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import { useColorScheme } from './useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/Theme';
import WheelPicker from './WheelPicker';

export interface TimeValue {
  hour24: number; // 0-23
  minute: number; // 0-59
}

const HOURS12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const MERIDIEM = ['AM', 'PM'];

export function formatTimeValue(t: TimeValue): string {
  const h12 = t.hour24 % 12 === 0 ? 12 : t.hour24 % 12;
  return `${h12}:${String(t.minute).padStart(2, '0')} ${t.hour24 < 12 ? 'AM' : 'PM'}`;
}

/** Convert a wheel selection to 24h. */
function to24(hourIndex: number, meridiemIndex: number): number {
  const h12 = HOURS12[hourIndex];
  return (h12 % 12) + (meridiemIndex === 1 ? 12 : 0);
}

interface TimeWheelFieldProps {
  /** 'HH:MM' 24-hour string or '' when unset. */
  value: string;
  onChange: (hhmm: string) => void;
  expanded: boolean;
  onToggle: () => void;
  /** Show a clear affordance (optional end time). */
  onClear?: () => void;
}

/**
 * Tappable time field that expands into a 3-column wheel picker
 * (hour | minute | AM/PM). Value is stored as 'HH:MM' 24h internally —
 * identical to the previous manual-entry format.
 */
export default function TimeWheelField({
  value,
  onChange,
  expanded,
  onToggle,
  onClear,
}: TimeWheelFieldProps) {
  const colors = Colors[useColorScheme()];

  const parsed = useMemo<TimeValue | null>(() => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h > 23 || min > 59) return null;
    return { hour24: h, minute: min };
  }, [value]);

  // Wheel position: parsed value, or a sensible default (next hour) when
  // the field is empty so the wheels land somewhere useful.
  const wheel = useMemo<TimeValue>(() => {
    if (parsed) return parsed;
    const now = new Date();
    const h = now.getMinutes() > 0 ? (now.getHours() + 1) % 24 : now.getHours();
    return { hour24: h, minute: 0 };
  }, [parsed]);

  const hourIndex = HOURS12.indexOf(wheel.hour24 % 12 === 0 ? 12 : wheel.hour24 % 12);
  const meridiemIndex = wheel.hour24 < 12 ? 0 : 1;

  const emit = (hIdx: number, mIdx: number, merIdx: number) => {
    const h = to24(hIdx, merIdx);
    onChange(`${String(h).padStart(2, '0')}:${String(MINUTES[mIdx]).padStart(2, '0')}`);
  };

  return (
    <View>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.field,
          { borderColor: colors.cardBorder, backgroundColor: colors.surface },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={value ? `Time ${formatTimeValue(wheel)}` : 'Pick a time'}>
        <Text style={[styles.fieldText, { color: value ? colors.text : colors.mutedText }]}>
          {value ? formatTimeValue(wheel) : 'Tap to set'}
        </Text>
        <View style={styles.fieldIcons}>
          {onClear && value ? (
            <Pressable onPress={onClear} hitSlop={8} accessibilityLabel="Clear time">
              <SymbolView name="xmark.circle.fill" tintColor={colors.mutedText} size={18} />
            </Pressable>
          ) : null}
          <SymbolView
            name={expanded ? 'chevron.up' : 'chevron.down'}
            tintColor={colors.mutedText}
            size={14}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.wheels}>
          <View style={styles.wheelCol}>
            <WheelPicker
              items={HOURS12}
              selectedIndex={hourIndex}
              onSelect={(i) => emit(i, wheel.minute, meridiemIndex)}
              textColor={colors.text}
              mutedColor={colors.mutedText}
              accentSoft={colors.cardBorder}
            />
          </View>
          <Text style={[styles.colon, { color: colors.text }]}>:</Text>
          <View style={styles.wheelCol}>
            <WheelPicker
              items={MINUTES}
              selectedIndex={wheel.minute}
              onSelect={(i) => emit(hourIndex, i, meridiemIndex)}
              renderLabel={(m) => String(m).padStart(2, '0')}
              textColor={colors.text}
              mutedColor={colors.mutedText}
              accentSoft={colors.cardBorder}
            />
          </View>
          <View style={styles.wheelCol}>
            <WheelPicker
              items={MERIDIEM}
              selectedIndex={meridiemIndex}
              onSelect={(i) => emit(hourIndex, wheel.minute, i)}
              textColor={colors.text}
              mutedColor={colors.mutedText}
              accentSoft={colors.cardBorder}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldText: {
    fontSize: 16,
  },
  fieldIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  wheelCol: {
    width: 88,
  },
  colon: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 2,
  },
});
