import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import DatePickerModal from '@/components/DatePickerModal';
import TimeWheelField from '@/components/TimeWheelField';
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

const TITLE_MAX = 120;

type RepeatKey = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
const REPEAT_OPTIONS: { key: RepeatKey; label: string }[] = [
  { key: 'none', label: 'Does not repeat' },
  { key: 'daily', label: 'Every day' },
  { key: 'weekly', label: 'Every week' },
  { key: 'biweekly', label: 'Every 2 weeks' },
  { key: 'monthly', label: 'Every month' },
];
const REPEAT_LABEL = Object.fromEntries(REPEAT_OPTIONS.map((o) => [o.key, o.label]));

type EndsMode = 'never' | 'onDate';

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

function parseDateText(text: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text.trim());
  if (!m) return null;
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  // Reject overflow dates like 2026-02-31 that Date() rolls forward.
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]
    ? d
    : null;
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
  const [repeat, setRepeat] = useState<RepeatKey>('none');
  const [endsMode, setEndsMode] = useState<EndsMode>('never');
  const [endsOn, setEndsOn] = useState('');
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<'date' | 'endsOn' | null>(null);
  const [expandedWheel, setExpandedWheel] = useState<'start' | 'end' | null>(null);
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
        if (event.recurrence) {
          const { freq, interval, until } = event.recurrence;
          setRepeat(
            freq === 'daily'
              ? 'daily'
              : freq === 'monthly'
                ? 'monthly'
                : interval === 2
                  ? 'biweekly'
                  : 'weekly',
          );
          if (until) {
            setEndsMode('onDate');
            setEndsOn(formatDateInput(new Date(until)));
          }
        }
      })
      .catch(() => setError('Could not load event.'))
      .finally(() => setLoadingEvent(false));
  }, [editingId, lookupDate]);

  const baseInputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface },
  ];

  const startAt = useMemo(() => {
    const d = parseDateText(date);
    if (!d) return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(startTime);
    if (m) d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    return d;
  }, [date, startTime]);

  const endAt = useMemo(() => {
    const d = parseDateText(date);
    const m = /^(\d{1,2}):(\d{2})$/.exec(endTime);
    if (!d || !m) return null;
    d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    return d;
  }, [date, endTime]);

  const missingRequired = [
    !title.trim() && 'Event Name',
    !parseDateText(date) && 'Date',
    !startTime && 'Start Time',
  ].filter(Boolean) as string[];
  const endBeforeStart = !!(endAt && startAt && endAt.getTime() <= startAt.getTime());
  const canSave = !saving && missingRequired.length === 0 && !endBeforeStart;

  const handleSave = async () => {
    setError('');
    if (!startAt) return;

    const input: PersonalEventInput = {
      title: title.trim().slice(0, TITLE_MAX),
      description: notes.trim() || undefined,
      location: location.trim() || undefined,
      startAt: startAt.toISOString(),
      color,
    };

    if (endAt && endAt.getTime() > startAt.getTime()) {
      input.endAt = endAt.toISOString();
    }

    if (repeat !== 'none') {
      const endsDate = parseDateText(endsOn);
      input.recurrence = {
        freq: repeat === 'biweekly' ? 'weekly' : repeat,
        interval: repeat === 'biweekly' ? 2 : 1,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(endsMode === 'onDate' && endsDate
          ? { until: endOfDay(endsDate).toISOString() }
          : {}),
      };
    } else if (editingId) {
      input.recurrence = null; // explicit stop-repeating on edit
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
    const isSeries = repeat !== 'none';
    Alert.alert(
      'Delete event',
      isSeries
        ? `"${title || 'This event'}" repeats — deleting removes the whole series.`
        : `Remove "${title || 'this event'}"?`,
      [
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
      ],
    );
  };

  if (loadingEvent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  const label = (text: string, required = false) => (
    <Text style={[styles.label, { color: colors.secondaryText }]}>
      {text}
      {required ? <Text style={{ color: colors.urgent }}> *</Text> : ''}
    </Text>
  );

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>
          {editingId ? 'Edit event' : 'Add personal event'}
        </Text>

        {label('Event Name', true)}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Study group"
          maxLength={TITLE_MAX}
          style={baseInputStyle}
          placeholderTextColor={colors.mutedText}
        />

        {label('Date', true)}
        <View style={styles.dateRow}>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            style={[baseInputStyle, styles.dateInput]}
            placeholderTextColor={colors.mutedText}
          />
          <Pressable
            onPress={() => setDatePickerFor('date')}
            style={[styles.dateButton, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Open date picker">
            <SymbolView name="calendar" tintColor={colors.tint} size={20} />
          </Pressable>
        </View>

        {label('Start Time', true)}
        <TimeWheelField
          value={startTime}
          onChange={setStartTime}
          expanded={expandedWheel === 'start'}
          onToggle={() => setExpandedWheel(expandedWheel === 'start' ? null : 'start')}
        />

        <View style={styles.fieldGap} />

        {label('End Time')}
        <TimeWheelField
          value={endTime}
          onChange={setEndTime}
          expanded={expandedWheel === 'end'}
          onToggle={() => setExpandedWheel(expandedWheel === 'end' ? null : 'end')}
          onClear={() => setEndTime('')}
        />
        {endBeforeStart ? (
          <Text style={[styles.fieldError, { color: colors.urgent }]}>
            End time must be after start time.
          </Text>
        ) : null}

        <View style={styles.fieldGap} />

        {label('Location')}
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Optional"
          style={baseInputStyle}
          placeholderTextColor={colors.mutedText}
        />

        {label('Notes')}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          multiline
          numberOfLines={3}
          style={[...baseInputStyle, { height: 80, textAlignVertical: 'top' }]}
          placeholderTextColor={colors.mutedText}
        />

        {label('Repeat')}
        <Pressable
          onPress={() => setRepeatOpen((o) => !o)}
          style={[styles.input, styles.selectRow, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
          accessibilityRole="button">
          <Text style={{ color: colors.text, fontSize: 16 }}>{REPEAT_LABEL[repeat]}</Text>
          <SymbolView name={repeatOpen ? 'chevron.up' : 'chevron.down'} tintColor={colors.mutedText} size={14} />
        </Pressable>
        {repeatOpen ? (
          <View style={[styles.optionList, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
            {REPEAT_OPTIONS.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => {
                  setRepeat(o.key);
                  setRepeatOpen(false);
                }}
                style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: repeat === o.key }}>
                <Text style={{ color: repeat === o.key ? colors.tint : colors.text, fontSize: 16 }}>
                  {o.label}
                </Text>
                {repeat === o.key ? (
                  <SymbolView name="checkmark" tintColor={colors.tint} size={16} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {repeat !== 'none' ? (
          <>
            <Text style={[styles.subLabel, { color: colors.secondaryText }]}>Ends</Text>
            <View style={styles.segmented}>
              {(['never', 'onDate'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setEndsMode(mode)}
                  style={[
                    styles.segment,
                    endsMode === mode && { backgroundColor: colors.tint },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: endsMode === mode }}>
                  <Text
                    style={{
                      color: endsMode === mode ? '#FFFFFF' : colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}>
                    {mode === 'never' ? 'Never' : 'On date'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {endsMode === 'onDate' ? (
              <View style={styles.dateRow}>
                <TextInput
                  value={endsOn}
                  onChangeText={setEndsOn}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  style={[baseInputStyle, styles.dateInput]}
                  placeholderTextColor={colors.mutedText}
                />
                <Pressable
                  onPress={() => setDatePickerFor('endsOn')}
                  style={[styles.dateButton, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                  accessibilityRole="button"
                  accessibilityLabel="Open end-date picker">
                  <SymbolView name="calendar" tintColor={colors.tint} size={20} />
                </Pressable>
              </View>
            ) : null}
            {editingId ? (
              <Text style={[styles.hint, { color: colors.mutedText }]}>
                Changes apply to the whole series.
              </Text>
            ) : null}
          </>
        ) : null}

        {label('Color')}
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
          disabled={!canSave}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint, opacity: canSave ? 1 : 0.5 },
            pressed && { opacity: 0.8 },
          ]}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{editingId ? 'Save changes' : 'Save Event'}</Text>}
        </Pressable>
        {missingRequired.length > 0 && !saving ? (
          <Text style={[styles.hint, { color: colors.mutedText }]}>
            Required: {missingRequired.join(', ')}
          </Text>
        ) : null}

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

      <DatePickerModal
        visible={datePickerFor !== null}
        value={parseDateText(datePickerFor === 'endsOn' ? endsOn : date)}
        onSelect={(d) => {
          const s = formatDateInput(d);
          if (datePickerFor === 'endsOn') setEndsOn(s);
          else setDate(s);
        }}
        onClose={() => setDatePickerFor(null)}
      />
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
  label: {
    ...typography.label,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  subLabel: {
    ...typography.label,
    fontSize: 13,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateInput: {
    flex: 1,
    marginBottom: 0,
  },
  dateButton: {
    width: 48,
    height: 48,
    marginLeft: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGap: {
    height: spacing.md,
  },
  fieldError: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  optionList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
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
  hint: {
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
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
