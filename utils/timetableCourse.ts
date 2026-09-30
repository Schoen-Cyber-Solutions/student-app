import { Course } from '@/types';
import { MyCalendarEvent } from '@/services/api/calendar';
import { formatTime12, formatWeekdayShort } from '@/utils/time';
import { colorForKey, getCourseColor, COMPLETED_EVENT_COLOR } from '@/utils/courseLabel';

/**
 * The single mapping every Calendar view uses: MyCalendarEvent → Course.
 * Day and Week filter the result by exact `startAt` date (via
 * getCoursesForDay), Month reads the raw event — personal events therefore
 * render identically across views with no per-view copies.
 */
export function eventColor(
  event: MyCalendarEvent,
  courseColors: Record<string, string>,
  colorMap?: Record<string, string>,
): string | undefined {
  // Completed LMS items render neutral gray everywhere — display override only,
  // the saved course color is never modified.
  if (event.isCompleted) return COMPLETED_EVENT_COLOR;
  if (event.provider === 'personal' || event.provider === 'laker_connect') {
    return event.color ?? colorForKey(event.title);
  }
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

export function toTimetableCourse(
  event: MyCalendarEvent,
  courseColors: Record<string, string>,
  colorMap?: Record<string, string>,
): Course {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const isZeroDuration = !end || end.getTime() <= start.getTime();

  return {
    id: event.id,
    name: event.title,
    code: event.courseCode ?? event.courseName ?? '',
    location: event.location ?? '',
    startTime: formatTime12(start),
    endTime: isZeroDuration ? '' : formatTime12(end),
    days: [formatWeekdayShort(start) as Course['days'][number]],
    instructor: '',
    instructorEmail: '',
    color: eventColor(event, courseColors, colorMap),
    date: start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    startAt: event.startAt,
    description: event.description ?? undefined,
    completed: event.isCompleted ?? false,
    isPersonal: event.provider === 'personal',
    isCampusEvent: event.provider === 'laker_connect',
  };
}
