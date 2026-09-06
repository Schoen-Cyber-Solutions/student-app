import { StyleSheet, View } from 'react-native';
import { SuggestedCategory } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

const suggestedLabels: Record<SuggestedCategory, string> = {
  general: 'General',
  exam: 'Exam',
  assignment: 'Assignment',
  'study-group': 'Study Group',
};

const suggestedColors: Record<SuggestedCategory, { bg: string; text: string }> = {
  general: { bg: '#F1F5F9', text: '#475569' },
  exam: { bg: '#FEF2F2', text: '#991B1B' },
  assignment: { bg: '#EFF6FF', text: '#1D4ED8' },
  'study-group': { bg: '#ECFDF5', text: '#047857' },
};

const darkSuggestedColors: Record<SuggestedCategory, { bg: string; text: string }> = {
  general: { bg: '#1E293B', text: '#94A3B8' },
  exam: { bg: '#3F1D1D', text: '#FCA5A5' },
  assignment: { bg: '#172554', text: '#93C5FD' },
  'study-group': { bg: '#064E3B', text: '#6EE7B7' },
};

const customLight = { bg: '#F3E8FF', text: '#6B21A8' };
const customDark = { bg: '#3B0764', text: '#E9D5FF' };

interface ThreadCategoryBadgeProps {
  category: string;
}

export default function ThreadCategoryBadge({ category }: ThreadCategoryBadgeProps) {
  const colorScheme = useColorScheme();
  const isSuggested = category in suggestedLabels;
  const palette = colorScheme === 'dark' ? darkSuggestedColors : suggestedColors;
  const colors = isSuggested
    ? palette[category as SuggestedCategory]
    : colorScheme === 'dark'
      ? customDark
      : customLight;

  const label = isSuggested
    ? suggestedLabels[category as SuggestedCategory]
    : category;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
});
