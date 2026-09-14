import { apiRequest } from './client';

/**
 * Normalized calendar event from GET /api/me/calendar.
 * No external UIDs, no ICS feed URL, and no university identity data are included.
 */
export interface MyCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  courseCode: string | null;
  courseName: string | null;
}

interface MyCalendarResponse {
  events: unknown[];
}

function isMyCalendarEvent(value: unknown): value is MyCalendarEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    (v.description === null || typeof v.description === 'string') &&
    (v.location === null || typeof v.location === 'string') &&
    typeof v.startAt === 'string' &&
    (v.endAt === null || typeof v.endAt === 'string') &&
    typeof v.allDay === 'boolean' &&
    (v.courseCode === null || typeof v.courseCode === 'string') &&
    (v.courseName === null || typeof v.courseName === 'string')
  );
}

/**
 * GET /api/me/calendar
 *
 * Returns the authenticated user's normalized calendar events. The user is
 * identified by the session token only; no userId is sent.
 */
export async function getMyCalendar(
  sessionToken: string,
  from?: string,
  to?: string,
): Promise<MyCalendarEvent[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString() ? `?${params.toString()}` : '';

  const data = await apiRequest<MyCalendarResponse>(`/api/me/calendar${query}`, { sessionToken });

  if (!data || !Array.isArray(data.events) || !data.events.every(isMyCalendarEvent)) {
    throw new Error('Unexpected calendar response shape');
  }

  // Copy only the known fields — nothing extra leaks into app state.
  return data.events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    courseCode: event.courseCode,
    courseName: event.courseName,
  }));
}
