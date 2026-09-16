import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { router, useFocusEffect } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { connectCalendar, getCalendarStatus, skipCalendar } from '@/services/api/me';
import { toApiError } from '@/services/api/client';

type Provider = 'blackboard' | 'canvas';

const PROVIDER_INFO: Record<Provider, { name: string; instructions: string; placeholder: string }> = {
  blackboard: {
    name: 'Blackboard',
    instructions:
      'Open Blackboard Calendar, choose Share Calendar / external calendar link, and copy the private URL.',
    placeholder: 'https://blackboard.roosevelt.edu/webapps/calendar/...',
  },
  canvas: {
    name: 'Canvas',
    instructions:
      'In Canvas, go to Calendar → Calendar Feed, copy the iCal/ICS feed URL for your account.',
    placeholder: 'https://canvas.illinoistech.edu/feeds/calendars/...',
  },
};

export default function CalendarConnectScreen() {
  const colors = Colors[useColorScheme()];
  const [provider, setProvider] = useState<Provider | null>(null);
  const [feedUrl, setFeedUrl] = useState('');
  const [status, setStatus] = useState<{ connected: boolean; provider: string | null; eventCount: number; lastSyncedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const s = await getCalendarStatus();
      setStatus({
        connected: s.connected,
        provider: s.provider,
        eventCount: s.eventCount,
        lastSyncedAt: s.lastSyncedAt,
      });
      if (s.provider === 'blackboard' || s.provider === 'canvas') {
        setProvider(s.provider);
      }
    } catch {
      // ignore status load errors
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus])
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    if (!provider || !feedUrl.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await connectCalendar(feedUrl.trim(), provider);
      setMessage(`${PROVIDER_INFO[provider].name} connected — ${result.eventsSynced} events synced.`);
      setFeedUrl('');
      void loadStatus();
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1200);
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 400) {
        setError('Please select a provider and enter a valid http or https calendar URL.');
      } else if (apiErr.kind === 'client' && apiErr.status === 409) {
        setError('Could not reach the calendar or the response was not a valid ICS feed.');
      } else if (apiErr.kind === 'client' && apiErr.status === 422) {
        setError('The feed could not be parsed as a calendar.');
      } else {
        setError('Could not connect calendar. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await skipCalendar();
      router.replace('/(tabs)');
    } catch {
      setError('Could not skip. Please try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>Connect your university calendar</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Which learning platform does your university use?
          </Text>

          {status?.connected && (
            <View style={[styles.status, { backgroundColor: colors.tintSoft }]}>
              <Text style={{ color: colors.tint, fontWeight: '600' }}>
                {status.provider ? `${status.provider.charAt(0).toUpperCase() + status.provider.slice(1)} connected` : 'Calendar connected'} ({status.eventCount} events)
              </Text>
              {status.lastSyncedAt ? (
                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                  Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          )}

          <View style={styles.providerRow}>
            {(['blackboard', 'canvas'] as Provider[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => setProvider(p)}
                style={({ pressed }) => [
                  styles.providerCard,
                  {
                    borderColor: provider === p ? colors.tint : colors.cardBorder,
                    backgroundColor: provider === p ? colors.tintSoft : colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <Text style={[styles.providerName, { color: colors.text }]}>
                  {PROVIDER_INFO[p].name}
                </Text>
              </Pressable>
            ))}
          </View>

          {provider && (
            <>
              <Text style={[styles.hint, { color: colors.secondaryText }]}>
                {PROVIDER_INFO[provider].instructions}
              </Text>

              <TextInput
                value={feedUrl}
                onChangeText={setFeedUrl}
                placeholder={PROVIDER_INFO[provider].placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
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
            </>
          )}

          <Pressable
            onPress={handleConnect}
            disabled={loading || !provider || !feedUrl.trim()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: (loading || !provider || !feedUrl.trim()) ? 0.5 : 1 },
              pressed && { opacity: 0.8 },
            ]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Connect Calendar</Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSkip}
            disabled={loading}
            style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.skipText, { color: colors.tint }]}>Skip for now</Text>
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  status: {
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  providerCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderRadius: 10,
  },
  providerName: {
    ...typography.label,
    fontSize: 16,
  },
  hint: {
    ...typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
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
  },
  buttonText: {
    ...typography.label,
    fontWeight: '600',
    fontSize: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipText: {
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
