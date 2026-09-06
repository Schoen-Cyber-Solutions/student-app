import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface ReplyComposerProps {
  onSubmit: (text: string) => void;
}

export default function ReplyComposer({ onSubmit }: ReplyComposerProps) {
  const colors = Colors[useColorScheme()];
  const [text, setText] = useState('');

  const canSubmit = text.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.divider, backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Write a reply..."
        placeholderTextColor={colors.mutedText}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        accessibilityLabel="Write a reply"
      />
      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.sendButton,
          { backgroundColor: canSubmit ? colors.tint : colors.mutedText },
          pressed && canSubmit && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Post reply">
        <Text style={styles.sendButtonText}>Reply</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  input: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  sendButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonText: {
    ...typography.label,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
