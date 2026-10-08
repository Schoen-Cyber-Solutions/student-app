import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from './Themed';
import { radius, spacing, typography } from '@/constants/Theme';
import { contrastText, glassColors, readableAccent, withAlpha } from '@/constants/Glass';
import { useCalendarAccent } from '@/utils/calendarAccent';
import { useColorScheme } from './useColorScheme';
import { useTextMode } from './TabTextMode';
import GlassPanel from './GlassPanel';
import PagerStrip from './PagerStrip';
import { MyCalendarEvent } from '@/services/api/calendar';
import { isSameCalendarDay, formatTime12 } from '@/utils/time';
import { monthGridRows, monthAgendaSelection, dayAgendaEvents } from '@/utils/monthGrid';
import { isCampusEventProvider } from '@/utils/campusSource';

interface MonthViewProps {
  /** Any date inside the currently displayed month. */
  monthCursor: Date;
  /** The tapped grid date — null until the user picks one in the
   *  displayed month (agenda then shows a neutral "select a day" state). */
  selectedDate: Date | null;
  /** Height of the floating tab bar — the agenda viewport stops above it
   *  so the bar never covers content (home-indicator inset is already
   *  handled by the parent SafeAreaView). */
  bottomTabClearance: number;
  events: MyCalendarEvent[];
  colorForEvent: (event: MyCalendarEvent) => string | undefined;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onSelectEvent: (event: MyCalendarEvent) => void;
  onEventLongPress?: (event: MyCalendarEvent) => void;
}

// Monday-first, matching monthGridRows (gridStart = getMondayOfWeek).
const WEEKDAY_LETTERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MAX_DOTS = 3;





export default function MonthView({
  monthCursor,
  selectedDate,
  bottomTabClearance,
  events,
  colorForEvent,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onSelectEvent,
  onEventLongPress,
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
          map.set(key, dayAgendaEvents(events, day));
        }
      }
    }
    return map;
  }, [pageWeeks, events]);

  // Defensive: a selection outside the displayed month is meaningless —
  // render the neutral state even if a stray update slips through.
  const agendaDate = monthAgendaSelection(selectedDate, monthCursor);

  const selectedEvents = agendaDate
    ? (eventsByDay.get(agendaDate.toDateString()) ?? [])
    : [];
  const selectedIsToday = agendaDate !== null && isSameCalendarDay(agendaDate, today);

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
                const isSelected =
                  selectedDate !== null && isSameCalendarDay(day, selectedDate);
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
    <View style={styles.container}>
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

      {/* previous | current | next month grids. The strip must NOT live
          inside a ScrollView — ScrollView's own move-capture responder runs
          in an ancestor and swallows the horizontal gesture before it can
          reach the pager. fitContent sizes the clip to the grid's natural
          height; only the agenda below scrolls vertically. */}
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

      {/* Selected-day agenda — own ScrollView preserves vertical scrolling.
          The viewport ends above the floating tab bar (marginBottom); the
          inner paddingBottom lets the last card scroll clear of the FAB. */}
      <ScrollView
        style={[styles.agendaScroll, { marginBottom: bottomTabClearance }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
      <GlassPanel style={styles.agendaPanel} intensity={40}>
       <View style={styles.agendaInner}>
        <View style={styles.agendaHeader}>
          <Text style={[styles.agendaTitle, { color: colors.text }]}>
            {agendaDate
              ? agendaDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Select a day'}
          </Text>
          <Text style={[styles.agendaCount, { color: colors.secondaryText }]}>
            {selectedEvents.length === 0
              ? ''
              : `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'}`}
          </Text>
        </View>

        {!agendaDate ? (
          <Text style={[styles.emptyText, { color: colors.mutedText }]}>
            Tap a date to see its events.
          </Text>
        ) : selectedEvents.length === 0 ? (
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
            const icon =
              isCampusEventProvider(event.provider)
                ? 'calendar'
                : event.provider === 'personal'
                  ? 'person'
                  : 'book.closed';
            return (
              <Pressable
                key={event.id}
                onPress={() => onSelectEvent(event)}
                onLongPress={() => onEventLongPress?.(event)}
                delayLongPress={850}
                style={({ pressed }) => [
                  styles.eventCard,
                  {
                    borderLeftColor: accent,
                    backgroundColor: colors.glassStrong,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${event.title}, ${timeText}`}>
                <View
                  style={[
                    styles.eventIcon,
                    { backgroundColor: withAlpha(accent, scheme === 'dark' ? 0.3 : 0.18) },
                  ]}>
                  <SymbolView name={icon} tintColor={accent} size={22} />
                </View>
                <View style={styles.eventCardBody}>
                  <Text
                    style={[
                      styles.eventTitle,
                      { color: event.isCompleted ? colors.mutedText : colors.text },
                      event.isCompleted && { textDecorationLine: 'line-through' },
                    ]}
                    numberOfLines={2}>
                    {event.title}
                  </Text>
                  <View style={styles.eventMetaRow}>
                    <SymbolView name="clock" tintColor={colors.mutedText} size={13} />
                    <Text style={[styles.eventMeta, { color: colors.secondaryText }]}>
                      {timeText}
                    </Text>
                  </View>
                  {event.location ? (
                    <View style={styles.eventMetaRow}>
                      <SymbolView
                        name="mappin.and.ellipse"
                        tintColor={colors.mutedText}
                        size={13}
                      />
                      <Text
                        style={[styles.eventMeta, { color: colors.secondaryText }]}
                        numberOfLines={2}>
                        {event.location}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <SymbolView name="chevron.right" tintColor={colors.mutedText} size={14} />
              </Pressable>
            );
          })
        )}
       </View>
      </GlassPanel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  agendaScroll: {
    flex: 1,
  },
  scrollContent: {
    // FAB (56pt circle floating ~14pt above the tab bar) plus breathing
    // room — the agenda viewport itself stops at the bar via marginBottom.
    paddingBottom: 88,
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
    // Roughly square cells — tall enough to read the day number + dot row,
    // compact enough that the selected-day agenda gets real vertical room.
    aspectRatio: 1.02,
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
    ...typography.heading,
    fontSize: 18,
    fontWeight: '700',
  },
  agendaCount: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardBody: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMeta: {
    ...typography.caption,
    fontSize: 13,
    flex: 1,
  },
  emptyText: {
    ...typography.bodyRegular,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
});
