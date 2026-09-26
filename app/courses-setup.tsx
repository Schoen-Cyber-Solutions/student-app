import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import {
  AcademicTermInfo,
  CourseSectionInfo,
  EnrollmentInfo,
  SectionMeeting,
  completeCourseSetup,
  enrollSection,
  getAcademicSetup,
  removeEnrollment,
  searchAcademicSections,
} from '@/services/api/academic';
import { getMe } from '@/services/api/me';
import { toApiError } from '@/services/api/client';

const DAY_LABELS: Record<string, string> = {
  MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
};

function formatMinutes(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatMeeting(m: SectionMeeting): string {
  if (m.meetingType === 'online') return 'Online';
  if (m.meetingType === 'tba') return m.location ? `TBA · ${m.location}` : 'TBA';
  const days = (m.daysOfWeek ?? '')
    .split(',')
    .map((d) => DAY_LABELS[d.trim()] ?? d.trim())
    .filter(Boolean)
    .join('/');
  const time =
    m.startMin !== null && m.endMin !== null
      ? `${formatMinutes(m.startMin)}–${formatMinutes(m.endMin)}`
      : '';
  const where = m.location ?? (m.meetingType === 'remote' ? 'Remote' : '');
  return [days, time, where].filter(Boolean).join(' · ');
}

function sectionLabel(s: CourseSectionInfo): string {
  const code = s.course.subjectCode && s.course.courseNumber
    ? `${s.course.subjectCode} ${s.course.courseNumber}`
    : s.course.code;
  return `${code}-${s.sectionCode}`;
}

export default function CoursesSetupScreen() {
  const colors = Colors[useColorScheme()];
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState<AcademicTermInfo | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentInfo[]>([]);
  const [onboarding, setOnboarding] = useState<string>('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseSectionInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [busySectionId, setBusySectionId] = useState<string | null>(null);
  const searchSeq = useRef(0);

  const load = useCallback(async () => {
    try {
      const [setup, me] = await Promise.all([getAcademicSetup(), getMe()]);
      const current = setup.terms.find((t) => t.isCurrent);
      const termId = setup.profile.currentTermId ?? current?.id ?? setup.terms[0]?.id;
      setTerm(setup.terms.find((t) => t.id === termId) ?? current ?? setup.terms[0] ?? null);
      setEnrollments(setup.enrollments);
      setOnboarding(me.user.onboardingState);
    } catch {
      setError('Could not load your course setup. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const runSearch = useCallback(
    async (text: string) => {
      if (!term) return;
      const trimmed = text.trim();
      const seq = ++searchSeq.current;
      if (trimmed.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const sections = await searchAcademicSections(term.id, trimmed);
        if (seq !== searchSeq.current) return;
        setResults(sections);
      } catch {
        if (seq === searchSeq.current) {
          setResults([]);
          setError('Could not search the schedule. Please try again.');
        }
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    },
    [term],
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    void runSearch(text);
  };

  const enrolledSectionIds = new Set(enrollments.map((e) => e.section.id));

  const handleAdd = async (section: CourseSectionInfo) => {
    if (busySectionId) return;
    setBusySectionId(section.id);
    setError('');
    try {
      const { id } = await enrollSection(section.id);
      setEnrollments((prev) => [
        ...prev,
        { id, verificationSource: 'student_selection', verifiedAt: null, section },
      ]);
    } catch (err) {
      const apiErr = toApiError(err);
      setError(
        apiErr.kind === 'not_found'
          ? 'That section is no longer available.'
          : 'Could not add the section. Please try again.',
      );
    } finally {
      setBusySectionId(null);
    }
  };

  const handleRemove = async (enrollmentId: string) => {
    setError('');
    try {
      await removeEnrollment(enrollmentId);
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    } catch {
      setError('Could not remove the course. Please try again.');
    }
  };

  const handleContinue = async () => {
    setError('');
    try {
      await completeCourseSetup();
      router.replace('/calendar-connect');
    } catch {
      setError('Could not continue. Please try again.');
    }
  };

  const renderSectionCard = (s: CourseSectionInfo) => {
    const enrolled = enrolledSectionIds.has(s.id);
    const enrollment = enrollments.find((e) => e.section.id === s.id);
    return (
      <View
        key={s.id}
        style={[
          styles.sectionCard,
          {
            backgroundColor: enrolled ? colors.tintSoft : colors.card,
            borderColor: enrolled ? colors.tint : colors.cardBorder,
          },
        ]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionCode, { color: colors.text }]}>{sectionLabel(s)}</Text>
          <Pressable
            onPress={() => (enrolled && enrollment ? handleRemove(enrollment.id) : handleAdd(s))}
            disabled={busySectionId === s.id}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: enrolled ? colors.surface : colors.tint },
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={enrolled ? `Remove ${sectionLabel(s)}` : `Add ${sectionLabel(s)}`}>
            {busySectionId === s.id ? (
              <ActivityIndicator size="small" color={enrolled ? colors.tint : '#FFFFFF'} />
            ) : (
              <Text style={[styles.addButtonText, { color: enrolled ? colors.tint : '#FFFFFF' }]}>
                {enrolled ? 'Added ✓' : 'Add'}
              </Text>
            )}
          </Pressable>
        </View>
        <Text style={[styles.sectionName, { color: colors.text }]} numberOfLines={2}>
          {s.course.name}
        </Text>
        {s.meetings.map((m, i) => (
          <Text key={i} style={[styles.meetingLine, { color: colors.secondaryText }]}>
            {formatMeeting(m)}
          </Text>
        ))}
        {s.instructor ? (
          <Text style={[styles.meta, { color: colors.mutedText }]}>{s.instructor}</Text>
        ) : null}
        {s.capacity !== null ? (
          <Text style={[styles.meta, { color: colors.mutedText }]}>
            {s.enrolledCount ?? 0}/{s.capacity} enrolled
          </Text>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>Add your courses</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            {term ? `${term.name} · official class schedule` : 'Official class schedule'}
          </Text>

          <View style={[styles.searchRow, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
            <SymbolView name="magnifyingglass" tintColor={colors.mutedText} size={16} />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder='Search "CSIA", "CSIA 301", or a course name'
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.searchInput, { color: colors.text }]}
              placeholderTextColor={colors.mutedText}
            />
            {searching && <ActivityIndicator size="small" color={colors.tint} />}
          </View>

          {enrollments.length > 0 && (
            <View style={styles.selectedBlock}>
              <Text style={[styles.selectedLabel, { color: colors.secondaryText }]}>
                Selected ({enrollments.length})
              </Text>
              {enrollments.map((e) => (
                <View key={e.id} style={[styles.selectedRow, { borderColor: colors.cardBorder }]}>
                  <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                    {sectionLabel(e.section)} · {e.section.course.name}
                  </Text>
                  <Pressable onPress={() => handleRemove(e.id)} hitSlop={8}>
                    <SymbolView name="xmark.circle.fill" tintColor={colors.mutedText} size={18} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.results}>
            {results.map(renderSectionCard)}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <Text style={[styles.helperText, { color: colors.mutedText }]}>
                No sections found. Try a subject code like "CSIA" or "CST".
              </Text>
            )}
            {query.trim().length < 2 && (
              <Text style={[styles.helperText, { color: colors.mutedText }]}>
                Search the official schedule by subject, course number, or title. Your picks
                appear in Calendar and open the course community.
              </Text>
            )}
          </View>

          {error ? <Text style={[styles.error, { color: colors.urgent }]}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.divider, backgroundColor: colors.background }]}>
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && { opacity: 0.8 },
          ]}>
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
            {onboarding === 'needs_courses' ? 'Continue' : 'Done'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  title: {
    ...typography.heading,
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  selectedBlock: {
    marginBottom: spacing.md,
  },
  selectedLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  results: {
    gap: spacing.sm,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionCode: {
    ...typography.label,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionName: {
    ...typography.body,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  meetingLine: {
    ...typography.caption,
    fontSize: 13,
  },
  meta: {
    ...typography.caption,
    marginTop: 4,
  },
  addButton: {
    minWidth: 72,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  addButtonText: {
    ...typography.label,
    fontWeight: '600',
    fontSize: 13,
  },
  helperText: {
    ...typography.body,
    fontSize: 13,
    paddingVertical: spacing.md,
  },
  error: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  buttonText: {
    ...typography.label,
    fontWeight: '600',
    fontSize: 16,
  },
});
