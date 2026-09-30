import { describe, it, expect } from 'vitest';
import { eventBlockSpan, detectOverlaps, MIN_EVENT_MINUTES } from '@/utils/time';
import { Course } from '@/types';

// Day view renders the full 0–24 window; Week compresses to 7–24.
const DAY = { start: 0, end: 24 };
const WEEK = { start: 7, end: 24 };

const course = (id: string, startTime: string, endTime: string): Course => ({
  id,
  name: id,
  code: '',
  instructor: '',
  instructorEmail: '',
  location: '',
  startTime,
  endTime,
  days: ['Thu'],
  color: '#64748B',
  date: '',
});

describe('eventBlockSpan — personal event duration placement', () => {
  it('A/B: 5:00 PM–9:00 PM spans 17:00→21:00 in both Day and Week windows', () => {
    const day = eventBlockSpan('5:00 PM', '9:00 PM', DAY.start, DAY.end);
    expect(day).toEqual({ startMin: 17 * 60, durationMin: 4 * 60 });
    const week = eventBlockSpan('5:00 PM', '9:00 PM', WEEK.start, WEEK.end);
    expect(week).toEqual({ startMin: (17 - 7) * 60, durationMin: 4 * 60 });
  });

  it('C: 8:00 AM–9:00 AM spans exactly one hour', () => {
    expect(eventBlockSpan('8:00 AM', '9:00 AM', DAY.start, DAY.end))
      .toEqual({ startMin: 8 * 60, durationMin: 60 });
  });

  it('D: 3:15 PM–4:45 PM positions proportionally (915 min, 90 min)', () => {
    expect(eventBlockSpan('3:15 PM', '4:45 PM', DAY.start, DAY.end))
      .toEqual({ startMin: 15 * 60 + 15, durationMin: 90 });
  });

  it('E: a 15-minute event floors at the readable minimum, not zero', () => {
    const span = eventBlockSpan('2:00 PM', '2:15 PM', DAY.start, DAY.end);
    expect(span?.durationMin).toBe(MIN_EVENT_MINUTES);
    expect(span?.startMin).toBe(14 * 60);
  });

  it('F: no end time uses the documented default duration', () => {
    const span = eventBlockSpan('5:00 PM', '', DAY.start, DAY.end);
    expect(span).toEqual({ startMin: 17 * 60, durationMin: MIN_EVENT_MINUTES });
  });

  it('G: editing the end time changes the visual duration', () => {
    const before = eventBlockSpan('5:00 PM', '9:00 PM', DAY.start, DAY.end);
    const after = eventBlockSpan('5:00 PM', '6:00 PM', DAY.start, DAY.end);
    expect(before?.durationMin).toBe(240);
    expect(after?.durationMin).toBe(60);
  });

  it('clamps events that start before the Week window instead of dropping them', () => {
    // 6–9 AM class starts before the 7 AM window top — renders clamped.
    expect(eventBlockSpan('6:00 AM', '9:00 AM', WEEK.start, WEEK.end))
      .toEqual({ startMin: 0, durationMin: 120 });
    // Fully outside the window returns null.
    expect(eventBlockSpan('1:00 AM', '2:00 AM', WEEK.start, WEEK.end)).toBeNull();
  });
});

describe('detectOverlaps — overlapping events share lanes', () => {
  it('overlapping events split horizontal space and stay tappable', () => {
    const slots = detectOverlaps([
      course('a', '5:00 PM', '7:00 PM'),
      course('b', '6:00 PM', '9:00 PM'),
      course('c', '9:30 PM', '10:00 PM'),
    ]);
    const byId = Object.fromEntries(slots.map((s) => [s.courseId, s]));
    expect(byId.a.totalColumns).toBe(2);
    expect(byId.b.totalColumns).toBe(2);
    expect(byId.a.columnIndex).not.toBe(byId.b.columnIndex);
    // Non-overlapping event still reports the shared column count but a free lane.
    expect(byId.c.totalColumns).toBe(2);
  });

  it('an event without end time overlaps for its default rendered duration', () => {
    const slots = detectOverlaps(
      [
        course('noend', '5:00 PM', ''),
        course('inside', '5:15 PM', '5:30 PM'),
      ],
      MIN_EVENT_MINUTES,
    );
    const byId = Object.fromEntries(slots.map((s) => [s.courseId, s]));
    // 5:15–5:30 falls inside the 40-minute default span → two lanes.
    expect(byId.noend.totalColumns).toBe(2);
    expect(byId.inside.totalColumns).toBe(2);
  });
});
