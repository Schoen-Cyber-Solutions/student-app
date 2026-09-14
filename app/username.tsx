import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { updateUsername } from '@/services/api/me';
import { toApiError } from '@/services/api/client';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,32}$/;

export default function UsernameScreen() {
  const colors = Colors[useColorScheme()];
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(trimmed)) {
      setError('3-32 characters. Letters, numbers, dots, underscores, and dashes only.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateUsername(trimmed);
      router.replace('/calendar-connect');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 409) {
        setError('That username is already taken.');
      } else if (apiErr.kind === 'client' && apiErr.status === 400) {
        setError('Invalid or reserved username.');
      } else {
        setError('Could not save username. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Choose a username</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          This is how other students will see you. You can change it later.
        </Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="emily123"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={32}
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
          onPress={handleSubmit}
          disabled={loading || username.trim().length < 3}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint, opacity: (loading || username.trim().length < 3) ? 0.5 : 1 },
            pressed && { opacity: 0.8 },
          ]}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Continue</Text>
          )}
        </Pressable>

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
