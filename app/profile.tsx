import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import { mockProfile } from '@/data/mockProfile';
import { getCalendarStatus } from '@/services/api/me';
import { clearSessionToken } from '@/services/auth/devSession';

function CalendarSection() {
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
    <Pressable onPress={() => router.push('/calendar-connect')} style={styles.calendarRow}>
      <View style={styles.calendarLabel}>
        <Text style={styles.sectionTitle}>Calendar</Text>
        <Text style={styles.sectionValue}>
          {connected ? `${eventCount} events synced` : 'Not connected'}
        </Text>
      </View>
      <Text style={styles.linkText}>Connect</Text>
    </Pressable>
  );
}

function LogoutSection() {
  return (
    <Pressable
      onPress={() => {
        clearSessionToken();
        router.replace('/onboarding');
      }}
      style={styles.logoutRow}>
      <Text style={styles.logoutText}>Log out</Text>
    </Pressable>
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
  const p = mockProfile;

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScreenWrapper>
        <View style={styles.header}>
          <SymbolView name="person.crop.circle.fill" tintColor="#0F766E" size={80} />
          <Text style={styles.pseudonym}>{p.pseudonym}</Text>
          <View style={styles.badges}>
            {p.isVerified && <StatusBadge active label="Verified Student" />}
            <StatusBadge active={p.lmsConnected} label="LMS" />
            <StatusBadge active={p.emailConnected} label="Email" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>University</Text>
          <Text style={styles.sectionValue}>{p.university}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Program</Text>
          <Text style={styles.sectionValue}>{p.program}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Year</Text>
          <Text style={styles.sectionValue}>{p.year}</Text>
        </View>

        <CalendarSection />

        <LogoutSection />
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
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
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarLabel: {
    flex: 1,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F766E',
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
