import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { requestVerificationCode, verifyCode } from '@/services/api/auth';
import { getMe } from '@/services/api/me';
import { setSessionToken, clearSessionToken, getSessionToken } from '@/services/auth/devSession';
import { toApiError } from '@/services/api/client';

const RESEND_COOLDOWN_SECONDS = 60;

export default function OnboardingScreen() {
  const colors = Colors[useColorScheme()];
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startResendCooldown = useCallback(() => {
    clearTimer();
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const routeForUser = useCallback((onboardingState: string) => {
    if (onboardingState === 'needs_profile' || onboardingState === 'needs_username') {
      router.replace('/setup');
    } else if (onboardingState === 'needs_calendar') {
      router.replace('/calendar-connect');
    } else if (onboardingState === 'complete') {
      router.replace('/(tabs)');
    }
  }, []);

  const checkSession = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setChecking(false);
      return;
    }

    try {
      const { user } = await getMe();
      routeForUser(user.onboardingState);
    } catch {
      await clearSessionToken();
      setChecking(false);
    }
  }, [routeForUser]);

  useFocusEffect(
    useCallback(() => {
      void checkSession();
    }, [checkSession])
  );

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const handleRequestCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await requestVerificationCode(email.trim());
      setStep('code');
      startResendCooldown();
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Could not send code. Please check your email and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await requestVerificationCode(email.trim());
      startResendCooldown();
      setMessage('A new verification code has been sent.');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Could not resend code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await verifyCode(email.trim(), code.trim());
      if (data.status === 'verified' && data.sessionToken && data.user) {
        await setSessionToken(data.sessionToken);
        routeForUser(data.user.onboardingState);
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

  const handleChangeEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setMessage('');
    clearTimer();
    setResendCooldown(0);
  };

  if (checking) {
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
          {step === 'email' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Verify your university email</Text>
              <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                Use your official university student email address.
              </Text>

              <Text style={[styles.supported, { color: colors.mutedText }]}>
                Supported: Roosevelt University, Illinois Tech
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@university.edu"
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
              <Text style={[styles.title, { color: colors.text }]}>Enter verification code</Text>
              <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                Code expires in 10 minutes.
              </Text>

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

              <Pressable
                onPress={handleResendCode}
                disabled={resendCooldown > 0 || loading}
                style={styles.link}>
                <Text style={[styles.linkText, { color: colors.tint, opacity: resendCooldown > 0 ? 0.5 : 1 }]}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </Pressable>

              <Pressable onPress={handleChangeEmail} style={styles.link}>
                <Text style={[styles.linkText, { color: colors.tint }]}>Use a different email</Text>
              </Pressable>
            </>
          )}

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
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  supported: {
    ...typography.body,
    fontSize: 12,
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
