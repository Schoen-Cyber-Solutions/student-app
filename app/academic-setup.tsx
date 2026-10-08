import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import BackButton from '@/components/BackButton';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import {
  AcademicProgram,
  AcademicTermInfo,
  getAcademicPrograms,
  getAcademicSetup,
  updateAcademicProfile,
} from '@/services/api/academic';
import { getMe } from '@/services/api/me';
import { toApiError } from '@/services/api/client';

const LEVELS = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'other', label: 'Other' },
];

export default function AcademicSetupScreen() {
  const colors = Colors[useColorScheme()];
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [university, setUniversity] = useState('');
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [terms, setTerms] = useState<AcademicTermInfo[]>([]);
  const [onboarding, setOnboarding] = useState<string>('');

  const [programId, setProgramId] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState('');
  const [level, setLevel] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [setup, programList, me] = await Promise.all([
        getAcademicSetup(),
        getAcademicPrograms(),
        getMe(),
      ]);
      setUniversity(setup.university?.name ?? '');
      setPrograms(programList);
      setTerms(setup.terms);
      setOnboarding(me.user.onboardingState);

      setProgramId(setup.profile.programId);
      setLevel(setup.profile.academicLevel);
      const current = setup.terms.find((t) => t.isCurrent);
      setTermId(setup.profile.currentTermId ?? current?.id ?? setup.terms[0]?.id ?? null);
    } catch {
      setError('Could not load academic setup. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const visiblePrograms = programFilter.trim()
    ? programs.filter((p) => p.name.toLowerCase().includes(programFilter.trim().toLowerCase()))
    : programs;

  const handleContinue = async () => {
    setSaving(true);
    setError('');
    try {
      await updateAcademicProfile({
        programId,
        academicLevel: level,
        currentTermId: termId,
      });
      router.push('/courses-setup');
    } catch (err) {
      const apiErr = toApiError(err);
      setError(
        apiErr.kind === 'client'
          ? 'Please check your selections and try again.'
          : 'Could not save. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.card}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Academic setup</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Confirmed from your verified university email.
        </Text>

        <View style={[styles.uniRow, { backgroundColor: colors.tintSoft }]}>
          <Text style={[styles.uniLabel, { color: colors.secondaryText }]}>University</Text>
          <Text style={[styles.uniName, { color: colors.text }]}>{university || '—'}</Text>
        </View>

        <Text style={[styles.label, { color: colors.secondaryText }]}>Program / Major</Text>
        <TextInput
          value={programFilter}
          onChangeText={setProgramFilter}
          placeholder="Search programs"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface },
          ]}
          placeholderTextColor={colors.mutedText}
        />
        <View style={styles.optionList}>
          {visiblePrograms.slice(0, 30).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setProgramId(programId === p.id ? null : p.id)}
              style={[
                styles.optionRow,
                {
                  borderColor: programId === p.id ? colors.tint : colors.cardBorder,
                  backgroundColor: programId === p.id ? colors.tintSoft : colors.surface,
                },
              ]}>
              <Text style={{ color: colors.text, fontSize: 14 }}>{p.name}</Text>
            </Pressable>
          ))}
          {visiblePrograms.length === 0 && (
            <Text style={[styles.helperText, { color: colors.mutedText }]}>No programs match.</Text>
          )}
        </View>

        <Text style={[styles.label, { color: colors.secondaryText }]}>Level</Text>
        <View style={styles.chipRow}>
          {LEVELS.map((l) => (
            <Pressable
              key={l.value}
              onPress={() => setLevel(l.value)}
              style={[
                styles.chip,
                {
                  borderColor: level === l.value ? colors.tint : colors.cardBorder,
                  backgroundColor: level === l.value ? colors.tintSoft : colors.surface,
                },
              ]}>
              <Text style={{ color: colors.text, fontSize: 13 }}>{l.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.secondaryText }]}>Term</Text>
        <View style={styles.chipRow}>
          {terms.length === 0 && (
            <Text style={[styles.helperText, { color: colors.mutedText }]}>
              No terms are available for your university yet. Please try again later.
            </Text>
          )}
          {terms.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTermId(t.id)}
              style={[
                styles.chip,
                {
                  borderColor: termId === t.id ? colors.tint : colors.cardBorder,
                  backgroundColor: termId === t.id ? colors.tintSoft : colors.surface,
                },
              ]}>
              <Text style={{ color: colors.text, fontSize: 13 }}>
                {t.name}
                {t.isCurrent ? ' · current' : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleContinue}
          disabled={saving || !termId}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint, opacity: saving || !termId ? 0.5 : 1 },
            pressed && { opacity: 0.8 },
          ]}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {onboarding === 'needs_academic_setup' ? 'Continue' : 'Save & manage courses'}
            </Text>
          )}
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.urgent }]}>{error}</Text> : null}
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
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
  uniRow: {
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  uniLabel: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: 2,
  },
  uniName: {
    ...typography.label,
    fontSize: 16,
  },
  label: {
    ...typography.label,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  optionList: {
    marginBottom: spacing.md,
    gap: 6,
  },
  optionRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  helperText: {
    ...typography.caption,
    paddingVertical: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.label,
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
