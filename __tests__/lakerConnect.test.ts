import { describe, it, expect } from 'vitest';
import {
  CALENDAR_VIEW_PROVIDERS,
  MyCalendarEvent,
} from '@/services/api/calendar';
import { toTimetableCourse } from '@/utils/timetableCourse';
import { eventOccursOnDay, getCoursesForDay, eventBlockSpan } from '@/utils/time';
import { Course } from '@/types';

// Saved Laker Connect events (provider 'laker_connect') must flow through
// the exact same derivations as personal events: toTimetableCourse for
// Day/Week, eventOccursOnDay for Month dots + agenda.

const savedCampusEvent = (over: Partial<MyCalendarEvent> = {}): MyCalendarEvent => ({
  id: 'lc-1',
  provider: 'laker_connect',
  title: 'Homecoming Tailgate',
  description: 'Food, music, games',
  location: 'Alumni Park',
  startAt: '2026-10-03T17:00:00.000',
  endAt: '2026-10-03T21:00:00.000',
  allDay: false,
  courseCode: null,
  courseName: null,
  color: null,
  sourceUrl: 'https://lakerconnect.example.edu/event/123',
  rsvpUrl: 'https://lakerconnect.example.edu/rsvp/123',
  ...over,
});

const OCT3 = new Date(2026, 9, 3); // Saturday

describe('saved Laker Connect events — calendar integration', () => {
  it('the visual Calendar allowlist includes saved campus events (not LMS)', () => {
    expect(CALENDAR_VIEW_PROVIDERS).toContain('laker_connect');
    expect(CALENDAR_VIEW_PROVIDERS).toContain('personal');
    expect(CALENDAR_VIEW_PROVIDERS).not.toContain('blackboard');
    expect(CALENDAR_VIEW_PROVIDERS).not.toContain('canvas');
  });

  it('C/D: maps into the shared timetable pipeline with real start/end times', () => {
    const course = toTimetableCourse(savedCampusEvent(), {}, undefined);
    expect(course.startTime).toBe('5:00 PM');
    expect(course.endTime).toBe('9:00 PM');
    expect(course.isCampusEvent).toBe(true);
    expect(course.isPersonal).toBe(false);
    expect(course.color).toBeTruthy(); // stable derived color, never undefined

    // Week/Day filter by weekday + exact date — lands on Saturday Oct 3.
    const inDay = getCoursesForDay([course], 'Sat', OCT3);
    expect(inDay).toHaveLength(1);

    // Same event, week window geometry: 17:00 → 21:00 (7 AM start → 600m, 240m).
    const span = eventBlockSpan(course.startTime, course.endTime, 7, 24);
    expect(span).toEqual({ startMin: 600, durationMin: 240 });
  });

  it('E: appears on its date via the shared Month predicate', () => {
    const ev = savedCampusEvent();
    expect(eventOccursOnDay(ev, OCT3)).toBe(true);
    expect(eventOccursOnDay(ev, new Date(2026, 9, 4))).toBe(false);
  });

  it('missing end time keeps the documented default duration (no all-day)', () => {
    const course = toTimetableCourse(savedCampusEvent({ endAt: null }), {}, undefined);
    expect(course.endTime).toBe('');
    // eventBlockSpan default duration covers no-end rendering.
    expect(eventBlockSpan(course.startTime, course.endTime, 7, 24)?.durationMin).toBe(40);
  });

  it('source metadata is preserved on the mapped event (RSVP/source links)', () => {
    const ev = savedCampusEvent();
    expect(ev.rsvpUrl).toContain('rsvp');
    expect(ev.sourceUrl).toContain('lakerconnect');
    // The Course projection used by the detail overlay keeps startAt for
    // exact-date matching; source links stay on MyCalendarEvent.
    const course: Course = toTimetableCourse(ev, {}, undefined);
    expect(course.startAt).toBe(ev.startAt);
  });

  it('not editable like a personal event: isPersonal stays false', () => {
    const course = toTimetableCourse(savedCampusEvent(), {}, undefined);
    expect(course.isPersonal).toBe(false);
    expect(course.isCampusEvent).toBe(true);
  });
});
