import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import OnboardingProgress from '@/components/OnboardingProgress';

const emyImage = require('@/assets/images/emy-icon.png');
import { requestVerificationCode, verifyCode } from '@/services/api/auth';
import { getMe } from '@/services/api/me';
import { setSessionToken, clearSessionToken, getSessionToken } from '@/services/auth/devSession';
import { toApiError } from '@/services/api/client';
import { APP_REVIEW_EMAIL } from '@/constants/appReview';

const RESEND_COOLDOWN_SECONDS = 60;

export default function OnboardingScreen() {
  const colors = Colors[useColorScheme()];
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'welcome' | 'email' | 'code'>('welcome');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The public review identity swaps the 6-digit keypad for a paste-friendly
  // field — the credential is long and only verified server-side.
  const isReviewEmail = email.trim().toLowerCase() === APP_REVIEW_EMAIL;
  const codeReady = isReviewEmail ? code.trim().length > 0 : code.length === 6;

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
    } else if (onboardingState === 'needs_academic_setup') {
      router.replace('/academic-setup');
    } else if (onboardingState === 'needs_courses') {
      router.replace('/courses-setup');
    } else if (onboardingState === 'needs_lms_setup' || onboardingState === 'needs_calendar') {
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
    if (!email.trim() || !acceptedTerms) return;
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
      const data = await verifyCode(email.trim(), code.trim(), acceptedTerms);
      if (data.status === 'verified' && data.sessionToken && data.user) {
        await setSessionToken(data.sessionToken);
        routeForUser(data.user.onboardingState);
        return;
      }
      setError('Invalid or expired code. Please try again.');
    } catch (err) {
      const apiErr = toApiError(err);
      const bodyStatus =
        typeof apiErr.body === 'object' && apiErr.body !== null
          ? (apiErr.body as { status?: unknown }).status
          : undefined;
      if (bodyStatus === 'terms_required') {
        // Backend refused account creation — return to the email step so the
        // user sees the unchecked consent box.
        setStep('email');
        setError('Please agree to the Terms of Service to continue.');
      } else if (apiErr.kind === 'client' || apiErr.kind === 'unauthorized') {
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
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.card}>
          {step === 'welcome' ? (
            <>
              <Image
                source={emyImage}
                style={styles.mascot}
                accessibilityLabel="Emy, your guide"
                accessibilityIgnoresInvertColors
              />
              <Text style={[styles.title, { color: colors.text }]}>Study with Emy</Text>
              <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                Your classes, calendar, and campus — in one place.
              </Text>
              <Pressable
                onPress={() => setStep('email')}
                accessibilityRole="button"
                accessibilityLabel="Get started"
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.tint },
                  pressed && { opacity: 0.8 },
                ]}>
                <Text style={[styles.buttonText, { color: colors.tintText }]}>Get Started</Text>
              </Pressable>
            </>
          ) : step === 'email' ? (
            <>
              <OnboardingProgress current={1} />
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
                accessibilityLabel="University email address"
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
                onPress={() => setAcceptedTerms((v) => !v)}
                style={styles.consentRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
                accessibilityLabel="Agree to the Terms of Service and Privacy Policy">
                <SymbolView
                  name={acceptedTerms ? 'checkmark.square.fill' : 'square'}
                  tintColor={acceptedTerms ? colors.tint : colors.mutedText}
                  size={22}
                />
                <Text style={[styles.consentText, { color: colors.secondaryText }]}>
                  I agree to the Terms of Service and Privacy Policy.
                </Text>
              </Pressable>
              <View style={styles.legalLinksRow}>
                <Text
                  onPress={() => router.push('/legal/terms')}
                  style={[styles.linkText, { color: colors.tint }]}
                  accessibilityRole="link">
                  Terms of Service
                </Text>
                <Text style={[styles.legalSeparator, { color: colors.mutedText }]}>·</Text>
                <Text
                  onPress={() => router.push('/legal/privacy')}
                  style={[styles.linkText, { color: colors.tint }]}
                  accessibilityRole="link">
                  Privacy Policy
                </Text>
              </View>
              <Pressable
                onPress={handleRequestCode}
                disabled={loading || !email.trim() || !acceptedTerms}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.tint, opacity: (loading || !email.trim() || !acceptedTerms) ? 0.5 : 1 },
                  pressed && { opacity: 0.8 },
                ]}>
                {loading ? (
                  <ActivityIndicator color={colors.tintText} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.tintText }]}>Send verification code</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <OnboardingProgress current={1} />
              <Text style={[styles.title, { color: colors.text }]}>Enter verification code</Text>
              <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                {isReviewEmail ? 'Paste the review credential from your notes.' : 'Code expires in 10 minutes.'}
              </Text>

              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder={isReviewEmail ? 'Review credential' : '123456'}
                accessibilityLabel={isReviewEmail ? 'Review credential' : 'Six digit verification code'}
                keyboardType={isReviewEmail ? 'default' : 'number-pad'}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={isReviewEmail ? 128 : 6}
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
                disabled={loading || !codeReady}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.tint, opacity: (loading || !codeReady) ? 0.5 : 1 },
                  pressed && { opacity: 0.8 },
                ]}>
                {loading ? (
                  <ActivityIndicator color={colors.tintText} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.tintText }]}>Verify</Text>
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
    maxWidth: 400,
  },
  mascot: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: spacing.lg,
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  consentText: {
    ...typography.body,
    fontSize: 14,
    flex: 1,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingLeft: 30,
    gap: spacing.xs,
  },
  legalSeparator: {
    fontSize: 14,
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
