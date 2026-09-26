import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import ScreenWrapper from '@/components/ScreenWrapper';
import CalendarViewSwitcher, { CalendarView } from '@/components/CalendarViewSwitcher';
import {
  getCalendarStatus,
  getMe,
  getMyUniversity,
  getPreferences,
  updatePreferences,
  UserProfile,
} from '@/services/api/me';
import { clearSessionToken } from '@/services/auth/devSession';

function CalendarSection() {
  const colors = Colors[useColorScheme()];
  const [connected, setConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getCalendarStatus()
        .then((s) => {
          setConnected(s.connected);
          setEventCount(s.eventCount);
        })
        .catch(() => {
          setConnected(false);
        });
    }, [])
  );

  return (
    <Pressable onPress={() => router.push('/calendar-connect')} style={styles.row}>
      <View style={styles.rowLabel}>
        <Text style={styles.sectionTitle}>Calendar</Text>
        <Text style={styles.sectionValue}>
          {connected ? `${eventCount} events synced` : 'Not connected'}
        </Text>
      </View>
      <Text style={[styles.linkText, { color: colors.tint }]}>{connected ? 'Reconnect' : 'Connect'}</Text>
    </Pressable>
  );
}

function CalendarPreferencesSection() {
  const [view, setView] = useState<CalendarView>('week');

  useFocusEffect(
    useCallback(() => {
      getPreferences()
        .then(({ preferences }) => setView(preferences.defaultCalendarView))
        .catch(() => {});
    }, [])
  );

  const handleChange = (next: CalendarView) => {
    const prev = view;
    setView(next);
    updatePreferences({ defaultCalendarView: next }).catch(() => setView(prev));
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Calendar Preferences</Text>
      <Text style={[styles.sectionValue, { marginBottom: 10 }]}>Default view</Text>
      <CalendarViewSwitcher active={view} onChange={handleChange} />
    </View>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
      <Text style={active ? styles.badgeTextActive : styles.badgeTextInactive}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = Colors[useColorScheme()];
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [university, setUniversity] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getMe()
        .then(({ user }) => setProfile(user))
        .catch(() => setProfile(null));
      getMyUniversity()
        .then((u) => setUniversity(u.name))
        .catch(() => setUniversity(null));
    }, [])
  );

  const handleLogout = async () => {
    await clearSessionToken();
    router.replace('/onboarding');
  };

  const handleEditProfile = () => {
    router.push('/profile-edit');
  };

  const displayName = profile?.firstName ?? profile?.username ?? 'Student';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerRight: () => (
            <Pressable
              onPress={handleEditProfile}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              style={({ pressed }) => [styles.headerEditButton, pressed && { opacity: 0.5 }]}>
              <SymbolView name="pencil" tintColor={colors.tint} size={20} />
            </Pressable>
          ),
        }}
      />
      <ScreenWrapper>
        <View style={styles.header}>
          <SymbolView name="person.crop.circle.fill" tintColor={colors.tint} size={80} />
          <Text style={styles.pseudonym}>@{profile?.username ?? '…'}</Text>
          <View style={styles.badges}>
            {university && <StatusBadge active label="Verified Student" />}
          </View>
        </View>

        {university && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>University</Text>
            <Text style={styles.sectionValue}>{university}</Text>
          </View>
        )}

        {profile?.program && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Program</Text>
            <Text style={styles.sectionValue}>{profile.program}</Text>
          </View>
        )}

        {profile?.academicYear && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Academic Year</Text>
            <Text style={styles.sectionValue}>{profile.academicYear}</Text>
          </View>
        )}

        <CalendarSection />

        <CalendarPreferencesSection />

        <Pressable onPress={() => router.push('/academic-setup')} style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={styles.sectionTitle}>Academic Setup</Text>
            <Text style={styles.sectionValue}>Program, term & courses</Text>
          </View>
          <Text style={[styles.linkText, { color: colors.tint }]}>Edit</Text>
        </Pressable>

        <Pressable onPress={handleLogout} style={styles.logoutRow}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  headerEditButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  pseudonym: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  badges: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeActive: {
    backgroundColor: '#ECFDF5',
  },
  badgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  badgeTextActive: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextInactive: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLabel: {
    flex: 1,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoutRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});
