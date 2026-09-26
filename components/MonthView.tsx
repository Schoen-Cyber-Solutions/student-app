import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';
import { contrastText, glassColors } from '@/constants/Glass';
import { useCalendarAccent } from '@/utils/calendarAccent';
import { useColorScheme } from './useColorScheme';
import GlassPanel from './GlassPanel';
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
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = glassColors(scheme, useCalendarAccent());
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
  const selectedIsToday = isSameCalendarDay(selectedDate, today);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {/* Month navigation */}
      <GlassPanel style={styles.headerPanel} intensity={40}>
      <View style={styles.header}>
        <Pressable
          onPress={onPrevMonth}
          style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <SymbolView name="chevron.left" tintColor={colors.accent} size={22} />
        </Pressable>

        <View style={styles.title}>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
          {!isCurrentMonth || !selectedIsToday ? (
            <Pressable
              onPress={onGoToToday}
              style={({ pressed }) => [
                styles.todayPill,
                { backgroundColor: colors.accent },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go to today">
              <Text style={[styles.todayText, { color: contrastText(colors.accent) }]}>
                Today
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={onNextMonth}
          style={({ pressed }) => [styles.arrow, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <SymbolView name="chevron.right" tintColor={colors.accent} size={22} />
        </Pressable>
      </View>
      </GlassPanel>

      {/* Glass month grid */}
      <GlassPanel style={styles.gridPanel} intensity={30} variant="faint">
       <View style={styles.gridInner}>
        <View style={styles.weekdayRow}>
          {WEEKDAY_LETTERS.map((letter, i) => (
            <Text key={i} style={[styles.weekdayLabel, { color: colors.mutedText }]}>
              {letter}
            </Text>
          ))}
        </View>

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
                  onPress={() => onSelectDate(day)}
                  style={({ pressed }) => [
                    styles.cell,
                    isSelected && {
                      borderColor: colors.accent,
                      backgroundColor: colors.accentSoft,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${day.toDateString()}${dayEvents.length ? `, ${dayEvents.length} events` : ''}`}
                  accessibilityState={{ selected: isSelected }}>
                  <View
                    style={[
                      styles.dayNumberWrap,
                      isToday && { backgroundColor: colors.accent },
                    ]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: inMonth ? colors.text : colors.mutedText },
                        isSelected && !isToday && { color: colors.accent, fontWeight: '700' },
                        isToday && { color: contrastText(colors.accent), fontWeight: '700' },
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
                          { backgroundColor: colorForEvent(e) ?? colors.accent },
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
      </GlassPanel>

      {/* Selected-day agenda */}
      <GlassPanel style={styles.agendaPanel} intensity={40}>
       <View style={styles.agendaInner}>
        <View style={styles.agendaHeader}>
          <Text style={[styles.agendaTitle, { color: colors.text }]}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          {selectedIsToday ? (
            <View style={[styles.todayPill, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.todayText, { color: colors.accent }]}>Today</Text>
            </View>
          ) : null}
        </View>

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
            const accent = colorForEvent(event) ?? colors.accent;
            return (
              <Pressable
                key={event.id}
                onPress={() => onSelectEvent(event)}
                style={({ pressed }) => [
                  styles.agendaRow,
                  {
                    borderLeftColor: accent,
                    backgroundColor: colors.glassStrong,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${event.title}, ${timeText}`}>
                <View style={styles.agendaInfo}>
                  <Text
                    style={[
                      styles.agendaEventTitle,
                      { color: event.isCompleted ? colors.mutedText : colors.text },
                      event.isCompleted && { textDecorationLine: 'line-through' },
                    ]}
                    numberOfLines={1}>
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
       </View>
      </GlassPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96, // room for the floating add button
  },
  headerPanel: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  gridPanel: {
    marginHorizontal: spacing.sm,
  },
  gridInner: {
    paddingVertical: spacing.sm,
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
  agendaPanel: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  agendaInner: {
    padding: spacing.md,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  agendaTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
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
