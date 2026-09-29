import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';
import { contrastText, glassColors, readableAccent } from '@/constants/Glass';
import { useCalendarAccent } from '@/utils/calendarAccent';
import { useColorScheme } from './useColorScheme';
import { useTextMode } from './TabTextMode';
import GlassPanel from './GlassPanel';
import PagerStrip from './PagerStrip';
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

/** Monday-start grid (6x7 day cells) covering the month that contains `d`. */
function monthGridRows(d: Date): Date[][] {
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const gridStart = getMondayOfWeek(firstOfMonth);
  const dayCount = Math.round((lastOfMonth.getTime() - gridStart.getTime()) / DAY_MS) + 1;
  const totalCells = Math.ceil(dayCount / 7) * 7;

  const cells: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cell = new Date(gridStart);
    cell.setDate(gridStart.getDate() + i);
    cells.push(cell);
  }
  const rows: Date[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
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
  const colors = glassColors(scheme, useCalendarAccent(), useTextMode());
  const today = new Date();

  // Grids for all three pager pages (prev | current | next month).
  const pageWeeks = useMemo(
    () =>
      [-1, 0, 1].map((offset) =>
        monthGridRows(
          new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1)
        )
      ),
    [monthCursor]
  );

  // One shared day→events index covering every rendered day cell across all
  // three pages, so neighbor months show their dots while dragging.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, MyCalendarEvent[]>();
    for (const rows of pageWeeks) {
      for (const row of rows) {
        for (const day of row) {
          const key = day.toDateString();
          if (map.has(key)) continue; // grid edges overlap between months
          map.set(
            key,
            events
              .filter((e) => eventOccursOn(e, day))
              .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
          );
        }
      }
    }
    return map;
  }, [pageWeeks, events]);

  const selectedEvents = eventsByDay.get(selectedDate.toDateString()) ?? [];
  const selectedIsToday = isSameCalendarDay(selectedDate, today);

  const isCurrentMonth =
    monthCursor.getFullYear() === today.getFullYear() &&
    monthCursor.getMonth() === today.getMonth();

  /** One month page — just the weekday row + grid. The header is fixed
   *  chrome above the pager and updates when the swipe settles. */
  const renderMonthGrid = (weeks: Date[][], cursor: Date) => {
    const pageMonth = cursor.getMonth();

    return (
      <GlassPanel style={styles.gridPanel} intensity={30} variant="faint">
       <View style={styles.gridInner}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LETTERS.map((letter, i) => (
              <Text key={i} style={[styles.weekdayLabel, { color: colors.secondaryText }]}>
                {letter}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day) => {
                const inMonth = day.getMonth() === pageMonth;
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
                        <Text style={[styles.moreText, { color: colors.secondaryText }]}>
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
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {/* Fixed chrome — never slides during month paging. */}
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
          <Text style={[styles.monthLabel, { color: readableAccent(colors.accent, scheme) }]}>
            {monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
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

      {/* previous | current | next month grids — fitContent because the
          strip lives inside a ScrollView, where a flex:1 clip collapses
          to zero height and blanks the grid. */}
      <PagerStrip
        fitContent
        position={`${monthCursor.getFullYear()}-${monthCursor.getMonth()}`}
        renderPage={(slot) =>
          renderMonthGrid(
            pageWeeks[slot + 1],
            new Date(monthCursor.getFullYear(), monthCursor.getMonth() + slot, 1)
          )
        }
        onSwipeLeft={onNextMonth}
        onSwipeRight={onPrevMonth}
      />

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
    paddingTop: 6,
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
    marginTop: 4,
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
