import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';

const WEBSITE_URL = 'https://schoencybersolutions.com';

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = Colors[useColorScheme()];
  return (
    <View style={[styles.row, { borderBottomColor: colors.cardBorder }]}>
      <Text style={[styles.rowLabel, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function AboutScreen() {
  const colors = Colors[useColorScheme()];

  const expoConfig = Constants.expoConfig;
  const appName = expoConfig?.name ?? 'Student App';
  const version = expoConfig?.version ?? '—';
  const buildNumber =
    Constants.nativeBuildVersion ??
    expoConfig?.ios?.buildNumber ??
    null;
  const isDevBuild = __DEV__ || !buildNumber;

  return (
    <>
      <Stack.Screen options={{ title: 'About' }} />
      <ScreenWrapper>
        <View style={styles.header}>
          <SymbolView name="graduationcap.fill" tintColor={colors.tint} size={64} />
          <Text style={[styles.appName, { color: colors.text }]}>{appName}</Text>
          {isDevBuild ? (
            <View style={[styles.badge, { backgroundColor: colors.tintSoft }]}>
              <Text style={[styles.badgeText, { color: colors.tint }]}>Development Preview</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.description, { color: colors.secondaryText }]}>
          Your academic schedule, assignments, campus communities and university
          events in one place.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <InfoRow label="Developer" value="Schoen Cyber Solutions LLC" />
          <InfoRow label="Version" value={version} />
          {buildNumber ? <InfoRow label="Build" value={buildNumber} /> : null}
        </View>

        <Pressable
          onPress={() => Linking.openURL(WEBSITE_URL)}
          style={({ pressed }) => [
            styles.websiteRow,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="link"
          accessibilityLabel={`Visit ${WEBSITE_URL}`}>
          <SymbolView name="globe" tintColor={colors.tint} size={18} />
          <Text style={[styles.websiteText, { color: colors.tint }]}>schoencybersolutions.com</Text>
          <SymbolView name="arrow.up.right" tintColor={colors.mutedText} size={13} />
        </Pressable>

        <Text style={[styles.footer, { color: colors.mutedText }]}>
          Not affiliated with or endorsed by Roosevelt University, Blackboard,
          Canvas, or Anthology. LMS and university data come from sources you
          connect or official public feeds.
        </Text>
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  appName: {
    ...typography.heading,
    fontSize: 22,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  description: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
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
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    ...typography.body,
    fontSize: 15,
  },
  rowValue: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  websiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  websiteText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
});
