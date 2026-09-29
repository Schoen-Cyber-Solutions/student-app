import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { contrastText, glassColors, readableAccent } from '@/constants/Glass';
import { radius, spacing } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useTextMode, useThemedColors } from './TabTextMode';
import { pickChatImage } from '@/utils/chatImage';
import type { ChatImageDraft } from '@/services/api/communities';

interface ReplyComposerProps {
  /** Resolves true when the message was sent; the draft clears only then. */
  onSubmit: (text: string, image: ChatImageDraft | null) => Promise<boolean>;
  /** Disables input and send while a submission is in flight. */
  sending?: boolean;
  /** Tab accent for the send button (defaults to theme tint). */
  accent?: string;
  /** Bottom space reserved while the keyboard is closed (e.g. the floating
   *  tab bar on Chat subpages). Defaults to the home-indicator inset. */
  reservedBottom?: number;
}

export default function ReplyComposer({ onSubmit, sending = false, accent, reservedBottom }: ReplyComposerProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemedColors();
  const glass = glassColors(scheme, accent ?? colors.tint, useTextMode());
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [image, setImage] = useState<ChatImageDraft | null>(null);
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
  const iconTint = readableAccent(sendAccent, scheme);
  const canSubmit = (text.trim().length > 0 || image !== null) && !sending;

  const handlePickImage = async () => {
    const picked = await pickChatImage();
    // Canceled/failed picks keep the existing draft untouched.
    if (picked) setImage(picked);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const ok = await onSubmit(text.trim(), image);
    if (ok) {
      setText('');
      setImage(null);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          // KAV already lifts the composer while the keyboard is open — only
          // a small pad is needed then; closed keyboard reserves space for the
          // floating tab bar (or the home-indicator inset off the tabs).
          paddingBottom: keyboardShown
            ? spacing.sm
            : reservedBottom ?? Math.max(insets.bottom, spacing.sm),
        },
      ]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: glass.glass,
            borderColor: glass.glassBorder,
            shadowOpacity: scheme === 'dark' ? 0.3 : 0.12,
          },
        ]}>
        {image && (
          <View style={[styles.preview, { backgroundColor: glass.glassStrong, borderColor: glass.glassBorder }]}>
            <Image source={{ uri: image.uri }} style={styles.previewThumb} />
            <Pressable
              onPress={() => setImage(null)}
              hitSlop={8}
              style={styles.previewRemove}
              accessibilityRole="button"
              accessibilityLabel="Remove image">
              <SymbolView name="xmark.circle.fill" tintColor={colors.mutedText} size={20} />
            </Pressable>
          </View>
        )}
        <View style={styles.row}>
          <Pressable
            onPress={() => void handlePickImage()}
            disabled={sending}
            hitSlop={8}
            style={styles.attachButton}
            accessibilityRole="button"
            accessibilityLabel={image ? 'Replace image' : 'Attach image'}>
            <SymbolView name="photo" tintColor={iconTint} size={20} />
          </Pressable>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: glass.glassStrong, borderColor: glass.glassBorder },
            ]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Reply to this thread…"
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
            onPress={() => void handleSubmit()}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: canSubmit ? sendAccent : glass.glassStrong,
                borderColor: canSubmit ? 'transparent' : glass.glassBorder,
              },
              pressed && canSubmit && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send reply">
            {sending ? (
              <ActivityIndicator size="small" color={contrastText(sendAccent)} />
            ) : (
              <SymbolView
                name="paperplane.fill"
                tintColor={canSubmit ? contrastText(sendAccent) : colors.mutedText}
                size={17}
                weight="semibold"
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  previewThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  previewRemove: {
    padding: spacing.xs,
  },
  attachButton: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 40,
    maxHeight: 112,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
