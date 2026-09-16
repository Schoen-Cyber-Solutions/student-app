import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { getMe, updateProfile, UpdateProfileBody, UserProfile } from '@/services/api/me';
import { toApiError } from '@/services/api/client';

const ACADEMIC_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'];

export default function ProfileEditScreen() {
  const colors = Colors[useColorScheme()];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [program, setProgram] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { user } = await getMe();
      setFirstName(user.firstName ?? '');
      setMonth(user.birthMonth ? String(user.birthMonth) : '');
      setDay(user.birthDay ? String(user.birthDay) : '');
      setProgram(user.program ?? '');
      setAcademicYear(user.academicYear ?? '');
    } catch {
      setError('Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    const payload: UpdateProfileBody = {
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

    try {
      await updateProfile(payload);
      setMessage('Profile saved.');
      setTimeout(() => router.back(), 800);
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 400) {
        setError('Please check the birthday values.');
      } else {
        setError('Could not save profile. Please try again.');
      }
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
      contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>

          <Text style={[styles.label, { color: colors.secondaryText }]}>First name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
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
            style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
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
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: saving ? 0.5 : 1 },
              pressed && { opacity: 0.8 },
            ]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Save</Text>}
          </Pressable>

          {message ? <Text style={[styles.message, { color: colors.success }]}>{message}</Text> : null}
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
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  message: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  error: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
