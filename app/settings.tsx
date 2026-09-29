import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import CalendarViewSwitcher, { CalendarView } from '@/components/CalendarViewSwitcher';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { getCalendarStatus, getPreferences, updatePreferences } from '@/services/api/me';
import { clearSessionToken } from '@/services/auth/devSession';

interface CalendarStatus {
  connected: boolean;
  provider: string | null;
  eventCount: number;
  lastSyncedAt: string | null;
}

function SectionTitle({ title }: { title: string }) {
  const colors = Colors[useColorScheme()];
  return <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>{title}</Text>;
}

function Row({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const colors = Colors[useColorScheme()];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.cardBorder },
        pressed && onPress && { opacity: 0.6 },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}>
      {icon ? (
        <SymbolView
          name={icon as any}
          tintColor={destructive ? colors.urgent : colors.tint}
          size={20}
        />
      ) : null}
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? colors.urgent : colors.text },
        ]}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.rowValue, { color: colors.mutedText }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <SymbolView name="chevron.right" tintColor={colors.mutedText} size={14} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = Colors[useColorScheme()];
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPreferences()
        .then(({ preferences }) => setCalendarView(preferences.defaultCalendarView))
        .catch(() => {});
      getCalendarStatus()
        .then((s) =>
          setCalStatus({
            connected: s.connected,
            provider: s.provider,
            eventCount: s.eventCount,
            lastSyncedAt: s.lastSyncedAt,
          }),
        )
        .catch(() => setCalStatus(null));
    }, []),
  );

  const handleCalendarViewChange = (next: CalendarView) => {
    const prev = calendarView;
    setCalendarView(next);
    updatePreferences({ defaultCalendarView: next }).catch(() => setCalendarView(prev));
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Your data stays on this device and on your account. You will need to verify your university email to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await clearSessionToken();
          router.dismissAll();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  const connectionValue = !calStatus
    ? 'Unavailable'
    : calStatus.connected
      ? `${calStatus.provider ? calStatus.provider[0].toUpperCase() + calStatus.provider.slice(1) : 'Connected'} · ${calStatus.eventCount} events`
      : 'Not connected';

  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerTitleAlign: 'left' }} />
      <ScreenWrapper>
        <SectionTitle title="Account" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Row icon="person" label="Student Profile" onPress={() => router.push('/profile')} />
          <Row icon="graduationcap" label="Academic Setup" onPress={() => router.push('/academic-setup')} />
        </View>

        <SectionTitle title="Preferences" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Row
            icon="photo.on.rectangle"
            label="Appearance"
            onPress={() => router.push('/appearance')}
          />
          <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
            <SymbolView name="calendar" tintColor={colors.tint} size={20} />
            <View style={styles.rowLabelWrap}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Default calendar view</Text>
              <View style={{ marginTop: 8 }}>
                <CalendarViewSwitcher active={calendarView} onChange={handleCalendarViewChange} />
              </View>
            </View>
          </View>
        </View>

        <SectionTitle title="Connections" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Row icon="link" label="Connected services" value={connectionValue} />
          <Row
            icon="calendar.badge.clock"
            label="Manage LMS connection"
            onPress={() => router.push('/calendar-connect')}
          />
        </View>

        <SectionTitle title="Privacy & Data" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.privacyBlock}>
            <Text style={[styles.privacyText, { color: colors.secondaryText }]}>
              This app stores your username, profile details, verified university,
              selected courses, course colors, calendar events synced from your
              connected LMS, personal events, and assignment completion marks on
              our servers. Your calendar feed link is stored encrypted and is
              never displayed in the app.
            </Text>
            <Text style={[styles.privacyText, { color: colors.secondaryText }]}>
              Marking an assignment complete only updates this app — it does not
              submit anything to Blackboard or Canvas.
            </Text>
          </View>
        </View>

        <SectionTitle title="Session" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Row icon="rectangle.portrait.and.arrow.right" label="Log Out" destructive onPress={handleLogout} />
        </View>
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    ...typography.body,
    fontSize: 16,
    flex: 1,
  },
  rowLabelWrap: {
    flex: 1,
  },
  rowValue: {
    ...typography.caption,
    fontSize: 13,
    maxWidth: 160,
  },
  privacyBlock: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  privacyText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
});
