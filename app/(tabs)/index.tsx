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
import CourseDetailOverlay from '@/components/CourseDetailOverlay';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { contrastText, glassColors } from '@/constants/Glass';
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
import { colorForKey, prettyCourseCode, COMPLETED_EVENT_COLOR } from '@/utils/courseLabel';
import { startOfDay, endOfDay, formatTime12, formatWeekdayShort } from '@/utils/time';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function eventColor(event: MyCalendarEvent, courseColors: Record<string, string>): string | undefined {
  // Completed LMS items render neutral gray — display only, never persisted.
  if (event.isCompleted) return COMPLETED_EVENT_COLOR;
  if (event.provider === 'personal') return event.color ?? colorForKey(event.title);
  const key = event.courseCode ?? event.title;
  return courseColors[key] ?? colorForKey(key);
}

function toCourseCard(event: MyCalendarEvent, courseColors: Record<string, string>): Course {
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
    color: eventColor(event, courseColors),
    completed: event.isCompleted ?? false,
  };
}

function isDueDate(event: MyCalendarEvent): boolean {
  if (event.provider === 'personal') return false;
  if (!event.endAt) return true;
  return new Date(event.endAt).getTime() === new Date(event.startAt).getTime();
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const accent = useTabAccent('home');
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent);
  const homeAppearance = useTabAppearance('home');
  const { colors: courseColors } = useCourseColors();

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

  const isBirthdayToday = useMemo(() => {
    if (!profile || !profile.birthMonth || !profile.birthDay) return false;
    return (
      now.getMonth() + 1 === profile.birthMonth && now.getDate() === profile.birthDay
    );
  }, [now, profile]);

  const showIntro = useMemo(() => {
    return Boolean(profile && profile.onboardingState === 'complete' && !profile.introCompleted);
  }, [profile]);

  const greetingText = useMemo(() => {
    if (isBirthdayToday && profile?.firstName) {
      return `Happy Birthday, ${profile.firstName}!`;
    }
    if (showIntro && profile?.firstName) {
      return `Hello, ${profile.firstName}`;
    }
    if (showIntro) {
      return 'Hello';
    }
    if (profile?.firstName) {
      return `Welcome back, ${profile.firstName}`;
    }
    return 'Welcome back';
  }, [isBirthdayToday, profile, showIntro]);

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
  const rangeEnd = useMemo(
    () => endOfDay(new Date(now.getTime() + FOURTEEN_DAYS_MS)),
    [now]
  );

  const range = useMemo(
    () => ({
      from: todayStart.toISOString(),
      to: rangeEnd.toISOString(),
    }),
    [todayStart, rangeEnd]
  );

  const { status, events, retry, refresh } = useMyCalendar(range);

  const todayCourses = useMemo(() => {
    const today = events
      .filter((e) => {
        const start = new Date(e.startAt);
        return start.getTime() >= todayStart.getTime() && start.getTime() <= todayEnd.getTime();
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((e) => toCourseCard(e, courseColors));
    return today;
  }, [events, todayStart, todayEnd, courseColors]);

  // Each due item keeps its source event so grouping uses the effective
  // CourseSection link (auto-detected or manually assigned), never the title.
  const dueItems = useMemo(() => {
    return events
      .filter((e) => {
        const start = new Date(e.startAt);
        return isDueDate(e) && start.getTime() >= now.getTime() && start.getTime() <= rangeEnd.getTime();
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((e) => {
        const start = new Date(e.startAt);
        const assignment: Assignment = {
          id: e.id,
          courseId: '',
          courseCode: '',
          name: e.title,
          dueDate: start.toLocaleDateString('en-CA'),
          dueTime: formatTime12(start),
          status: 'not_started',
          urgency: 'medium',
        };
        return { event: e, assignment };
      });
  }, [events, now, rangeEnd]);

  const upcomingDueDates = useMemo(() => dueItems.map((d) => d.assignment), [dueItems]);

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
  // trailing group the student can triage manually.
  const grouped = useMemo(() => {
    interface Group {
      key: string;
      label: string;
      color: string;
      items: Assignment[];
      unassigned: boolean;
    }
    const bySection = new Map<string, Group>();
    const unassigned: Assignment[] = [];
    for (const item of dueItems) {
      const sid = item.event.courseSectionId;
      if (!sid) {
        unassigned.push(item.assignment);
        continue;
      }
      const existing = bySection.get(sid) ?? {
        key: sid,
        label: labelForSection(item.event),
        color: item.event.courseCode
          ? courseColors[item.event.courseCode] ?? colorForKey(item.event.courseCode) ?? accent
          : accent,
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
  }, [dueItems, labelForSection, courseColors, accent, isItemCompleted]);

  // Dev-only trace: group label -> member event ids, so an assignment change
  // can be followed through the grouping in logs. Ids only, no titles.
  useEffect(() => {
    if (!__DEV__) return;
    const summary = grouped
      .map((g) => `${g.label}[${g.items.map((i) => i.id.slice(0, 8)).join('|')}]`)
      .join(' ');
    console.debug(`[home/due-dates] ${summary || '(no due dates)'}`);
  }, [grouped]);

  // Start every group expanded by default.
  useEffect(() => {
    setExpanded((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const g of grouped) {
        if (!(g.key in next)) next[g.key] = true;
      }
      return next;
    });
  }, [grouped]);

  const todayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const showContent = status !== 'loading' && status !== 'unauthorized' && status !== 'error';

  return (
    <View style={styles.container}>
      <CalendarBackground appearance={homeAppearance} />
      <AppHeader safeAreaTop accent={accent} />
      <ScreenWrapper>
        <View style={styles.greeting}>
          <Text style={[styles.welcome, { color: colors.secondaryText }]}>
            {greetingText}
          </Text>
          <Text style={styles.date}>{todayLabel}</Text>
        </View>

        {showIntro && (
          <View style={[styles.introCard, { backgroundColor: glass.accentSoft, borderColor: accent }]}>
            <Text style={[styles.introTitle, { color: colors.text }]}>Welcome to Student App</Text>
            <Text style={[styles.introBody, { color: colors.secondaryText }]}>
              • Home shows today's schedule and upcoming due dates.
              {'\n'}• Calendar has your classes, assignments, and personal events.
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
                  {todayCourses.map((course) => <CourseCard key={course.id} course={course} />)}
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
            title="Upcoming Due Dates"
            detail={upcomingDueDates.length ? `${upcomingDueDates.length} due` : undefined}
          />

          {showContent &&
            (grouped.length ? (
              <GlassPanel style={styles.sectionPanel} intensity={30}>
                <View style={styles.listInner}>
                  {grouped.map((g) => (
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
                  title="No upcoming due dates"
                  message="Nothing due in the next 14 days."
                  icon="calendar"
                />
              </GlassPanel>
            ))}
        </View>
      </ScreenWrapper>

      <CourseDetailOverlay
        course={selectedEvent ? toCourseCard(selectedEvent, courseColors) : null}
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
    paddingTop: spacing.sm,
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
  welcome: {
    ...typography.label,
    marginBottom: 2,
  },
  date: {
    ...typography.title,
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
