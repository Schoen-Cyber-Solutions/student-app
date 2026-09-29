import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getMe, completeIntro, UserProfile } from '@/services/api/me';
import { clearSessionToken } from '@/services/auth/devSession';
import { Text } from '@/components/Themed';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import SectionHeader from '@/components/SectionHeader';
import CourseCard from '@/components/CourseCard';
import DueDateGroup from '@/components/DueDateGroup';
import DueDateItem from '@/components/DueDateItem';
import CourseDetailOverlay from '@/components/CourseDetailOverlay';
import EmptyState from '@/components/EmptyState';
import { contrastText, glassColors, readableAccent } from '@/constants/Glass';
import { TabTextModeProvider, useTextMode, useThemedColors } from '@/components/TabTextMode';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import { useTabAccent } from '@/utils/tabAccent';
import { refreshTabAppearance, useTabAppearance } from '@/utils/tabAppearanceStore';
import { useMyCalendar } from '@/hooks/useMyCalendar';
import { useCourseColors } from '@/hooks/useCourseColors';
import { assignEventCourse, setEventCompletion, MyCalendarEvent, RecurringPreview } from '@/services/api/calendar';
import { getMyEnrollments, EnrollmentInfo } from '@/services/api/academic';
import CourseSectionPicker from '@/components/CourseSectionPicker';
import RecurringAssignSheet from '@/components/RecurringAssignSheet';

import { Course, Assignment } from '@/types';
import { colorForKey, getCourseColor, prettyCourseCode, COMPLETED_EVENT_COLOR } from '@/utils/courseLabel';
import { startOfDay, endOfDay, formatTime12, formatWeekdayShort, getMondayOfWeek, upcomingWeekBucket } from '@/utils/time';



function eventColor(
  event: MyCalendarEvent,
  courseColors: Record<string, string>,
  colorMap?: Record<string, string>,
): string | undefined {
  // Completed LMS items render neutral gray — display only, never persisted.
  if (event.isCompleted) return COMPLETED_EVENT_COLOR;
  if (event.provider === 'personal') return event.color ?? colorForKey(event.title);
  return getCourseColor(
    {
      courseSectionId: event.courseSectionId,
      courseCode: event.courseCode,
      courseName: event.courseName ?? event.title,
    },
    courseColors,
    colorMap,
  );
}

function toCourseCard(
  event: MyCalendarEvent,
  courseColors: Record<string, string>,
  colorMap?: Record<string, string>,
): Course {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : start;

  return {
    id: event.id,
    name: event.title,
    code: event.courseCode ?? '',
    location: event.location ?? '',
    startTime: formatTime12(start),
    endTime: end.getTime() > start.getTime() ? formatTime12(end) : '',
    days: [formatWeekdayShort(start) as Course['days'][number]],
    instructor: '',
    instructorEmail: '',
    color: eventColor(event, courseColors, colorMap),
    completed: event.isCompleted ?? false,
  };
}

function isDueDate(event: MyCalendarEvent): boolean {
  if (event.provider === 'personal') return false;
  if (!event.endAt) return true;
  return new Date(event.endAt).getTime() === new Date(event.startAt).getTime();
}

export default function HomeScreen() {
  return (
    <TabTextModeProvider tab="home">
      <HomeScreenContent />
    </TabTextModeProvider>
  );
}

function HomeScreenContent() {
  const scheme = useColorScheme();
  const colors = useThemedColors();
  const accent = useTabAccent('home');
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent, useTextMode());
  const homeAppearance = useTabAppearance('home');
  const { colors: courseColors, colorMap } = useCourseColors();

  // Refresh the shared appearance store on focus so Settings changes show
  // without an app restart; live writes already arrive via subscription.
  useFocusEffect(
    useCallback(() => {
      void refreshTabAppearance();
    }, [])
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dismissingIntro, setDismissingIntro] = useState(false);

  useEffect(() => {
    getMe()
      .then(({ user }) => {
        setProfile(user);
      })
      .catch(async () => {
        setProfile(null);
        await clearSessionToken();
        router.replace('/onboarding');
      });
  }, []);

  const now = useMemo(() => new Date(), []);

  const showIntro = useMemo(() => {
    return Boolean(profile && profile.onboardingState === 'complete' && !profile.introCompleted);
  }, [profile]);

  const handleDismissIntro = async () => {
    if (!profile) return;
    setDismissingIntro(true);
    try {
      await completeIntro();
      setProfile({ ...profile, introCompleted: true });
    } catch {
      // leave the intro visible so the user can retry
    } finally {
      setDismissingIntro(false);
    }
  };
  const todayStart = useMemo(() => startOfDay(now), [now]);
  const todayEnd = useMemo(() => endOfDay(now), [now]);
  // Due window ends at the end of NEXT week (local Sunday), not a rolling
  // 14 days — Upcoming Due Dates only ever covers this week's remainder
  // and the following Mon–Sun week.
  const rangeEnd = useMemo(() => {
    const monday = getMondayOfWeek(now);
    const nextSunday = new Date(monday);
    nextSunday.setDate(monday.getDate() + 13);
    return endOfDay(nextSunday);
  }, [now]);

  const range = useMemo(
    () => ({
      from: todayStart.toISOString(),
      to: rangeEnd.toISOString(),
    }),
    [todayStart, rangeEnd]
  );

  const { status, events, retry, refresh } = useMyCalendar(range);

  const todayCourses = useMemo(() => {
    // Schedule shows timed events only — zero-duration due dates live in the
    // "Today's Due" section, not as pseudo-classes here.
    const today = events
      .filter((e) => {
        if (isDueDate(e)) return false;
        const start = new Date(e.startAt);
        return start.getTime() >= todayStart.getTime() && start.getTime() <= todayEnd.getTime();
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((e) => toCourseCard(e, courseColors, colorMap));
    return today;
  }, [events, todayStart, todayEnd, courseColors, colorMap]);

  // Each due item keeps its source event so grouping uses the effective
  // CourseSection link (auto-detected or manually assigned), never the title.
  // "Today" is the full local day [todayStart, todayEnd] — an item due at
  // 9 AM still counts as due today at 5 PM, and 12:01 AM tomorrow is upcoming.
  const dueItems = useMemo(() => {
    return events
      .filter((e) => {
        const start = new Date(e.startAt);
        return isDueDate(e) && start.getTime() >= todayStart.getTime() && start.getTime() <= rangeEnd.getTime();
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((e) => {
        const start = new Date(e.startAt);
        const assignment: Assignment = {
          id: e.id,
          courseId: '',
          courseCode: e.courseCode ?? e.courseName ?? '',
          name: e.title,
          dueDate: start.toLocaleDateString('en-CA'),
          dueTime: formatTime12(start),
          status: 'not_started',
          urgency: 'medium',
        };
        return { event: e, assignment };
      });
  }, [events, todayStart, rangeEnd]);

  // Local-day boundary split — the two sections are disjoint by construction.
  const todayDueItems = useMemo(
    () => dueItems.filter((d) => new Date(d.event.startAt).getTime() <= todayEnd.getTime()),
    [dueItems, todayEnd]
  );
  const upcomingDueItems = useMemo(
    () => dueItems.filter((d) => new Date(d.event.startAt).getTime() > todayEnd.getTime()),
    [dueItems, todayEnd]
  );

  // Week buckets for Upcoming: Monday-start weeks in local time. "This Week"
  // is the remainder of the current Mon–Sun week (tomorrow → Sunday) and
  // "Next Week" the following Mon–Sun; the fetch window already ends at next
  // Sunday so nothing later can appear. Items stay a flat chronological
  // list — urgency ordering outranks course grouping.
  const upcomingBuckets = useMemo(() => {
    const buckets: { key: string; label: string; items: typeof upcomingDueItems }[] = [
      { key: 'this-week', label: 'Due This Week', items: [] },
      { key: 'next-week', label: 'Due Next Week', items: [] },
    ];
    for (const item of upcomingDueItems) {
      const bucket = upcomingWeekBucket(new Date(item.event.startAt), now);
      if (bucket === 'this-week') buckets[0].items.push(item);
      else if (bucket === 'next-week') buckets[1].items.push(item);
    }
    for (const b of buckets) {
      b.items.sort((a, b) => +new Date(a.event.startAt) - +new Date(b.event.startAt));
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [upcomingDueItems, now]);

  const todayDueDates = useMemo(() => todayDueItems.map((d) => d.assignment), [todayDueItems]);
  const upcomingDueDates = useMemo(() => upcomingDueItems.map((d) => d.assignment), [upcomingDueItems]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (code: string) => {
    setExpanded((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const [enrollments, setEnrollments] = useState<EnrollmentInfo[]>([]);
  useEffect(() => {
    getMyEnrollments()
      .then(setEnrollments)
      .catch(() => setEnrollments([]));
  }, []);

  // Enrolled sections sharing a course code need the section code shown.
  const sectionCountByCourse = useMemo(() => {
    const counts = new Map<string, number>();
    for (const enr of enrollments) {
      const code = enr.section.course.code;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return counts;
  }, [enrollments]);

  const labelForSection = useCallback(
    (e: MyCalendarEvent): string => {
      const pretty = prettyCourseCode(e.courseCode ?? e.courseName ?? 'Course');
      const multi = (sectionCountByCourse.get(e.courseCode ?? '') ?? 0) > 1;
      return multi && e.courseSectionCode ? `${pretty} · ${e.courseSectionCode}` : pretty;
    },
    [sectionCountByCourse]
  );

  // Track the event id, not a copied object — the overlay stays in sync when
  // a course assignment or re-sync refreshes the events list.
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const selectedEvent = selectedEventId ? eventById.get(selectedEventId) ?? null : null;
  const assignTarget = assignTargetId ? eventById.get(assignTargetId) ?? null : null;

  // Completion is persisted server-side (CalendarEvent.isCompleted). This
  // override map only holds optimistic values until a refetch confirms them.
  const [completionOverrides, setCompletionOverrides] = useState<Record<string, boolean>>({});
  const completionPending = useRef(new Set<string>());

  const isItemCompleted = useCallback(
    (eventId: string) =>
      completionOverrides[eventId] ?? eventById.get(eventId)?.isCompleted ?? false,
    [completionOverrides, eventById]
  );

  // Once a refetch confirms a value, hand control back to server state.
  useEffect(() => {
    setCompletionOverrides((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(prev)) {
        const ev = eventById.get(id);
        if (ev && (ev.isCompleted ?? false) === prev[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [eventById]);

  const toggleComplete = (id: string) => {
    const event = eventById.get(id);
    if (!event || completionPending.current.has(id)) return;
    const next = !(completionOverrides[id] ?? event.isCompleted ?? false);
    completionPending.current.add(id);
    setCompletionOverrides((prev) => ({ ...prev, [id]: next }));
    setEventCompletion(id, next)
      .catch(() => {
        setCompletionOverrides((prev) => {
          const nextOverrides = { ...prev };
          delete nextOverrides[id];
          return nextOverrides;
        });
        Alert.alert('Could not update', 'Please try again.');
      })
      .finally(() => {
        completionPending.current.delete(id);
      });
  };

  const completedIds = useMemo(
    () => new Set(dueItems.filter((d) => isItemCompleted(d.event.id)).map((d) => d.assignment.id)),
    [dueItems, isItemCompleted]
  );

  const handlePressDueItem = (id: string) => {
    if (eventById.has(id)) setSelectedEventId(id);
  };

  const handleAssignItem = (id: string) => {
    if (eventById.has(id)) setAssignTargetId(id);
  };

  // When a manual assignment anchors a weekly series, the backend returns a
  // recurring preview — the sheet offers "this one" vs "apply to all".
  const [recurringPrompt, setRecurringPrompt] = useState<{
    eventId: string;
    courseSectionId: string;
    courseLabel: string;
    recurring: RecurringPreview;
  } | null>(null);

  const handleAssignSelect = (sectionId: string | null, label?: string) => {
    const id = assignTargetId;
    setAssignTargetId(null);
    if (!id) return;
    assignEventCourse(id, sectionId)
      .then((result) => {
        if (sectionId && result.recurring) {
          setRecurringPrompt({
            eventId: id,
            courseSectionId: sectionId,
            courseLabel: label ?? 'course',
            recurring: result.recurring,
          });
        }
        refresh();
      })
      .catch(() => Alert.alert('Could not assign', 'Please try again.'));
  };

  // Group by effective CourseSection; unassigned events collect in a single
  // trailing group the student can triage manually. Shared by Today's Due
  // and Upcoming Due Dates.
  interface DueGroup {
    key: string;
    label: string;
    color: string;
    items: Assignment[];
    unassigned: boolean;
  }
  const groupDueItems = useCallback(
    (items: typeof dueItems): DueGroup[] => {
      const bySection = new Map<string, DueGroup>();
      const unassigned: Assignment[] = [];
      for (const item of items) {
        const sid = item.event.courseSectionId;
        if (!sid) {
          unassigned.push(item.assignment);
          continue;
        }
        const existing = bySection.get(sid) ?? {
          key: sid,
          label: labelForSection(item.event),
          color:
            getCourseColor(
              {
                courseSectionId: item.event.courseSectionId,
                courseCode: item.event.courseCode,
                courseName: item.event.courseName,
              },
              courseColors,
              colorMap,
            ) ?? accent,
          items: [],
          unassigned: false,
        };
        existing.items.push(item.assignment);
        bySection.set(sid, existing);
      }
      const groups = [...bySection.values()].sort((a, b) => a.label.localeCompare(b.label));
      if (unassigned.length > 0) {
        groups.push({ key: 'unassigned', label: 'Unassigned', color: accent, items: unassigned, unassigned: true });
      }
      // Incomplete first, then completed — items arrive date-sorted and this
      // stable sort keeps chronological order within each status.
      for (const g of groups) {
        g.items.sort(
          (a, b) => Number(isItemCompleted(b.id)) - Number(isItemCompleted(a.id))
        );
      }
      return groups;
    },
    [labelForSection, courseColors, colorMap, accent, isItemCompleted]
  );

  const todayGrouped = useMemo(() => groupDueItems(todayDueItems), [groupDueItems, todayDueItems]);

  // Dev-only trace: group label -> member event ids, so an assignment change
  // can be followed through the grouping in logs. Ids only, no titles.
  useEffect(() => {
    if (!__DEV__) return;
    const fmt = (gs: DueGroup[]) =>
      gs.map((g) => `${g.label}[${g.items.map((i) => i.id.slice(0, 8)).join('|')}]`).join(' ');
    console.debug(
      `[home/due-dates] today: ${fmt(todayGrouped) || '(none)'} | upcoming: ${upcomingBuckets.map((b) => `${b.label}: ${b.items.map((i) => i.event.id.slice(0, 8)).join('|') || '(none)'}`).join(' | ') || '(none)'}`
    );
  }, [todayGrouped, upcomingBuckets]);

  // Start every group expanded by default.
  useEffect(() => {
    setExpanded((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const g of todayGrouped) {
        if (!(g.key in next)) next[g.key] = true;
      }
      return next;
    });
  }, [todayGrouped]);

  const todayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const showContent = status !== 'loading' && status !== 'unauthorized' && status !== 'error';

  return (
    <View style={styles.container}>
      <CalendarBackground appearance={homeAppearance} />
      <AppHeader safeAreaTop greeting="Home" accent={accent} />
      <ScreenWrapper>
        <View style={styles.greeting}>
          <Text style={[styles.date, { color: readableAccent(accent, scheme === 'dark' ? 'dark' : 'light') }]}>
            {todayLabel}
          </Text>
        </View>

        {showIntro && (
          <View style={[styles.introCard, { backgroundColor: glass.accentSoft, borderColor: accent }]}>
            <Text style={[styles.introTitle, { color: colors.text }]}>Welcome to Student App</Text>
            <Text style={[styles.introBody, { color: colors.secondaryText }]}>
              • Home shows today's schedule and upcoming due dates.
              {'\n'}• Calendar has your classes and personal events.
              {'\n'}• Chat opens course communities once your enrollment is verified.
            </Text>
            <Pressable
              onPress={handleDismissIntro}
              disabled={dismissingIntro}
              style={({ pressed }) => [
                styles.introButton,
                { backgroundColor: accent, opacity: dismissingIntro ? 0.5 : 1 },
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={[styles.introButtonText, { color: contrastText(accent) }]}>
                {dismissingIntro ? 'Saving...' : 'Get started'}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader
            title="Today's Schedule"
            detail={todayCourses.length ? `${todayCourses.length} scheduled` : undefined}
            accent={accent}
          />

          {status === 'loading' && (
            <ActivityIndicator style={styles.spinner} color={accent} />
          )}

          {status === 'unauthorized' && (
            <EmptyState
              title="Not signed in"
              message="Your session is missing or expired. Sign in again."
              icon="lock.shield"
            />
          )}

          {status === 'error' && (
            <EmptyState
              title="Couldn't load schedule"
              message="Check that the backend is reachable and try again."
              icon="exclamationmark.triangle"
              actionLabel="Retry"
              onAction={retry}
            />
          )}

          {showContent &&
            (todayCourses.length ? (
              <GlassPanel style={styles.sectionPanel} intensity={30}>
                <View style={styles.panelInner}>
                  {todayCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      onPress={() => setSelectedEventId(course.id)}
                    />
                  ))}
                </View>
              </GlassPanel>
            ) : (
              <GlassPanel style={styles.sectionPanel} intensity={30}>
                <EmptyState
                  title="No events today"
                  message="Enjoy the open schedule. Upcoming work is listed below."
                  icon="calendar"
                />
              </GlassPanel>
            ))}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Today's Due"
            detail={todayDueDates.length ? `${todayDueDates.length} due` : undefined}
            accent={accent}
          />

          {showContent &&
            (todayGrouped.length ? (
              <GlassPanel style={styles.sectionPanel} intensity={30}>
                <View style={styles.listInner}>
                  {todayGrouped.map((g) => (
                    <DueDateGroup
                      key={g.key}
                      courseCode={g.label}
                      color={g.color}
                      dueDates={g.items}
                      completedIds={completedIds}
                      expanded={!!expanded[g.key]}
                      onToggleExpand={() => toggleExpand(g.key)}
                      onToggleComplete={toggleComplete}
                      onPressItem={handlePressDueItem}
                      onAssignItem={g.unassigned ? handleAssignItem : undefined}
                    />
                  ))}
                </View>
              </GlassPanel>
            ) : (
              <GlassPanel style={styles.sectionPanel} intensity={30}>
                <EmptyState
                  title="Nothing due today"
                  message="Assignments due later are listed below."
                  icon="checkmark.circle"
                />
              </GlassPanel>
            ))}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Upcoming Due Dates"
            detail={upcomingDueDates.length ? `${upcomingDueDates.length} due` : undefined}
            accent={accent}
          />

          {showContent &&
            (upcomingBuckets.length ? (
              upcomingBuckets.map((bucket) => (
                <View key={bucket.key} style={styles.weekBucket}>
                  <Text style={[styles.bucketLabel, { color: colors.secondaryText }]}>
                    {bucket.label}
                  </Text>
                  <GlassPanel style={styles.sectionPanel} intensity={30}>
                    <View style={styles.listInner}>
                      {/* Flat chronological list — the due timestamp wins over
                          course grouping; each row carries its own course
                          dot + code so identity stays visible. */}
                      {bucket.items.map((item, i) => (
                        <DueDateItem
                          key={item.event.id}
                          assignment={item.assignment}
                          isLast={i === bucket.items.length - 1}
                          completed={completedIds.has(item.assignment.id)}
                          onToggleComplete={() => toggleComplete(item.event.id)}
                          onPress={() => handlePressDueItem(item.assignment.id)}
                          onAssign={
                            item.event.courseSectionId
                              ? undefined
                              : () => handleAssignItem(item.assignment.id)
                          }
                          accent={
                            getCourseColor(
                              {
                                courseSectionId: item.event.courseSectionId,
                                courseCode: item.event.courseCode,
                                courseName: item.event.courseName,
                              },
                              courseColors,
                              colorMap,
                            ) ?? accent
                          }
                        />
                      ))}
                    </View>
                  </GlassPanel>
                </View>
              ))
            ) : (
              <GlassPanel style={styles.sectionPanel} intensity={30}>
                <EmptyState
                  title="No upcoming due dates"
                  message="Nothing due in the next 14 days."
                  icon="calendar"
                />
              </GlassPanel>
            ))}
        </View>
      </ScreenWrapper>

      <CourseDetailOverlay
        course={selectedEvent ? toCourseCard(selectedEvent, courseColors, colorMap) : null}
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        onEventChanged={refresh}
      />
      <CourseSectionPicker
        visible={assignTargetId !== null}
        selectedSectionId={assignTarget?.courseSectionId ?? null}
        onSelect={handleAssignSelect}
        onClose={() => setAssignTargetId(null)}
      />
      <RecurringAssignSheet
        visible={recurringPrompt !== null}
        eventId={recurringPrompt?.eventId ?? null}
        courseSectionId={recurringPrompt?.courseSectionId ?? null}
        courseLabel={recurringPrompt?.courseLabel ?? ''}
        recurring={recurringPrompt?.recurring ?? null}
        onApplied={refresh}
        onClose={() => setRecurringPrompt(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  greeting: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  introCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  introTitle: {
    ...typography.label,
    fontSize: 17,
    marginBottom: spacing.xs,
  },
  introBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  introButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  introButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  date: {
    ...typography.heading,
    fontSize: 22,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  list: {
    marginTop: spacing.sm,
  },
  sectionPanel: {
    marginTop: spacing.sm,
  },
  weekBucket: {
    marginTop: spacing.sm,
  },
  bucketLabel: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
    marginLeft: spacing.xs,
  },
  panelInner: {
    padding: spacing.sm,
  },
  listInner: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  spinner: {
    marginVertical: spacing.xl,
  },
});
