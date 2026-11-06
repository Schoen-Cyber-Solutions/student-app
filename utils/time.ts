import { Course } from '@/types';

const DAYS: Course['days'][number][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Calendar date helpers ──

/** Return the Monday of the week containing the given date. */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Build Mon–Sun dates starting from the given Monday. */
export function getWeekDayDates(monday: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// ── Week pager window ──
// The week pager is a finite paged list of real weeks around today — one
// page per actual week Monday, keyed by its own date. No virtual slot is
// ever recycled while visible.
/** Pages on each side of today's week — ±3 years. */
export const WEEK_PAGE_RADIUS = 156;
export const WEEK_PAGE_COUNT = WEEK_PAGE_RADIUS * 2 + 1;

/** Monday of the week page at `index` (index 0 = anchorMonday − RADIUS
 *  weeks, index RADIUS = anchorMonday itself). Calendar-aware via setDate,
 *  so DST transitions can't drift the result off a real Monday. */
export function weekStartAtPage(index: number, anchorMonday: Date): Date {
  const d = new Date(anchorMonday);
  d.setDate(anchorMonday.getDate() + (index - WEEK_PAGE_RADIUS) * 7);
  return d;
}

/** Page index of a week Monday inside the window, or -1 when out of range.
 *  The ms→weeks delta is rounded — DST shifts it by ±1 hour at most. */
export function weekPageIndex(weekStart: Date, anchorMonday: Date): number {
  const weeks = Math.round(
    (weekStart.getTime() - anchorMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const idx = weeks + WEEK_PAGE_RADIUS;
  return idx >= 0 && idx < WEEK_PAGE_COUNT ? idx : -1;
}

/** Format a week label like "September 7 – 11, 2026" from Mon–Fri dates. */
export function formatWeekLabel(dates: Date[]): string {
  if (dates.length === 0) return '';
  const start = dates[0];
  const end = dates[dates.length - 1];
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/**
 * ISO 8601 week number (Monday-first). Week 1 is the week containing the
 * year's first Thursday — the convention used by printed "KW" calendars.
 */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day + 3); // shift to this week's Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / 604800000);
}

/** Check whether two Date objects represent the same calendar day. */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Does a calendar event intersect a calendar day? Used by Month dots and
 *  any day-level event lookup — spans count on every day they touch. */
export function eventOccursOnDay(
  event: { startAt: string; endAt?: string | null },
  day: Date,
): boolean {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : start;
  return start <= endOfDay(day) && end >= startOfDay(day);
}

/** "Mon", "Tue", etc. */
export function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/** "7", "14", etc. */
export function formatDayOfMonth(date: Date): string {
  return String(date.getDate());
}

/** Parse a 12-hour time string like "10:00 AM" into minutes from midnight. */
export function toMinutes(time: string): number {
  const [clock, period] = time.split(' ');
  const [h, m] = clock.split(':').map(Number);
  const hours = (h % 12) + (period === 'PM' ? 12 : 0);
  return hours * 60 + m;
}

/** Documented default visual duration for events without an end time, and
 *  the minimum rendered block duration — a 15-minute event stays tappable
 *  and readable without distorting long events. */
export const MIN_EVENT_MINUTES = 40;

/**
 * Timeline span for one event inside a [startHour, endHour) window, in
 * window-relative minutes: `{ startMin, durationMin }`. Events without an
 * end time render for MIN_EVENT_MINUTES; shorter real durations floor at
 * the minimum. Returns null when the event can't intersect the window —
 * the shared geometry Day and Week both use, so a 5 PM–9 PM event spans
 * the same four hours everywhere.
 */
export function eventBlockSpan(
  startTime: string,
  endTime: string,
  startHour: number,
  endHour: number,
): { startMin: number; durationMin: number } | null {
  const rawStart = toMinutes(startTime);
  const rawEnd = endTime ? toMinutes(endTime) : rawStart + MIN_EVENT_MINUTES;
  if (
    isNaN(rawStart) ||
    rawEnd <= startHour * 60 ||
    rawStart >= endHour * 60
  ) {
    return null;
  }
  const start = Math.max(rawStart, startHour * 60);
  const duration = Math.max(
    isNaN(rawEnd) ? MIN_EVENT_MINUTES : rawEnd - start,
    MIN_EVENT_MINUTES
  );
  const clampedEnd = Math.min(start + duration, endHour * 60);
  return { startMin: start - startHour * 60, durationMin: clampedEnd - start };
}

/** Duration in minutes between two 12-hour time strings. */
export function durationMinutes(start: string, end: string): number {
  return toMinutes(end) - toMinutes(start);
}

/** Format a 24-hour number as a short 12-hour label, e.g. 8 → "8 AM", 12 → "12 PM". */
export function formatHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h = hour24 % 12 || 12;
  return `${h} ${period}`;
}

/** Format a date as a 12-hour time string, e.g. "2:00 PM". */
export function formatTime12(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}

/** Return the start of a calendar day in local time. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return the end of a calendar day in local time (23:59:59.999). */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Week bucket for an upcoming due date, relative to `now`. Monday-start
 *  weeks in local time: "this-week" = remainder of the current Mon–Sun week
 *  (any time after `now` through Sunday), "next-week" = the following
 *  Mon–Sun, "later" = anything beyond that. */
export type UpcomingWeekBucket = 'this-week' | 'next-week' | 'later';

/** Due-date classification by local calendar day, relative to `now`.
 *  'today' covers the entire local day [00:00:00, 23:59:59.999] — an item
 *  due at 9 AM is still 'today' at 5 PM — 'upcoming' starts tomorrow, and
 *  'past' is anything before today's local midnight (excluded from the
 *  Home due lists). */
export type DueDateSection = 'past' | 'today' | 'upcoming';

export function dueDateSection(startAt: Date, now: Date): DueDateSection {
  const t = startAt.getTime();
  if (t < startOfDay(now).getTime()) return 'past';
  if (t <= endOfDay(now).getTime()) return 'today';
  return 'upcoming';
}

export function upcomingWeekBucket(start: Date, now: Date): UpcomingWeekBucket {
  const monday = getMondayOfWeek(now);
  const thisSunday = new Date(monday);
  thisSunday.setDate(monday.getDate() + 6);
  if (start.getTime() <= endOfDay(thisSunday).getTime()) return 'this-week';
  const nextSunday = new Date(thisSunday);
  nextSunday.setDate(thisSunday.getDate() + 7);
  if (start.getTime() <= endOfDay(nextSunday).getTime()) return 'next-week';
  return 'later';
}

/** Return courses that occur on a specific weekday. When `date` is given,
 *  events carrying an exact `startAt` must fall on that calendar day —
 *  weekday-name matching alone would repeat them every week. */
export function getCoursesForDay(
  courses: Course[],
  day: Course['days'][number],
  date?: Date,
): Course[] {
  return courses
    .filter(
      (c) =>
        c.days.includes(day) &&
        (!date || !c.startAt || isSameCalendarDay(new Date(c.startAt), date))
    )
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

/**
 * Return the hour boundaries that contain all given courses.
 * Rounds down to the nearest hour for start and up for end,
 * with a minimum sensible university day (8 AM – 6 PM).
 */
export function getTimeRange(courses: Course[]): { startHour: number; endHour: number } {
  if (courses.length === 0) return { startHour: 8, endHour: 18 };

  const starts = courses.map((c) => toMinutes(c.startTime));
  const ends = courses.map((c) => toMinutes(c.endTime));

  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);

  return {
    startHour: Math.max(0, Math.floor(minStart / 60) - 1),
    endHour: Math.min(23, Math.ceil(maxEnd / 60) + 1),
  };
}

/** Build an ordered list of hour numbers from start to end (exclusive of end). */
export function getHourRange(startHour: number, endHour: number): number[] {
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) {
    hours.push(h);
  }
  return hours;
}

export interface OverlapSlot {
  courseId: string;
  columnIndex: number;
  /** Columns used by THIS event's overlap cluster — not the whole day. */
  totalColumns: number;
  /** Stable id of the transitively-connected overlap cluster. */
  clusterId: number;
  /** Cluster span, minutes after midnight — for aggregate rendering. */
  clusterStartMin: number;
  clusterEndMin: number;
  clusterSize: number;
}

/** Per-column width below which simultaneous events become unreadable
 *  slivers — callers collapse such clusters into an aggregate chip.
 *  ~34px can't hold even a compact course code, so lanes narrower than
 *  this always render better as one chip than as clipped text. */
export const MIN_LEGIBLE_COL_PX = 34;

/** True when a cluster's columns would render narrower than the legible
 *  minimum and should collapse to an aggregate representation instead. */
export function shouldCollapseCluster(columnPx: number, totalColumns: number): boolean {
  return totalColumns > 1 && columnPx / totalColumns < MIN_LEGIBLE_COL_PX;
}

/**
 * Detect overlapping courses within a single day and assign each course a
 * column index inside its own overlap cluster.
 *
 * Events are grouped into clusters of transitively-overlapping intervals;
 * events that merely touch (end == start) or belong to different clusters
 * get their own column count. This fixes the previous behavior where the
 * whole day shared one lane total — a single morning overlap compressed
 * every unrelated event for the rest of the day into a sliver.
 *
 * Ordering is deterministic: start time, then end time, then course id.
 * Events without an end time overlap for `defaultDurationMinutes` (the
 * same visual span they render with).
 */
export function detectOverlaps(
  courses: Course[],
  defaultDurationMinutes = 0,
): OverlapSlot[] {
  if (courses.length === 0) return [];

  const endOf = (c: Course): number => {
    const start = toMinutes(c.startTime);
    const realEnd = c.endTime ? toMinutes(c.endTime) : start;
    // Blocks render floored at defaultDurationMinutes (MIN_EVENT_MINUTES);
    // the overlap math uses the same visual extent so two adjacent short
    // events whose rendered blocks would collide are clustered too.
    return Math.max(realEnd, start + defaultDurationMinutes);
  };

  const sorted = [...courses].sort(
    (a, b) =>
      toMinutes(a.startTime) - toMinutes(b.startTime) ||
      endOf(a) - endOf(b) ||
      a.id.localeCompare(b.id),
  );

  // Sweep into clusters: a new cluster starts when the event does not
  // overlap anything running — i.e. it starts at or after every lane's
  // end. Touching endpoints (end == start) do NOT overlap.
  const clusters: { events: Course[]; end: number }[] = [];
  for (const course of sorted) {
    const start = toMinutes(course.startTime);
    const end = endOf(course);
    const last = clusters[clusters.length - 1];
    if (last && start < last.end) {
      last.events.push(course);
      last.end = Math.max(last.end, end);
    } else {
      clusters.push({ events: [course], end });
    }
  }

  const slots: OverlapSlot[] = [];
  clusters.forEach((cluster, clusterId) => {
    // Greedy interval partitioning — minimum lanes = max concurrency.
    const lanes: number[] = [];
    const clusterStart = Math.min(...cluster.events.map((c) => toMinutes(c.startTime)));
    for (const course of cluster.events) {
      const start = toMinutes(course.startTime);
      const end = endOf(course);
      let lane = lanes.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(end);
      } else {
        lanes[lane] = end;
      }
      slots.push({
        courseId: course.id,
        columnIndex: lane,
        totalColumns: lanes.length,
        clusterId,
        clusterStartMin: clusterStart,
        clusterEndMin: cluster.end,
        clusterSize: cluster.events.length,
      });
    }
    // All cluster members share the cluster's own lane count.
    for (const slot of slots) {
      if (slot.clusterId === clusterId) slot.totalColumns = lanes.length;
    }
  });

  return slots;
}

// ── Relative time helper ──

/** Return a human-readable relative time string, e.g. "2h", "45m", "Yesterday". */
export function relativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.round(diffMs / 60_000);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;

  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export { DAYS };
