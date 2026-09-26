import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { contrastText, glassColors } from '@/constants/Glass';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface ReplyComposerProps {
  onSubmit: (text: string) => void;
  /** Disables input and send while a submission is in flight. */
  sending?: boolean;
  /** Tab accent for the send button (defaults to theme tint). */
  accent?: string;
}

export default function ReplyComposer({ onSubmit, sending = false, accent }: ReplyComposerProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const glass = glassColors(scheme, accent ?? colors.tint);
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [keyboardShown, setKeyboardShown] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardShown(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const sendAccent = accent ?? colors.tint;
  const canSubmit = text.trim().length > 0 && !sending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderTopColor: glass.glassBorder,
          backgroundColor: glass.glass,
          // KAV already lifts the composer while the keyboard is open — only
          // the home-indicator inset is needed when it's closed.
          paddingBottom: keyboardShown ? spacing.sm : Math.max(insets.bottom, spacing.sm),
        },
      ]}>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: glass.glassFaint, borderColor: glass.glassBorder },
        ]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Write a reply..."
          placeholderTextColor={colors.mutedText}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          editable={!sending}
          returnKeyType="default"
          accessibilityLabel="Write a reply"
        />
      </View>
      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: canSubmit ? sendAccent : glass.glassStrong,
          },
          pressed && canSubmit && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Post reply">
        <Text
          style={[
            styles.sendButtonText,
            { color: canSubmit ? contrastText(sendAccent) : colors.mutedText },
          ]}>
          Reply
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm + 2,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 112,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  sendButton: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  sendButtonText: {
    ...typography.label,
    fontWeight: '600',
  },
});
