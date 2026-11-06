import { describe, it, expect } from 'vitest';
import {
  eventBlockSpan,
  detectOverlaps,
  shouldCollapseCluster,
  MIN_EVENT_MINUTES,
  MIN_LEGIBLE_COL_PX,
} from '@/utils/time';
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

describe('detectOverlaps — cluster-scoped column assignment', () => {
  const byId = (slots: ReturnType<typeof detectOverlaps>) =>
    Object.fromEntries(slots.map((s) => [s.courseId, s]));

  it('overlapping events split space; disjoint events keep full width', () => {
    const slots = detectOverlaps([
      course('a', '5:00 PM', '7:00 PM'),
      course('b', '6:00 PM', '9:00 PM'),
      course('c', '9:30 PM', '10:00 PM'),
    ]);
    const s = byId(slots);
    expect(s.a.totalColumns).toBe(2);
    expect(s.b.totalColumns).toBe(2);
    expect(s.a.columnIndex).not.toBe(s.b.columnIndex);
    // THE FIX: c is in its own cluster — a full-width column, not the
    // shared lane count that used to compress unrelated events.
    expect(s.c.totalColumns).toBe(1);
    expect(s.c.columnIndex).toBe(0);
    expect(s.a.clusterId).toBe(s.b.clusterId);
    expect(s.c.clusterId).not.toBe(s.a.clusterId);
  });

  it('adjacent events touching at an endpoint do not overlap', () => {
    const slots = detectOverlaps([
      course('a', '5:00 PM', '6:00 PM'),
      course('b', '6:00 PM', '7:00 PM'),
    ]);
    const s = byId(slots);
    expect(s.a.totalColumns).toBe(1);
    expect(s.b.totalColumns).toBe(1);
    expect(s.a.clusterId).not.toBe(s.b.clusterId);
  });

  it('three simultaneous events get three columns', () => {
    const slots = detectOverlaps([
      course('a', '5:00 PM', '6:00 PM'),
      course('b', '5:00 PM', '6:30 PM'),
      course('c', '5:15 PM', '5:45 PM'),
    ]);
    expect(new Set(slots.map((s) => s.columnIndex)).size).toBe(3);
    slots.forEach((s) => expect(s.totalColumns).toBe(3));
  });

  it('four or more simultaneous events get that many columns', () => {
    const slots = detectOverlaps([
      course('a', '5:00 PM', '6:00 PM'),
      course('b', '5:05 PM', '6:00 PM'),
      course('c', '5:10 PM', '6:00 PM'),
      course('d', '5:15 PM', '6:00 PM'),
      course('e', '5:20 PM', '6:00 PM'),
    ]);
    slots.forEach((s) => expect(s.totalColumns).toBe(5));
  });

  it('events with identical start and end get distinct columns', () => {
    const slots = detectOverlaps([
      course('x', '5:00 PM', '6:00 PM'),
      course('y', '5:00 PM', '6:00 PM'),
    ]);
    const s = byId(slots);
    expect(s.x.columnIndex).not.toBe(s.y.columnIndex);
  });

  it('a partially-overlapping chain shares one cluster with two lanes', () => {
    // a∩b and b∩c overlap; a,c don't — still one cluster, two lanes.
    const slots = detectOverlaps([
      course('a', '5:00 PM', '6:00 PM'),
      course('b', '5:30 PM', '6:30 PM'),
      course('c', '6:15 PM', '7:00 PM'),
    ]);
    const s = byId(slots);
    expect(s.a.clusterId).toBe(s.b.clusterId);
    expect(s.b.clusterId).toBe(s.c.clusterId);
    slots.forEach((sl) => expect(sl.totalColumns).toBe(2));
    expect(s.a.columnIndex).toBe(s.c.columnIndex); // c reuses a's lane
  });

  it('separate clusters get independent column counts', () => {
    const slots = detectOverlaps([
      course('a', '9:00 AM', '10:00 AM'),
      course('b', '9:30 AM', '10:30 AM'),
      course('c', '5:00 PM', '6:00 PM'),
      course('d', '5:15 PM', '6:00 PM'),
      course('e', '5:30 PM', '6:00 PM'),
    ]);
    const s = byId(slots);
    expect(s.a.totalColumns).toBe(2);
    expect(s.c.totalColumns).toBe(3);
  });

  it('short and long events overlap correctly', () => {
    const slots = detectOverlaps([
      course('long', '4:00 PM', '9:00 PM'),
      course('short', '5:00 PM', '5:15 PM'),
    ]);
    const s = byId(slots);
    expect(s.long.totalColumns).toBe(2);
    expect(s.short.totalColumns).toBe(2);
  });

  it('short events whose rendered blocks visually collide share a cluster', () => {
    // 5:00–5:05 and 5:10–5:15 don't overlap in real time, but both render
    // floored at 40 minutes — the overlap math must match what is drawn.
    const slots = detectOverlaps(
      [course('a', '5:00 PM', '5:05 PM'), course('b', '5:10 PM', '5:15 PM')],
      MIN_EVENT_MINUTES,
    );
    const s = byId(slots);
    expect(s.a.clusterId).toBe(s.b.clusterId);
    expect(s.a.totalColumns).toBe(2);
    // With no default duration (raw semantics), they don't overlap.
    const raw = byId(detectOverlaps([course('a', '5:00 PM', '5:05 PM'), course('b', '5:10 PM', '5:15 PM')]));
    expect(raw.a.totalColumns).toBe(1);
  });

  it('an event without end time overlaps for its default rendered duration', () => {
    const slots = detectOverlaps(
      [course('noend', '5:00 PM', ''), course('inside', '5:15 PM', '5:30 PM')],
      MIN_EVENT_MINUTES,
    );
    const s = byId(slots);
    expect(s.noend.totalColumns).toBe(2);
    expect(s.inside.totalColumns).toBe(2);
  });

  it('cluster metadata spans the full overlap range', () => {
    const slots = detectOverlaps([
      course('a', '5:00 PM', '6:00 PM'),
      course('b', '5:30 PM', '7:15 PM'),
    ]);
    const s = byId(slots);
    expect(s.a.clusterStartMin).toBe(17 * 60);
    expect(s.a.clusterEndMin).toBe(19 * 60 + 15);
    expect(s.a.clusterSize).toBe(2);
  });

  it('ordering is deterministic regardless of input order', () => {
    const input = [
      course('c', '5:30 PM', '6:00 PM'),
      course('a', '5:00 PM', '7:00 PM'),
      course('b', '5:15 PM', '5:45 PM'),
    ];
    const forward = detectOverlaps(input);
    const reversed = detectOverlaps([...input].reverse());
    expect(forward).toEqual(reversed);
  });

  it('every slot stays inside its day column (lane < totalColumns)', () => {
    const slots = detectOverlaps([
      course('a', '5:00 PM', '6:00 PM'),
      course('b', '5:05 PM', '6:00 PM'),
      course('c', '5:10 PM', '6:00 PM'),
      course('d', '9:00 AM', '10:00 AM'),
    ]);
    slots.forEach((s) => {
      expect(s.columnIndex).toBeGreaterThanOrEqual(0);
      expect(s.columnIndex).toBeLessThan(s.totalColumns);
    });
  });

  it('no event is dropped — every course gets exactly one slot', () => {
    const courses = [
      course('a', '9:00 AM', '10:00 AM'),
      course('b', '9:30 AM', '11:00 AM'),
      course('c', '12:00 PM', '1:00 PM'),
      course('d', '5:00 PM', '5:10 PM'),
    ];
    const slots = detectOverlaps(courses);
    expect(slots).toHaveLength(courses.length);
    expect(new Set(slots.map((s) => s.courseId))).toEqual(new Set(courses.map((c) => c.id)));
  });
});

describe('shouldCollapseCluster — sliver collapse threshold', () => {
  it('collapses when per-column width drops below the legible minimum', () => {
    // ~50pt weekday column ÷ 3 simultaneous → ~17pt: collapse.
    expect(shouldCollapseCluster(50, 3)).toBe(true);
    // Same column, 2 events → 25pt: just under 26pt → collapse.
    expect(shouldCollapseCluster(50, 2)).toBe(true);
    // ~55pt column, 2 events → 27.5pt: renders as columns.
    expect(shouldCollapseCluster(55, 2)).toBe(false);
  });

  it('never collapses a single-column cluster', () => {
    expect(shouldCollapseCluster(10, 1)).toBe(false);
  });

  it('threshold constant is sane for phone screens', () => {
    expect(MIN_LEGIBLE_COL_PX).toBeGreaterThanOrEqual(20);
    expect(MIN_LEGIBLE_COL_PX).toBeLessThanOrEqual(40);
  });
});
