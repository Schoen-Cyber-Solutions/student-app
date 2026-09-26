import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';
import { contrastText, glassColors } from '@/constants/Glass';
import { useCalendarAccent } from '@/utils/calendarAccent';
import { useColorScheme } from './useColorScheme';

export type CalendarView = 'day' | 'week' | 'month';

interface CalendarViewSwitcherProps {
  active: CalendarView;
  onChange: (view: CalendarView) => void;
}

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export default function CalendarViewSwitcher({ active, onChange }: CalendarViewSwitcherProps) {
  const colors = glassColors(useColorScheme() === 'dark' ? 'dark' : 'light', useCalendarAccent());

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.glass, borderColor: colors.glassBorder },
      ]}>
      {VIEWS.map((v) => {
        const isActive = v.key === active;
        return (
          <Pressable
            key={v.key}
            onPress={() => onChange(v.key)}
            style={[
              styles.pill,
              isActive && {
                backgroundColor: colors.accent,
                shadowColor: '#312E81',
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={v.label}>
            <Text
              style={[
                styles.label,
                { color: isActive ? contrastText(colors.accent) : colors.secondaryText },
              ]}>
              {v.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm - 1,
    borderRadius: radius.pill,
  },
  label: {
    ...typography.label,
    fontSize: 13,
  },
});
