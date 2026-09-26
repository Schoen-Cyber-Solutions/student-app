import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Text } from '@/components/Themed';
import AppHeader from '@/components/AppHeader';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import Colors from '@/constants/Colors';
import { contrastText, glassColors } from '@/constants/Glass';
import { spacing, typography, radius } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useMyCommunity } from '@/hooks/useMyCommunities';
import { createCommunityThread } from '@/services/api/communities';
import { toApiError } from '@/services/api/client';
import { useTabAccent } from '@/utils/tabAccent';
import { useTabAppearance } from '@/utils/tabAppearanceStore';

const MAX_TITLE_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 5000;

export default function NewThreadScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const accent = useTabAccent('chat');
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent);
  const chatAppearance = useTabAppearance('chat');
  const community = useMyCommunity(communityId);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    title.trim().length > 0 && message.trim().length > 0 && !submitting;

  const handleCreate = useCallback(async () => {
    if (!canSubmit || !communityId) return;
    setSubmitting(true);
    try {
      const thread = await createCommunityThread(communityId, title.trim(), message.trim());
      router.replace(`/chats/${encodeURIComponent(communityId)}/thread/${thread.id}`);
    } catch (err) {
      const apiErr = toApiError(err);
      const text =
        apiErr.kind === 'unauthorized' || apiErr.kind === 'not_found'
          ? 'You no longer have access to this community.'
          : apiErr.kind === 'client'
            ? 'Your post was rejected. Please shorten it and try again.'
            : 'Check your connection and try again.';
      Alert.alert('Could not post thread', text);
      setSubmitting(false);
    }
  }, [canSubmit, communityId, title, message]);

  return (
    <>
      <Stack.Screen
        options={{ title: 'New Thread', headerShown: false }}
      />
      <View style={styles.container}>
        <CalendarBackground appearance={chatAppearance} />
        <AppHeader safeAreaTop greeting="New Thread" backLabel="Cancel" accent={accent} />
        <KeyboardAwareScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={styles.content}>
          {/* Course subtitle */}
          {community && (
            <Text style={[styles.courseLabel, { color: colors.secondaryText }]}>
              {community.name} · {community.subtitle}
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
                autoFocus
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
        </KeyboardAwareScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
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
