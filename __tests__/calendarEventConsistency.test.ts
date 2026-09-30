import { describe, it, expect } from 'vitest';
import {
  CALENDAR_VIEW_PROVIDERS,
  MyCalendarEvent,
} from '@/services/api/calendar';
import { toTimetableCourse } from '@/utils/timetableCourse';
import { eventOccursOnDay, getCoursesForDay } from '@/utils/time';
import { Course } from '@/types';

// ── Shared derivations — exactly what each view runs ──────────────────────
// Week (buildDayCourses) and Day both go through
//   events → toTimetableCourse → getCoursesForDay(courses, weekday, date)
// Month goes through eventOccursOnDay for dots and the selected-day agenda.
const dayEventsWeekDay = (courses: Course[], day: Date): Course[] =>
  getCoursesForDay(courses, formatWeekday(day), day);
const dayEventsMonth = (events: MyCalendarEvent[], day: Date): MyCalendarEvent[] =>
  events.filter((e) => eventOccursOnDay(e, day));

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const formatWeekday = (d: Date): Course['days'][number] =>
  WEEKDAYS[d.getDay()] as Course['days'][number];

const personalEvent = (over: Partial<MyCalendarEvent>): MyCalendarEvent => ({
  id: 'pe-1',
  provider: 'personal',
  title: 'Study session',
  description: null,
  location: 'Library',
  startAt: '2026-10-01T15:00:00.000',
  endAt: '2026-10-01T16:00:00.000',
  allDay: false,
  courseCode: null,
  courseName: null,
  color: null,
  ...over,
});

const OCT1 = new Date(2026, 9, 1); // Thursday, Oct 1 2026 — Week 40 (Sep 28–Oct 4)
const OCT2 = new Date(2026, 9, 2);
const OCT3 = new Date(2026, 9, 3);
const NEXT_THURSDAY = new Date(2026, 9, 8);

describe('personal events — single source across Day / Week / Month', () => {
  it('the Calendar provider allowlist includes personal events', () => {
    expect(CALENDAR_VIEW_PROVIDERS).toContain('personal');
    expect(CALENDAR_VIEW_PROVIDERS).not.toContain('blackboard');
    expect(CALENDAR_VIEW_PROVIDERS).not.toContain('canvas');
  });

  it('A/B: created Oct 1 — appears on Oct 1 via the shared Week/Day derivation', () => {
    const events = [personalEvent({})];
    const courses = events.map((e) => toTimetableCourse(e, {}));
    expect(dayEventsWeekDay(courses, OCT1).map((c) => c.id)).toEqual(['pe-1']);
    expect(dayEventsWeekDay(courses, OCT2)).toHaveLength(0);
    // Same weekday a week later must NOT match — exact startAt date rules.
    expect(dayEventsWeekDay(courses, NEXT_THURSDAY)).toHaveLength(0);
  });

  it('C: created Oct 1 — Month dot/agenda derivation shows it on Oct 1 only', () => {
    const events = [personalEvent({})];
    expect(dayEventsMonth(events, OCT1).map((e) => e.id)).toEqual(['pe-1']);
    expect(dayEventsMonth(events, OCT2)).toHaveLength(0);
    expect(dayEventsMonth(events, NEXT_THURSDAY)).toHaveLength(0);
  });

  it('D: title edit — all views show the new title from the same event', () => {
    const events = [personalEvent({ title: 'Gym' })];
    const courses = events.map((e) => toTimetableCourse(e, {}));
    expect(dayEventsWeekDay(courses, OCT1)[0].name).toBe('Gym');
    expect(dayEventsMonth(events, OCT1)[0].title).toBe('Gym');
  });

  it('E: moved Oct 1 → Oct 3 — old date clears, new date updates everywhere', () => {
    const events = [personalEvent({ startAt: '2026-10-03T15:00:00.000', endAt: '2026-10-03T16:00:00.000' })];
    const courses = events.map((e) => toTimetableCourse(e, {}));
    expect(dayEventsWeekDay(courses, OCT1)).toHaveLength(0);
    expect(dayEventsWeekDay(courses, OCT3).map((c) => c.id)).toEqual(['pe-1']);
    expect(dayEventsMonth(events, OCT1)).toHaveLength(0);
    expect(dayEventsMonth(events, OCT3).map((e) => e.id)).toEqual(['pe-1']);
  });

  it('F: deleted — removing it from the events array clears every view', () => {
    const events: MyCalendarEvent[] = [];
    const courses = events.map((e) => toTimetableCourse(e, {}));
    expect(dayEventsWeekDay(courses, OCT1)).toHaveLength(0);
    expect(dayEventsMonth(events, OCT1)).toHaveLength(0);
  });

  it('G: weekly recurrence — each backend-expanded occurrence lands on its own day in every view', () => {
    // Backend emits one row per occurrence (seriesId + synthetic id).
    const occurrences = [
      personalEvent({ id: 'pe-1~2026-10-01', seriesId: 'pe-1', startAt: '2026-10-01T15:00:00.000', endAt: '2026-10-01T16:00:00.000', recurrence: { freq: 'weekly', interval: 1, until: null, count: null } }),
      personalEvent({ id: 'pe-1~2026-10-08', seriesId: 'pe-1', startAt: '2026-10-08T15:00:00.000', endAt: '2026-10-08T16:00:00.000', recurrence: { freq: 'weekly', interval: 1, until: null, count: null } }),
    ];
    const courses = occurrences.map((e) => toTimetableCourse(e, {}));
    expect(dayEventsWeekDay(courses, OCT1).map((c) => c.id)).toEqual(['pe-1~2026-10-01']);
    expect(dayEventsWeekDay(courses, NEXT_THURSDAY).map((c) => c.id)).toEqual(['pe-1~2026-10-08']);
    expect(dayEventsMonth(occurrences, OCT1).map((e) => e.id)).toEqual(['pe-1~2026-10-01']);
    expect(dayEventsMonth(occurrences, NEXT_THURSDAY).map((e) => e.id)).toEqual(['pe-1~2026-10-08']);
  });

  it('H: month span — a multi-day event dots every day it touches', () => {
    const events = [personalEvent({ startAt: '2026-10-01T22:00:00.000', endAt: '2026-10-03T10:00:00.000' })];
    for (const day of [OCT1, OCT2, OCT3]) {
      expect(dayEventsMonth(events, day).map((e) => e.id)).toEqual(['pe-1']);
    }
  });
});
