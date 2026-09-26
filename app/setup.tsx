import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { getMe, getMyUniversity, setupProfile, UserProfile } from '@/services/api/me';
import { clearSessionToken } from '@/services/auth/devSession';
import { toApiError } from '@/services/api/client';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;
const ACADEMIC_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'];

export default function SetupScreen() {
  const colors = Colors[useColorScheme()];
  const [loadingUser, setLoadingUser] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [university, setUniversity] = useState('');

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [program, setProgram] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [{ user }, uni] = await Promise.all([getMe(), getMyUniversity()]);
      setProfile(user);
      setUniversity(uni.name);
      setUsername(user.username.startsWith('u-') ? '' : user.username);
      setFirstName(user.firstName ?? '');
      setMonth(user.birthMonth ? String(user.birthMonth) : '');
      setDay(user.birthDay ? String(user.birthDay) : '');
      setProgram(user.program ?? '');
      setAcademicYear(user.academicYear ?? '');

      if (user.onboardingState === 'needs_academic_setup') {
        router.replace('/academic-setup');
      } else if (user.onboardingState === 'needs_courses') {
        router.replace('/courses-setup');
      } else if (user.onboardingState === 'needs_lms_setup' || user.onboardingState === 'needs_calendar') {
        router.replace('/calendar-connect');
      } else if (user.onboardingState === 'complete') {
        router.replace('/(tabs)');
      } else if (user.onboardingState !== 'needs_profile' && user.onboardingState !== 'needs_username') {
        // Unknown state: send back to onboarding.
        await clearSessionToken();
        router.replace('/onboarding');
      }
    } catch {
      await clearSessionToken();
      router.replace('/onboarding');
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleSubmit = async () => {
    const trimmedUsername = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setError('Username must be 3–32 characters. Letters, numbers, dots, underscores, and dashes only.');
      return;
    }

    const payload: Parameters<typeof setupProfile>[0] = {
      username: trimmedUsername,
      firstName: firstName.trim() || null,
      program: program.trim() || null,
      academicYear: academicYear || null,
    };

    const m = month.trim() === '' ? null : Number(month.trim());
    const d = day.trim() === '' ? null : Number(day.trim());
    if (m !== null || d !== null) {
      payload.birthMonth = m;
      payload.birthDay = d;
    } else {
      payload.birthMonth = null;
      payload.birthDay = null;
    }

    setSaving(true);
    setError('');
    try {
      await setupProfile(payload);
      router.replace('/academic-setup');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 409) {
        setError('That username is already taken.');
      } else if (apiErr.kind === 'client' && apiErr.status === 400) {
        setError('Please check the username and optional fields.');
      } else {
        setError('Could not save profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingUser) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>Create your profile</Text>

          <View style={[styles.uniRow, { backgroundColor: colors.tintSoft }]}>
            <Text style={[styles.uniLabel, { color: colors.secondaryText }]}>University</Text>
            <Text style={[styles.uniName, { color: colors.text }]}>{university || '—'}</Text>
          </View>

          <Text style={[styles.label, { color: colors.secondaryText }]}>Username *</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="emily123"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={32}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface },
            ]}
            placeholderTextColor={colors.mutedText}
          />

          <Text style={[styles.label, { color: colors.secondaryText }]}>First name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Emily"
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface },
            ]}
            placeholderTextColor={colors.mutedText}
          />

          <Text style={[styles.label, { color: colors.secondaryText }]}>Birthday</Text>
          <View style={styles.birthdayRow}>
            <TextInput
              value={month}
              onChangeText={setMonth}
              placeholder="MM"
              keyboardType="number-pad"
              maxLength={2}
              style={[styles.birthdayInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
              placeholderTextColor={colors.mutedText}
            />
            <Text style={{ color: colors.text }}>/</Text>
            <TextInput
              value={day}
              onChangeText={setDay}
              placeholder="DD"
              keyboardType="number-pad"
              maxLength={2}
              style={[styles.birthdayInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <Text style={[styles.label, { color: colors.secondaryText }]}>Program / Major</Text>
          <TextInput
            value={program}
            onChangeText={setProgram}
            placeholder="e.g. Computer Science"
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface },
            ]}
            placeholderTextColor={colors.mutedText}
          />

          <Text style={[styles.label, { color: colors.secondaryText }]}>Academic year</Text>
          <View style={styles.yearRow}>
            {ACADEMIC_YEARS.map((year) => (
              <Pressable
                key={year}
                onPress={() => setAcademicYear(year)}
                style={[
                  styles.yearChip,
                  {
                    borderColor: academicYear === year ? colors.tint : colors.cardBorder,
                    backgroundColor: academicYear === year ? colors.tintSoft : colors.surface,
                  },
                ]}>
                <Text style={{ color: colors.text, fontSize: 13 }}>{year}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={saving || !username.trim()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: saving || !username.trim() ? 0.5 : 1 },
              pressed && { opacity: 0.8 },
            ]}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Continue</Text>
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
    paddingVertical: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  title: {
    ...typography.heading,
    fontSize: 28,
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
    marginBottom: spacing.md,
    fontSize: 16,
  },
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  birthdayInput: {
    height: 48,
    width: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    textAlign: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  yearChip: {
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
