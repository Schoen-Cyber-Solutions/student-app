import { useState, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { SuggestedCategory } from '@/types';
import { createThread } from '@/data/mockThreads';
import { mockCourses } from '@/data/mockCourses';

const SUGGESTED: SuggestedCategory[] = ['general', 'exam', 'assignment', 'study-group'];

const suggestedLabels: Record<SuggestedCategory, string> = {
  general: 'General',
  exam: 'Exam',
  assignment: 'Assignment',
  'study-group': 'Study Group',
};

export default function NewThreadScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const colors = Colors[useColorScheme()];
  const course = mockCourses.find((c) => c.id === courseId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<SuggestedCategory>('general');
  const [isCustom, setIsCustom] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const titleValid = title.trim().length > 0 && title.trim().length <= 100;
  const bodyValid = body.trim().length > 0 && body.trim().length <= 2000;
  const customValid = !isCustom || (customCategory.trim().length > 0 && customCategory.trim().length <= 30);
  const canSubmit = titleValid && bodyValid && customValid;

  const finalCategory = isCustom ? customCategory.trim() : category;

  const handleCreate = useCallback(async () => {
    if (!canSubmit || !courseId) return;
    await createThread(courseId, {
      title: title.trim(),
      body: body.trim(),
      category: finalCategory,
    });
    router.back();
  }, [canSubmit, courseId, title, body, finalCategory]);

  const selectSuggested = (cat: SuggestedCategory) => {
    setCategory(cat);
    setIsCustom(false);
  };

  const selectCustom = () => {
    setIsCustom(true);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Thread',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={[styles.headerAction, { color: colors.tint }]}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleCreate} disabled={!canSubmit} hitSlop={8}>
              <Text
                style={[
                  styles.headerAction,
                  { color: canSubmit ? colors.tint : colors.mutedText },
                ]}>
                Post
              </Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
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
              maxLength={100}
              autoFocus
              accessibilityLabel="Thread title"
            />
          </View>

          {/* Category */}
          <View style={[styles.row, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Category</Text>
            <View style={styles.categoryRow}>
              {SUGGESTED.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => selectSuggested(cat)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor:
                        !isCustom && category === cat ? colors.tintSoft : colors.surface,
                      borderColor:
                        !isCustom && category === cat ? colors.tint : colors.cardBorder,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color:
                          !isCustom && category === cat
                            ? colors.tint
                            : colors.secondaryText,
                      },
                    ]}>
                    {suggestedLabels[cat]}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={selectCustom}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isCustom ? colors.tintSoft : colors.surface,
                    borderColor: isCustom ? colors.tint : colors.cardBorder,
                  },
                ]}>
                <Text
                  style={[
                    styles.categoryText,
                    { color: isCustom ? colors.tint : colors.secondaryText },
                  ]}>
                  + Custom
                </Text>
              </Pressable>
            </View>
            {isCustom && (
              <TextInput
                style={[styles.customInput, { color: colors.text, borderColor: colors.divider }]}
                placeholder="Enter custom category"
                placeholderTextColor={colors.mutedText}
                value={customCategory}
                onChangeText={setCustomCategory}
                maxLength={30}
                autoFocus
                accessibilityLabel="Custom category"
              />
            )}
          </View>

          {/* Body */}
          <TextInput
            style={[styles.bodyInput, { color: colors.text }]}
            placeholder="Write your post..."
            placeholderTextColor={colors.mutedText}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            accessibilityLabel="Thread body"
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '600',
  },
  customInput: {
    ...typography.bodyRegular,
    fontSize: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  bodyInput: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    minHeight: 200,
  },
});
