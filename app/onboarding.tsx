import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { requestVerificationCode, verifyCode } from '@/services/api/auth';
import { getMe } from '@/services/api/me';
import { setSessionToken, getSessionToken } from '@/services/auth/devSession';
import { toApiError } from '@/services/api/client';

export default function OnboardingScreen() {
  const colors = Colors[useColorScheme()];
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkOnboarding = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setChecking(false);
      return;
    }

    try {
      const { user } = await getMe();
      if (user.onboardingState === 'needs_username') {
        router.replace('/username');
      } else if (user.onboardingState === 'needs_calendar') {
        router.replace('/calendar-connect');
      } else if (user.onboardingState === 'complete') {
        router.replace('/(tabs)');
      }
    } catch {
      // No valid session; stay on email step.
    } finally {
      setChecking(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void checkOnboarding();
    }, [checkOnboarding])
  );

  useEffect(() => {
    void checkOnboarding();
  }, [checkOnboarding]);

  const handleRequestCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await requestVerificationCode(email.trim());
      setMessage('If your email is supported, a verification code has been sent.');
      setStep('code');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Could not send code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    try {
      const data = await verifyCode(email.trim(), code.trim());
      if (data.status === 'verified' && data.sessionToken) {
        setSessionToken(data.sessionToken);
        router.replace('/username');
        return;
      }
      setError('Invalid or expired code. Please try again.');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' || apiErr.kind === 'unauthorized') {
        setError('Invalid or expired code. Please try again.');
      } else {
        setError('Could not verify code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Welcome</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Verify your university email to get started.
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="student@mail.roosevelt.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.surface,
                },
              ]}
              placeholderTextColor={colors.mutedText}
            />
            <Pressable
              onPress={handleRequestCode}
              disabled={loading || !email.trim()}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.tint, opacity: (loading || !email.trim()) ? 0.5 : 1 },
                pressed && { opacity: 0.8 },
              ]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Send verification code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.surface,
                },
              ]}
              placeholderTextColor={colors.mutedText}
            />
            <Pressable
              onPress={handleVerifyCode}
              disabled={loading || code.length !== 6}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.tint, opacity: (loading || code.length !== 6) ? 0.5 : 1 },
                pressed && { opacity: 0.8 },
              ]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Verify</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setStep('email')} style={styles.link}>
              <Text style={[styles.linkText, { color: colors.tint }]}>Use a different email</Text>
            </Pressable>
          </>
        )}

        {message ? <Text style={[styles.message, { color: colors.tint }]}>{message}</Text> : null}
        {error ? <Text style={[styles.error, { color: colors.urgent }]}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
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
  input: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonText: {
    ...typography.label,
    fontWeight: '600',
    fontSize: 16,
  },
  link: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  linkText: {
    ...typography.body,
    fontWeight: '500',
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
