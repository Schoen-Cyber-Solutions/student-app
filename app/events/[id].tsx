import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import {
  getCampusEvent,
  removeCampusEventFromCalendar,
  saveCampusEventToCalendar,
  CampusEvent,
} from '@/services/api/events';
import { formatTime12 } from '@/utils/time';
import { isSafeExternalUrl } from '@/utils/externalLinks';

export default function CampusEventDetailScreen() {
  const colors = Colors[useColorScheme()];
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [error, setError] = useState(false);
  // Calendar save state — the source event's saved copy id, if one exists.
  const [savedEventId, setSavedEventId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCampusEvent(id)
      .then((e) => {
        setEvent(e);
        setSavedEventId(e.savedEventId);
      })
      .catch(() => setError(true));
  }, [id]);

  const handleAddToCalendar = () => {
    if (!id || saveBusy) return;
    setSaveBusy(true);
    saveCampusEventToCalendar(id)
      .then(setSavedEventId)
      .catch(() => Alert.alert('Could not add event', 'Please try again.'))
      .finally(() => setSaveBusy(false));
  };

  const handleRemoveFromCalendar = () => {
    if (!id || saveBusy) return;
    Alert.alert('Remove from Calendar?', 'The event stays in Laker Connect.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setSaveBusy(true);
          removeCampusEventFromCalendar(id)
            .then(() => setSavedEventId(null))
            .catch(() => Alert.alert('Could not remove event', 'Please try again.'))
            .finally(() => setSaveBusy(false));
        },
      },
    ]);
  };

  const start = event ? new Date(event.startAt) : null;
  const end = event?.endAt ? new Date(event.endAt) : null;
  const link = event?.rsvpUrl ?? event?.sourceUrl ?? null;

  return (
    <>
      <Stack.Screen options={{ title: 'Event', headerTitleAlign: 'left' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scroll}>
        {error ? (
          <EmptyState
            title="Couldn't load event"
            message="Check your connection and try again."
            icon="exclamationmark.triangle"
          />
        ) : !event ? (
          <EmptyState title="Loading…" message="" icon="calendar" />
        ) : (
          <>
            <View style={styles.body}>
              <View style={styles.topRow}>
                {event.category ? (
                  <View style={[styles.chip, { backgroundColor: colors.tintSoft }]}>
                    <Text style={[styles.chipText, { color: colors.tint }]}>{event.category}</Text>
                  </View>
                ) : null}
                {event.isCancelled ? (
                  <Text style={[styles.cancelled, { color: colors.urgent }]}>Cancelled</Text>
                ) : null}
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

              <View style={styles.row}>
                <SymbolView name="calendar" tintColor={colors.mutedText} size={16} />
                <Text style={[styles.rowText, { color: colors.text }]}>
                  {start?.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {'\n'}
                  {formatTime12(start!)}
                  {end ? ` – ${formatTime12(end)}` : ''}
                </Text>
              </View>

              {event.location ? (
                <View style={styles.row}>
                  <SymbolView name="mappin.and.ellipse" tintColor={colors.mutedText} size={16} />
                  <Text style={[styles.rowText, { color: colors.text }]}>{event.location}</Text>
                </View>
              ) : null}

              {event.organization ? (
                <View style={styles.row}>
                  <SymbolView name="person.2" tintColor={colors.mutedText} size={16} />
                  <Text style={[styles.rowText, { color: colors.text }]}>{event.organization}</Text>
                </View>
              ) : null}

              {event.description ? (
                <Text style={[styles.description, { color: colors.text }]}>{event.description}</Text>
              ) : null}

              {link ? (
                <Pressable
                  onPress={() => {
                    if (isSafeExternalUrl(link)) void Linking.openURL(link);
                  }}
                  style={({ pressed }) => [
                    styles.rsvpButton,
                    { backgroundColor: colors.tint },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="View event and RSVP on Laker Connect">
                  <Text style={styles.rsvpText}>View Event / RSVP</Text>
                  <SymbolView name="arrow.up.right" tintColor="#FFFFFF" size={14} />
                </Pressable>
              ) : null}
              {link ? (
                <Text style={[styles.rsvpHint, { color: colors.mutedText }]}>
                  Opens Laker Connect — sign in there to RSVP.
                </Text>
              ) : null}

              {/* Save/remove the user's own Calendar copy. The source
                  event itself never changes — RSVP stays a separate
                  external action above. */}
              <Pressable
                onPress={savedEventId ? handleRemoveFromCalendar : handleAddToCalendar}
                disabled={saveBusy}
                style={({ pressed }) => [
                  styles.addButton,
                  savedEventId
                    ? { backgroundColor: colors.tintSoft }
                    : { borderColor: colors.tint, borderWidth: 1 },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  savedEventId ? 'Added to Calendar, tap to remove' : 'Add to Calendar'
                }>
                <SymbolView
                  name={savedEventId ? 'checkmark.circle.fill' : 'calendar.badge.plus'}
                  tintColor={colors.tint}
                  size={16}
                />
                <Text style={[styles.addText, { color: colors.tint }]}>
                  {savedEventId ? 'Added to Calendar ✓' : 'Add to Calendar'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingBottom: spacing.xl * 2,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  cancelled: {
    ...typography.label,
    fontSize: 13,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: spacing.xs,
  },
  rowText: {
    ...typography.bodyRegular,
    fontSize: 15,
    flex: 1,
    lineHeight: 21,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },
  rsvpText: {
    ...typography.label,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rsvpHint: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  addText: {
    ...typography.label,
    fontSize: 16,
    fontWeight: '600',
  },
});
