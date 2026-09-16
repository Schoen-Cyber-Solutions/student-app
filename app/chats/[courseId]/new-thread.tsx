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
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useMyCourse } from '@/hooks/useMyCourses';
import { createCourseThread } from '@/services/api/communities';
import { toApiError } from '@/services/api/client';

const MAX_TITLE_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 5000;

export default function NewThreadScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const colors = Colors[useColorScheme()];
  const course = useMyCourse(courseId);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    title.trim().length > 0 && message.trim().length > 0 && !submitting;

  const handleCreate = useCallback(async () => {
    if (!canSubmit || !courseId) return;
    setSubmitting(true);
    try {
      const thread = await createCourseThread(courseId, title.trim(), message.trim());
      router.replace(`/chats/${courseId}/thread/${thread.id}`);
    } catch (err) {
      const apiErr = toApiError(err);
      const text =
        apiErr.kind === 'unauthorized' || apiErr.kind === 'not_found'
          ? 'You no longer have access to this course community.'
          : apiErr.kind === 'client'
            ? 'Your post was rejected. Please shorten it and try again.'
            : 'Check your connection and try again.';
      Alert.alert('Could not post thread', text);
      setSubmitting(false);
    }
  }, [canSubmit, courseId, title, message]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Thread',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} disabled={submitting}>
              <Text style={[styles.headerAction, { color: colors.tint }]}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleCreate} disabled={!canSubmit} hitSlop={8}>
              {submitting ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text
                  style={[
                    styles.headerAction,
                    { color: canSubmit ? colors.tint : colors.mutedText },
                  ]}>
                  Post
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Course subtitle */}
          {course && (
            <Text style={[styles.courseLabel, { color: colors.secondaryText }]}>
              {course.code} · {course.name}
            </Text>
          )}

          {/* Title */}
          <View style={[styles.row, { borderBottomColor: colors.divider }]}>
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
          <View style={[styles.row, { borderBottomColor: colors.divider }]}>
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
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '400',
  },
  courseLabel: {
    ...typography.label,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingBottom: spacing.xl,
    minHeight: 200,
  },
});
