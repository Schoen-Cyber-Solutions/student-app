import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { glassColors } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useTextMode, useThemedColors } from './TabTextMode';

interface ChatSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Tab accent for the focused search icon. */
  accent?: string;
  placeholder?: string;
}

/** Glass search field for Chat screens. Debouncing happens in the parent. */
export default function ChatSearchBar({ value, onChange, accent, placeholder = 'Search discussions' }: ChatSearchBarProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemedColors();
  const glass = glassColors(scheme, accent ?? colors.tint, useTextMode());

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: glass.glassStrong, borderColor: glass.glassBorder },
      ]}>
      <SymbolView name="magnifyingglass" tintColor={colors.mutedText} size={15} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedText}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search discussions"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search">
          <SymbolView name="xmark.circle.fill" tintColor={colors.mutedText} size={16} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  input: {
    flex: 1,
    ...typography.bodyRegular,
    fontSize: 15,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
});
