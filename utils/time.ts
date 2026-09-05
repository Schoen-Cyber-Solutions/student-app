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

/** Build Mon–Fri dates starting from the given Monday. */
export function getWeekDayDates(monday: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/** Format a week label like "September 7–11, 2026" from Mon–Fri dates. */
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
    return `${startMonth} ${startDay}–${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/** Check whether two Date objects represent the same calendar day. */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

/** Return courses that occur on a specific weekday. */
export function getCoursesForDay(courses: Course[], day: Course['days'][number]): Course[] {
  return courses
    .filter((c) => c.days.includes(day))
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

interface OverlapSlot {
  courseId: string;
  columnIndex: number;
  totalColumns: number;
}

/**
 * Detect overlapping courses within a single day and assign each course
 * a column index. Returns the total number of columns needed and each
 * course's position.
 */
export function detectOverlaps(courses: Course[]): OverlapSlot[] {
  if (courses.length === 0) return [];

  const sorted = [...courses].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const slots: OverlapSlot[] = [];
  const lanes: { end: number }[] = [];

  for (const course of sorted) {
    const start = toMinutes(course.startTime);
    const end = toMinutes(course.endTime);

    let laneIndex = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].end <= start) {
        laneIndex = i;
        break;
      }
    }

    if (laneIndex === -1) {
      laneIndex = lanes.length;
      lanes.push({ end });
    } else {
      lanes[laneIndex].end = end;
    }

    slots.push({
      courseId: course.id,
      columnIndex: laneIndex,
      totalColumns: lanes.length,
    });
  }

  // Second pass: ensure all slots for this day share the same totalColumns
  const totalColumns = lanes.length;
  for (const slot of slots) {
    slot.totalColumns = totalColumns;
  }

  return slots;
}

export { DAYS };
