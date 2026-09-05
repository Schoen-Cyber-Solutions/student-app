import { StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface SectionHeaderProps {
  title: string;
  /** Short trailing detail, e.g. a count or date. */
  detail?: string;
}

export default function SectionHeader({ title, detail }: SectionHeaderProps) {
  const colors = Colors[useColorScheme()];
  return (
    <View style={styles.row} accessibilityRole="header">
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={[styles.detail, { color: colors.secondaryText }]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
  },
  detail: {
    ...typography.label,
  },
});
