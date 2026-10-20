import { StyleSheet, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

interface Props {
  /** 1-based index of the current step. */
  current: number;
  total?: number;
}

/**
 * Unobtrusive step indicator for the onboarding flow. The dots themselves
 * are decorative — the parent exposes a single "Step N of M" announcement.
 */
export default function OnboardingProgress({ current, total = 5 }: Props) {
  const colors = Colors[useColorScheme()];
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Step ${current} of ${total}`}
      accessibilityRole="progressbar">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <View
            key={step}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.dot,
              active && styles.dotActive,
              {
                backgroundColor: done || active ? colors.tint : colors.cardBorder,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
  },
});
