import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppHeader from '@/components/AppHeader';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import { contrastText, glassColors, readableAccent } from '@/constants/Glass';
import { spacing, typography, radius, TAB_BAR_CLEARANCE } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useTextMode, useThemedColors } from '@/components/TabTextMode';
import { useMyCommunity } from '@/hooks/useMyCommunities';
import { communityDisplayName, createCommunityThread, ChatImageDraft } from '@/services/api/communities';
import { pickChatImage } from '@/utils/chatImage';
import { toApiError } from '@/services/api/client';
import { useTabAccent } from '@/utils/tabAccent';
import { useTabAppearance } from '@/utils/tabAppearanceStore';

const MAX_TITLE_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 5000;

export default function NewThreadScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const scheme = useColorScheme();
  const colors = useThemedColors();
  const accent = useTabAccent('chat');
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent, useTextMode());
  const chatAppearance = useTabAppearance('chat');
  const community = useMyCommunity(communityId);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<ChatImageDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Title is always required; the post needs text, an image, or both.
  const canSubmit =
    title.trim().length > 0 && (message.trim().length > 0 || image !== null) && !submitting;

  const handlePickImage = useCallback(async () => {
    const picked = await pickChatImage();
    if (picked) setImage(picked); // cancel keeps the existing draft
  }, []);

  const handleCreate = useCallback(async () => {
    if (!canSubmit || !communityId) return;
    setSubmitting(true);
    try {
      const thread = await createCommunityThread(communityId, title.trim(), message.trim(), image);
      router.replace(`/chats/${encodeURIComponent(communityId)}/thread/${thread.id}`);
    } catch (err) {
      const apiErr = toApiError(err);
      // Dev diagnostics: real failure category/status stays in Metro logs.
      if (__DEV__) {
        console.warn('[new-thread] create failed:', { kind: apiErr.kind, status: apiErr.status, body: apiErr.body });
      }
      const text =
        apiErr.kind === 'unauthorized' || apiErr.kind === 'not_found'
          ? 'You no longer have access to this community.'
          : apiErr.kind === 'client'
            ? 'Your post was rejected. Please shorten it and try again.'
            : 'Check your connection and try again.';
      Alert.alert('Could not post thread', text);
      setSubmitting(false);
    }
    // Draft state (title/message/image) is untouched on failure — retry safe.
  }, [canSubmit, communityId, title, message, image]);

  // Dev-only loop diagnostics — same convention as the thread screen.
  const renderCount = useRef(0);
  renderCount.current += 1;
  if (__DEV__) {
    console.log(`[new-thread] render #${renderCount.current}`);
  }
  useEffect(() => {
    if (!__DEV__) return;
    console.log('[new-thread] MOUNT');
    const sub = Keyboard.addListener('keyboardDidChangeFrame', (e) => {
      console.log(`[new-thread] keyboard frame h=${Math.round(e.endCoordinates.height)}`);
    });
    return () => {
      console.log('[new-thread] UNMOUNT');
      sub.remove();
    };
  }, []);

  // headerShown:false is declared statically in app/(tabs)/chats/_layout.tsx —
  // setting it via <Stack.Screen> inside a modal caused an infinite remount
  // loop; the route is now a plain push inside the Chat tab stack.
  return (
    <View style={styles.container}>
        <CalendarBackground appearance={chatAppearance} />
        <AppHeader safeAreaTop greeting="New Thread" backLabel="Cancel" accent={accent} />
        {/* Single keyboard strategy — identical to the thread screen: KAV
            padding with the real header offset, plain ScrollView, on-drag
            dismiss. The sheet's native keyboard resize + the old
            KeyboardAwareScrollView (interactive dismiss + auto insets +
            JS measure/scroll) were fighting each other into an oscillation. */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // Header lives inside the RN tree above the KAV — the view frame
          // already includes it, so no manual offset (see thread screen).
          keyboardVerticalOffset={0}>
          <ScrollView
            style={{ backgroundColor: 'transparent' }}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            {/* Course subtitle */}
            {community && (
              <Text style={[styles.courseLabel, { color: colors.secondaryText }]}>
                {communityDisplayName(community)}
              </Text>
            )}

            <GlassPanel style={styles.formPanel} variant="strong" intensity={30}>
              {/* Title */}
              <View style={[styles.row, { borderBottomColor: glass.glassBorder }]}>
                <Text style={[styles.label, { color: colors.secondaryText }]}>Title</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter a title"
                  placeholderTextColor={colors.mutedText}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={MAX_TITLE_LENGTH}
                  // No autoFocus — the keyboard opening mid-sheet-presentation
                  // was part of the shake loop. Open on tap instead.
                  editable={!submitting}
                  accessibilityLabel="Thread title"
                />
              </View>

              {/* Message */}
              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.secondaryText }]}>Message</Text>
                <TextInput
                  style={[styles.bodyInput, { color: colors.text }]}
                  placeholder="Write your post..."
                  placeholderTextColor={colors.mutedText}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  textAlignVertical="top"
                  maxLength={MAX_MESSAGE_LENGTH}
                  editable={!submitting}
                  accessibilityLabel="Thread message"
                />
              </View>

              {/* Optional image attachment */}
              <View style={[styles.row, styles.attachRow, { borderTopColor: glass.glassBorder }]}>
                {image ? (
                  <View style={styles.attachPreviewRow}>
                    <Image source={{ uri: image.uri }} style={styles.attachThumb} />
                    <Pressable
                      onPress={() => void handlePickImage()}
                      disabled={submitting}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Replace image">
                      <Text style={[styles.attachAction, { color: readableAccent(accent, scheme === 'dark' ? 'dark' : 'light') }]}>
                        Replace
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setImage(null)}
                      disabled={submitting}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Remove image">
                      <Text style={[styles.attachAction, { color: colors.mutedText }]}>Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => void handlePickImage()}
                    disabled={submitting}
                    style={styles.attachButton}
                    accessibilityRole="button"
                    accessibilityLabel="Attach image">
                    <SymbolView
                      name="photo"
                      tintColor={readableAccent(accent, scheme === 'dark' ? 'dark' : 'light')}
                      size={18}
                    />
                    <Text
                      style={[
                        styles.attachAction,
                        { color: readableAccent(accent, scheme === 'dark' ? 'dark' : 'light') },
                      ]}>
                      Add photo
                    </Text>
                  </Pressable>
                )}
              </View>
            </GlassPanel>

            <Pressable
              onPress={handleCreate}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.postButton,
                { backgroundColor: canSubmit ? accent : glass.glassStrong },
                pressed && canSubmit && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Post thread">
              {submitting ? (
                <ActivityIndicator size="small" color={contrastText(accent)} />
              ) : (
                <Text
                  style={[
                    styles.postButtonText,
                    { color: canSubmit ? contrastText(accent) : colors.mutedText },
                  ]}>
                  Post
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    // Clear the floating tab bar at the bottom of the Chat tab stack.
    paddingBottom: TAB_BAR_CLEARANCE + spacing.xl,
  },
  courseLabel: {
    ...typography.label,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  formPanel: {
    marginHorizontal: spacing.lg,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 0,
  },
  label: {
    ...typography.label,
    marginBottom: 4,
  },
  input: {
    ...typography.bodyRegular,
    fontSize: 15,
    paddingVertical: 2,
  },
  attachRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  attachPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  attachThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  attachAction: {
    ...typography.label,
    fontWeight: '600',
  },
  bodyInput: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 4,
    paddingBottom: spacing.lg,
    minHeight: 200,
  },
  postButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  postButtonText: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
  },
});
