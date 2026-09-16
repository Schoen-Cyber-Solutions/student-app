import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { getMe, completeIntro, UserProfile } from '@/services/api/me';
import { clearSessionToken } from '@/services/auth/devSession';
import { Text } from '@/components/Themed';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import SectionHeader from '@/components/SectionHeader';
import CourseCard from '@/components/CourseCard';
import DueDateGroup from '@/components/DueDateGroup';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useMyCalendar } from '@/hooks/useMyCalendar';
import { useCourseColors } from '@/hooks/useCourseColors';
import { MyCalendarEvent } from '@/services/api/calendar';

import { Course, Assignment } from '@/types';
import { startOfDay, endOfDay, formatTime12, formatWeekdayShort } from '@/utils/time';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const COURSE_CODE_RE = /\b[A-Z]{2,}(?:\s*[-.]?\s*)?\d{3,}[A-Z]?\b/g;

const EVENT_PALETTE = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F43F5E',
];

function colorForKey(key: string | null): string | undefined {
  if (!key) return undefined;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % EVENT_PALETTE.length;
  return EVENT_PALETTE[index];
}

function deriveCourseCode(event: MyCalendarEvent): string {
  if (event.courseCode) return event.courseCode;
  if (event.courseName) return event.courseName;
  const matches = event.title.match(COURSE_CODE_RE);
  if (matches && matches.length > 0) {
    return matches[0].replace(/\s/g, '');
  }
  return 'Other';
}

function eventColor(event: MyCalendarEvent, courseColors: Record<string, string>): string | undefined {
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
  };
}

function isDueDate(event: MyCalendarEvent): boolean {
  if (event.provider === 'personal') return false;
  if (!event.endAt) return true;
  return new Date(event.endAt).getTime() === new Date(event.startAt).getTime();
}

export default function HomeScreen() {
  const colors = Colors[useColorScheme()];
  const { colors: courseColors } = useCourseColors();

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
    () => endOfDay(new Date(now.getTime() + SEVEN_DAYS_MS)),
    [now]
  );

  const range = useMemo(
    () => ({
      from: todayStart.toISOString(),
      to: rangeEnd.toISOString(),
    }),
    [todayStart, rangeEnd]
  );

  const { status, events, retry } = useMyCalendar(range);

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

  const upcomingDueDates: Assignment[] = useMemo(() => {
    return events
      .filter((e) => {
        const start = new Date(e.startAt);
        return isDueDate(e) && start.getTime() >= now.getTime() && start.getTime() <= rangeEnd.getTime();
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((e) => {
        const start = new Date(e.startAt);
        return {
          id: e.id,
          courseId: '',
          courseCode: deriveCourseCode(e),
          name: e.title,
          dueDate: start.toLocaleDateString('en-CA'),
          dueTime: formatTime12(start),
          status: 'not_started' as const,
          urgency: 'medium' as const,
        };
      });
  }, [events, now, rangeEnd]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggleExpand = (code: string) => {
    setExpanded((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleComplete = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const byCode = new Map<string, Assignment[]>();
    for (const a of upcomingDueDates) {
      const list = byCode.get(a.courseCode) ?? [];
      list.push(a);
      byCode.set(a.courseCode, list);
    }
    return Array.from(byCode.entries()).map(([code, items]) => ({
      code,
      color: code === 'Other' ? colors.tint : courseColors[code] ?? colorForKey(code) ?? colors.tint,
      items,
    }));
  }, [upcomingDueDates, colors.tint, courseColors]);

  // Start every group expanded by default.
  useEffect(() => {
    setExpanded((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const g of grouped) {
        if (!(g.code in next)) next[g.code] = true;
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
      <AppHeader safeAreaTop />
      <ScreenWrapper>
        <View style={styles.greeting}>
          <Text style={[styles.welcome, { color: colors.secondaryText }]}>
            {greetingText}
          </Text>
          <Text style={styles.date}>{todayLabel}</Text>
        </View>

        {showIntro && (
          <View style={[styles.introCard, { backgroundColor: colors.tintSoft, borderColor: colors.tint }]}>
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
                { backgroundColor: colors.tint, opacity: dismissingIntro ? 0.5 : 1 },
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={styles.introButtonText}>{dismissingIntro ? 'Saving...' : 'Get started'}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader
            title="Today's Schedule"
            detail={todayCourses.length ? `${todayCourses.length} scheduled` : undefined}
          />

          {status === 'loading' && (
            <ActivityIndicator style={styles.spinner} color={colors.tint} />
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
              todayCourses.map((course) => <CourseCard key={course.id} course={course} />)
            ) : (
              <EmptyState
                title="No events today"
                message="Enjoy the open schedule. Upcoming work is listed below."
                icon="calendar"
              />
            ))}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Upcoming Due Dates"
            detail={upcomingDueDates.length ? `${upcomingDueDates.length} due` : undefined}
          />

          {showContent &&
            (grouped.length ? (
              <View style={styles.list}>
                {grouped.map((g) => (
                  <DueDateGroup
                    key={g.code}
                    courseCode={g.code}
                    color={g.color}
                    dueDates={g.items}
                    completedIds={completed}
                    expanded={!!expanded[g.code]}
                    onToggleExpand={() => toggleExpand(g.code)}
                    onToggleComplete={toggleComplete}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title="No upcoming due dates"
                message="Nothing due in the next 7 days."
                icon="calendar"
              />
            ))}
        </View>
      </ScreenWrapper>
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
  spinner: {
    marginVertical: spacing.xl,
  },
});
