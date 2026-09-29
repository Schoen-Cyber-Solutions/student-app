import { StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import { readableAccent } from '@/constants/Glass';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useThemedColors } from './TabTextMode';

interface SectionHeaderProps {
  title: string;
  /** Short trailing detail, e.g. a count or date. */
  detail?: string;
  /** Tab accent — the title follows it; detail stays neutral. */
  accent?: string;
}

export default function SectionHeader({ title, detail, accent }: SectionHeaderProps) {
  const scheme = useColorScheme();
  const colors = useThemedColors();
  return (
    <View style={styles.row} accessibilityRole="header">
      <Text
        style={[
          styles.title,
          accent ? { color: readableAccent(accent, scheme === 'dark' ? 'dark' : 'light') } : null,
        ]}>
        {title}
      </Text>
      {detail ? (
        <Text
          style={[
            styles.detail,
            accent
              ? styles.detailAccent
              : null,
            { color: accent ? readableAccent(accent, scheme === 'dark' ? 'dark' : 'light') : colors.secondaryText },
          ]}>
          {detail}
        </Text>
      ) : null}
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
  // Accent details (e.g. "3 scheduled", "4 due") are count badges in the
  // tab's accent language — larger and heavier than neutral metadata.
  detailAccent: {
    fontSize: 15,
    fontWeight: '700',
  },
});
