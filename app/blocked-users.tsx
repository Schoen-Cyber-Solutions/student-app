import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import EmptyState from '@/components/EmptyState';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { BlockedUser, getBlockedUsers, unblockUser } from '@/services/api/moderation';

export default function BlockedUsersScreen() {
  const colors = Colors[useColorScheme()];
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getBlockedUsers().then(setUsers).catch(() => setUsers([]));
    }, []),
  );

  const handleUnblock = (user: BlockedUser) => {
    setBusyId(user.userId);
    void (async () => {
      try {
        await unblockUser(user.userId);
        setUsers((prev) => prev?.filter((u) => u.userId !== user.userId) ?? []);
      } catch {
        Alert.alert('Could not unblock', 'Check your connection and try again.');
      } finally {
        setBusyId(null);
      }
    })();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Blocked Users', headerTitleAlign: 'left' }} />
      <ScreenWrapper>
        {users === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.tint} />
          </View>
        ) : users.length === 0 ? (
          <EmptyState
            title="No blocked users"
            message="People you block won't appear in your communities."
            icon="person.crop.circle.badge.checkmark"
          />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {users.map((user, index) => (
              <View
                key={user.userId}
                style={[
                  styles.row,
                  index < users.length - 1 && { borderBottomColor: colors.cardBorder, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}>
                <SymbolView name="person.crop.circle" tintColor={colors.mutedText} size={22} />
                <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                  {user.username}
                </Text>
                <Pressable
                  onPress={() => handleUnblock(user)}
                  disabled={busyId === user.userId}
                  style={({ pressed }) => [
                    styles.unblockButton,
                    { borderColor: colors.tint },
                    (pressed || busyId === user.userId) && { opacity: 0.6 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Unblock ${user.username}`}>
                  <Text style={[styles.unblockText, { color: colors.tint }]}>Unblock</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  username: {
    ...typography.body,
    fontSize: 16,
    flex: 1,
  },
  unblockButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  unblockText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 13,
  },
});
