import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Text } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { deleteAccount } from '@/services/api/me';
import { clearSessionToken } from '@/services/auth/devSession';
import { clearCommunityCache } from '@/services/api/communities';
import { clearCourseCache } from '@/services/api/courses';

import { DELETE_CONFIRM_PHRASE, isDeleteConfirmed } from '@/utils/accountDeletion';

const CONFIRM_PHRASE = DELETE_CONFIRM_PHRASE;

/**
 * Permanent account deletion. Two deliberate steps — a warning screen, then
 * typing DELETE — so this can never happen by accident. The session is only
 * cleared after the server confirms; a failed delete keeps the account live.
 */
export default function DeleteAccountScreen() {
  const colors = Colors[useColorScheme()];
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmed = isDeleteConfirmed(confirmText);

  const handleDelete = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      await deleteAccount();
      // Server committed — sign out everywhere, then drop local caches.
      await clearSessionToken();
      clearCommunityCache();
      clearCourseCache();
      router.dismissAll();
      router.replace('/onboarding');
    } catch {
      setBusy(false);
      Alert.alert('Account deletion failed', 'Please try again.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Delete Account', headerTitleAlign: 'left' }} />
      <ScreenWrapper>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.warning, { color: colors.text }]}>
            This permanently deletes your account and personal data. This cannot be undone.
          </Text>
          <Text style={[styles.body, { color: colors.secondaryText }]}>
            Deleting your account permanently removes your personal data and
            signs you out on all devices.
          </Text>
          <Text style={[styles.body, { color: colors.secondaryText }]}>
            Some community content may remain in anonymized form so
            conversations are not broken. Your name and profile are removed.
          </Text>
        </View>

        <Text style={[styles.prompt, { color: colors.secondaryText }]}>
          Type DELETE to confirm
        </Text>
        <TextInput
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={CONFIRM_PHRASE}
          placeholderTextColor={colors.mutedText}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.card },
          ]}
          accessibilityLabel="Type DELETE to confirm account deletion"
        />

        <Pressable
          onPress={() => void handleDelete()}
          disabled={!confirmed || busy}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: colors.urgent },
            (!confirmed || busy) && { opacity: 0.4 },
            pressed && confirmed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete account permanently">
          {busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.deleteText}>Delete Account</Text>
          )}
        </Pressable>
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  warning: {
    ...typography.label,
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    ...typography.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  prompt: {
    ...typography.caption,
    fontSize: 13,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  input: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  deleteButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteText: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
