import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
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
  const colors = Colors[useColorScheme()];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {VIEWS.map((v) => {
        const isActive = v.key === active;
        return (
          <Pressable
            key={v.key}
            onPress={() => onChange(v.key)}
            style={[
              styles.pill,
              isActive && { backgroundColor: colors.tint },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={v.label}>
            <Text
              style={[
                styles.label,
                { color: isActive ? '#FFFFFF' : colors.secondaryText },
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
