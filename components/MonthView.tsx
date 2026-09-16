import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { MyCalendarEvent } from '@/services/api/calendar';
import { getMondayOfWeek, isSameCalendarDay, formatTime12, endOfDay, startOfDay } from '@/utils/time';

interface MonthViewProps {
  /** Any date inside the currently displayed month. */
  monthCursor: Date;
  selectedDate: Date;
  events: MyCalendarEvent[];
  colorForEvent: (event: MyCalendarEvent) => string | undefined;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onSelectEvent: (event: MyCalendarEvent) => void;
}

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_DOTS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function eventOccursOn(event: MyCalendarEvent, day: Date): boolean {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : start;
  return start <= endOfDay(day) && end >= startOfDay(day);
}

export default function MonthView({
  monthCursor,
  selectedDate,
  events,
  colorForEvent,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onSelectEvent,
}: MonthViewProps) {
  const colors = Colors[useColorScheme()];
  const [overlayOpen, setOverlayOpen] = useState(false);
  const today = new Date();

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const monthLabel = monthCursor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const gridStart = getMondayOfWeek(firstOfMonth);
    const dayCount = Math.round((lastOfMonth.getTime() - gridStart.getTime()) / DAY_MS) + 1;
    const totalCells = Math.ceil(dayCount / 7) * 7;

    const cells: Date[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    const rows: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, MyCalendarEvent[]>();
    for (const row of weeks) {
      for (const day of row) {
        const key = day.toDateString();
        map.set(
          key,
          events
            .filter((e) => eventOccursOn(e, day))
            .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
        );
      }
    }
    return map;
  }, [weeks, events]);

  const selectedEvents = eventsByDay.get(selectedDate.toDateString()) ?? [];

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.header}>
        <Pressable
          onPress={onPrevMonth}
          style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <SymbolView name="chevron.left" tintColor={colors.tint} size={22} />
        </Pressable>

        <View style={styles.title}>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
          {!isCurrentMonth || !isSameCalendarDay(selectedDate, today) ? (
            <Pressable
              onPress={onGoToToday}
              style={({ pressed }) => [
                styles.todayPill,
                { backgroundColor: colors.tint },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go to today">
              <Text style={styles.todayText}>Today</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={onNextMonth}
          style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <SymbolView name="chevron.right" tintColor={colors.tint} size={22} />
        </Pressable>
      </View>

      {/* Weekday letters */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LETTERS.map((letter, i) => (
          <Text key={i} style={[styles.weekdayLabel, { color: colors.mutedText }]}>
            {letter}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day) => {
              const inMonth = day.getMonth() === month;
              const isToday = isSameCalendarDay(day, today);
              const isSelected = isSameCalendarDay(day, selectedDate);
              const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
              const dots = dayEvents.slice(0, MAX_DOTS);
              const extra = dayEvents.length - dots.length;

              return (
                <Pressable
                  key={day.toDateString()}
                  onPress={() => {
                    onSelectDate(day);
                    setOverlayOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.cell,
                    isSelected && {
                      borderColor: colors.tint,
                      backgroundColor: colors.tintSoft,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.toDateString()}${dayEvents.length ? `, ${dayEvents.length} events` : ''}`}
                  accessibilityState={{ selected: isSelected }}>
                  <View
                    style={[
                      styles.dayNumberWrap,
                      isToday && { backgroundColor: colors.tint },
                    ]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: inMonth ? colors.text : colors.mutedText },
                        isToday && { color: '#FFFFFF', fontWeight: '700' },
                      ]}>
                      {day.getDate()}
                    </Text>
                  </View>

                  <View style={styles.dotsRow}>
                    {dots.map((e) => (
                      <View
                        key={e.id}
                        style={[
                          styles.dot,
                          { backgroundColor: colorForEvent(e) ?? colors.tint },
                        ]}
                      />
                    ))}
                    {extra > 0 && (
                      <Text style={[styles.moreText, { color: colors.mutedText }]}>
                        +{extra}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected-day overlay */}
      {overlayOpen && (
        <View style={styles.overlayWrap} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.divider },
            ]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.secondaryText }]}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <Pressable
                onPress={() => setOverlayOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.5 }]}>
                <SymbolView name="xmark.circle.fill" tintColor={colors.mutedText} size={22} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {selectedEvents.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedText }]}>No events</Text>
              ) : (
                selectedEvents.map((event) => {
                  const start = new Date(event.startAt);
                  const end = event.endAt ? new Date(event.endAt) : null;
                  const timeText = event.allDay
                    ? 'All day'
                    : end
                      ? `${formatTime12(start)} – ${formatTime12(end)}`
                      : formatTime12(start);
                  return (
                    <Pressable
                      key={event.id}
                      onPress={() => onSelectEvent(event)}
                      style={({ pressed }) => [
                        styles.agendaRow,
                        {
                          borderLeftColor: colorForEvent(event) ?? colors.tint,
                          backgroundColor: colors.background,
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${event.title}, ${timeText}`}>
                      <View style={styles.agendaInfo}>
                        <Text style={[styles.agendaEventTitle, { color: colors.text }]} numberOfLines={1}>
                          {event.title}
                        </Text>
                        <Text style={[styles.agendaMeta, { color: colors.secondaryText }]}>
                          {timeText}
                          {event.location ? ` · ${event.location}` : ''}
                        </Text>
                      </View>
                      <SymbolView name="chevron.right" tintColor={colors.mutedText} size={14} />
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  arrow: {
    padding: spacing.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  monthLabel: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  todayPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 2,
  },
  todayText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  weekdayLabel: {
    ...typography.caption,
    fontSize: 11,
    flex: 1,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    paddingTop: 4,
    margin: 1,
  },
  dayNumberWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    ...typography.bodyRegular,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    gap: 3,
    minHeight: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  moreText: {
    fontSize: 8,
    fontWeight: '600',
  },
  overlayWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheet: {
    maxHeight: '55%',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xs,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    ...typography.label,
    fontSize: 13,
  },
  closeButton: {
    padding: 4,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  agendaInfo: {
    flex: 1,
  },
  agendaEventTitle: {
    ...typography.body,
    fontSize: 15,
  },
  agendaMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  emptyText: {
    ...typography.bodyRegular,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
});
