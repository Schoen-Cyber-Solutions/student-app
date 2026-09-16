import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import {
  createPersonalEvent,
  updatePersonalEvent,
  deletePersonalEvent,
  getMyCalendar,
  PersonalEventInput,
} from '@/services/api/calendar';
import { getSessionToken } from '@/services/auth/devSession';
import { toApiError } from '@/services/api/client';
import { startOfDay, endOfDay } from '@/utils/time';

const COLOR_OPTIONS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F43F5E',
  '#6366F1',
  '#14B8A6',
];

function formatDateInput(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatTimeInput(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function CalendarEventScreen() {
  const colors = Colors[useColorScheme()];
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : null;
  const lookupDate = typeof params.date === 'string' ? params.date : null;

  const [loadingEvent, setLoadingEvent] = useState(!!editingId);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editingId) return;
    const token = getSessionToken();
    if (!token) {
      setLoadingEvent(false);
      setError('Not signed in.');
      return;
    }

    const anchor = lookupDate ? new Date(lookupDate) : new Date();
    getMyCalendar(token, startOfDay(anchor).toISOString(), endOfDay(anchor).toISOString())
      .then((events) => {
        const event = events.find((e) => e.id === editingId);
        if (!event) {
          setError('Event not found.');
          return;
        }
        const start = new Date(event.startAt);
        setTitle(event.title);
        setDate(formatDateInput(start));
        setStartTime(formatTimeInput(start));
        setEndTime(event.endAt ? formatTimeInput(new Date(event.endAt)) : '');
        setLocation(event.location ?? '');
        setNotes(event.description ?? '');
        if (event.color) setColor(event.color);
      })
      .catch(() => setError('Could not load event.'))
      .finally(() => setLoadingEvent(false));
  }, [editingId, lookupDate]);

  const baseInputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface },
  ];

  const parseDateTime = (dateText: string, timeText: string): Date | null => {
    if (!dateText) return null;
    const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateText.trim());
    if (!dateMatch) return null;
    const d = new Date(
      parseInt(dateMatch[1], 10),
      parseInt(dateMatch[2], 10) - 1,
      parseInt(dateMatch[3], 10)
    );
    if (isNaN(d.getTime())) return null;
    if (timeText) {
      const [h, m] = timeText.split(':');
      if (h && m) {
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      }
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  };

  const handleSave = async () => {
    setError('');
    const startAt = parseDateTime(date, startTime);
    const endAt = parseDateTime(date, endTime);

    if (!title.trim() || !startAt) {
      setError('Title and date with start time are required.');
      return;
    }

    const input: PersonalEventInput = {
      title: title.trim(),
      description: notes.trim() || undefined,
      location: location.trim() || undefined,
      startAt: startAt.toISOString(),
      color,
    };

    if (endAt && endAt.getTime() > startAt.getTime()) {
      input.endAt = endAt.toISOString();
    }

    setSaving(true);
    try {
      if (editingId) {
        await updatePersonalEvent(editingId, input);
      } else {
        await createPersonalEvent(input);
      }
      router.back();
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.kind === 'client' && apiErr.status === 400) {
        setError('Please check the date and time values.');
      } else {
        setError('Could not save event. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert('Delete event', `Remove "${title || 'this event'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSaving(true);
          deletePersonalEvent(editingId)
            .then(() => router.back())
            .catch(() => {
              setError('Could not delete event.');
              setSaving(false);
            });
        },
      },
    ]);
  };

  if (loadingEvent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>
          {editingId ? 'Edit event' : 'Add personal event'}
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          style={baseInputStyle}
          placeholderTextColor={colors.mutedText}
        />

        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="Date (YYYY-MM-DD)"
          style={baseInputStyle}
          placeholderTextColor={colors.mutedText}
        />

        <View style={styles.row}>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            placeholder="Start (HH:MM)"
            style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface, flex: 1, marginRight: 8 }]}
            placeholderTextColor={colors.mutedText}
          />
          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            placeholder="End (optional)"
            style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface, flex: 1 }]}
            placeholderTextColor={colors.mutedText}
          />
        </View>

        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Location (optional)"
          style={baseInputStyle}
          placeholderTextColor={colors.mutedText}
        />

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          multiline
          numberOfLines={3}
          style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface, height: 80, textAlignVertical: 'top' }]}
          placeholderTextColor={colors.mutedText}
        />

        <Text style={[styles.label, { color: colors.secondaryText }]}>Color</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                color === c && styles.colorSelected,
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving || !title.trim() || !date || !startTime}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint, opacity: saving || !title.trim() || !date || !startTime ? 0.5 : 1 },
            pressed && { opacity: 0.8 },
          ]}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{editingId ? 'Save changes' : 'Save Event'}</Text>}
        </Pressable>

        {editingId && (
          <Pressable
            onPress={handleDelete}
            disabled={saving}
            style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.8 }]}>
            <Text style={styles.deleteText}>Delete event</Text>
          </Pressable>
        )}

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
  row: {
    flexDirection: 'row',
  },
  label: {
    ...typography.label,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#000000',
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  deleteText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 15,
  },
  error: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
