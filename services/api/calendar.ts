import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';
import { notifyCalendarMutated } from '@/utils/calendarEvents';

/**
 * Normalized calendar event from GET /api/me/calendar.
 * No external UIDs, no ICS feed URL, and no university identity data are included.
 */
export interface MyCalendarEvent {
  id: string;
  provider: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  courseCode: string | null;
  courseName: string | null;
  color: string | null;
  /** Enrolled section this event is mapped to (auto-detected or manually
   *  assigned by the user). Null when unassigned. */
  courseSectionId?: string | null;
  courseSectionCode?: string | null;
  /** Where the section association came from: 'auto' = feed-detected,
   *  'manual' = user-picked, 'recurring_rule' = confirmed weekly-series rule,
   *  'unassigned' = user explicitly chose Unassigned (suppresses
   *  auto-detection), null = no association. */
  courseSectionSource?: 'auto' | 'manual' | 'recurring_rule' | 'unassigned' | null;
  /** Providers whose copies of this event are hidden as duplicates
   *  (e.g. "blackboard" when the LMS feed also carries this class meeting). */
  mergedProviders?: string[];
  /** Personal completion flag — persisted server-side; only meaningful on
   *  imported LMS events. */
  isCompleted?: boolean;
}

interface MyCalendarResponse {
  events: unknown[];
}

function isMyCalendarEvent(value: unknown): value is MyCalendarEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.provider === 'string' &&
    typeof v.title === 'string' &&
    (v.description === null || typeof v.description === 'string') &&
    (v.location === null || typeof v.location === 'string') &&
    typeof v.startAt === 'string' &&
    (v.endAt === null || typeof v.endAt === 'string') &&
    typeof v.allDay === 'boolean' &&
    (v.courseCode === null || typeof v.courseCode === 'string') &&
    (v.courseName === null || typeof v.courseName === 'string') &&
    (v.color === null || typeof v.color === 'string') &&
    (v.courseSectionId === undefined || v.courseSectionId === null || typeof v.courseSectionId === 'string') &&
    (v.courseSectionCode === undefined || v.courseSectionCode === null || typeof v.courseSectionCode === 'string') &&
    (v.courseSectionSource === undefined ||
      v.courseSectionSource === null ||
      v.courseSectionSource === 'auto' ||
      v.courseSectionSource === 'manual' ||
      v.courseSectionSource === 'recurring_rule' ||
      v.courseSectionSource === 'unassigned') &&
    (v.mergedProviders === undefined ||
      (Array.isArray(v.mergedProviders) && v.mergedProviders.every((p) => typeof p === 'string'))) &&
    (v.isCompleted === undefined || typeof v.isCompleted === 'boolean')
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
    provider: event.provider,
    title: event.title,
    description: event.description,
    location: event.location,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    courseCode: event.courseCode,
    courseName: event.courseName,
    color: event.color,
    courseSectionId: event.courseSectionId ?? null,
    courseSectionCode: event.courseSectionCode ?? null,
    courseSectionSource: event.courseSectionSource ?? null,
    mergedProviders: event.mergedProviders ?? [],
    isCompleted: event.isCompleted ?? false,
  }));
}

export interface PersonalEventInput {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  color?: string;
}

export interface PersonalCalendarEvent {
  id: string;
  provider: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  color: string | null;
}

function token(): string | undefined {
  return getSessionToken() ?? undefined;
}

export async function createPersonalEvent(input: PersonalEventInput): Promise<PersonalCalendarEvent> {
  const data = await apiRequest<{ event: PersonalCalendarEvent }>('/api/me/calendar/events', {
    method: 'POST',
    sessionToken: token(),
    body: input,
  });
  notifyCalendarMutated();
  return data.event;
}

export async function updatePersonalEvent(id: string, input: PersonalEventInput): Promise<PersonalCalendarEvent> {
  const data = await apiRequest<{ event: PersonalCalendarEvent }>(`/api/me/calendar/events/${id}`, {
    method: 'PATCH',
    sessionToken: token(),
    body: input,
  });
  notifyCalendarMutated();
  return data.event;
}

export async function deletePersonalEvent(id: string): Promise<void> {
  await apiRequest<{ status: string }>(`/api/me/calendar/events/${id}`, {
    method: 'DELETE',
    sessionToken: token(),
  });
  notifyCalendarMutated();
}

/** Providers whose imported events the user may course-assign. */
export const ASSIGNABLE_PROVIDERS = new Set(['blackboard', 'canvas']);

export function isAssignableEvent(event: MyCalendarEvent): boolean {
  return ASSIGNABLE_PROVIDERS.has(event.provider);
}

/** Imported LMS events are the only ones the user can mark complete — personal,
 *  official class meetings, and academic-calendar events are excluded. */
export function isCompletableEvent(event: MyCalendarEvent): boolean {
  return ASSIGNABLE_PROVIDERS.has(event.provider);
}

/**
 * Set or clear the personal completion flag on one of the user's own imported
 * LMS events. Personal task-tracking only — nothing is written back to the LMS.
 */
export async function setEventCompletion(
  eventId: string,
  isCompleted: boolean,
): Promise<{ id: string; isCompleted: boolean }> {
  const data = await apiRequest<{ event: { id: string; isCompleted: boolean } }>(
    `/api/me/calendar/events/${eventId}/completion`,
    {
      method: 'PATCH',
      sessionToken: token(),
      body: { isCompleted },
    },
  );
  notifyCalendarMutated();
  return data.event;
}

export type CourseSectionSource = 'auto' | 'manual' | 'recurring_rule' | 'unassigned';

/** Preview of a weekly series the assignment anchors — the client offers
 *  "apply to all matching" when this is present. */
export interface RecurringPreview {
  matchCount: number;
  sampleStartAts: string[];
}

export interface AssignEventCourseResult {
  id: string;
  courseSectionId: string | null;
  courseSectionSource: CourseSectionSource;
  /** Other same-series events that would follow the new assignment. */
  recurring: RecurringPreview | null;
}

/**
 * Manually assign an imported (LMS) event to one of the user's enrolled
 * course sections — for feed items with no reliable course identifier.
 * Pass null for an explicit "Unassigned" choice, which also suppresses any
 * feed-detected association.
 */
export async function assignEventCourse(
  eventId: string,
  courseSectionId: string | null,
): Promise<AssignEventCourseResult> {
  const data = await apiRequest<{
    event: { id: string; courseSectionId: string | null; courseSectionSource: CourseSectionSource };
    recurring?: RecurringPreview | null;
  }>(`/api/me/calendar/events/${eventId}/course`, {
    method: 'PATCH',
    sessionToken: token(),
    body: { courseSectionId },
  });
  if (__DEV__) {
    // Diagnostic trace: id + section ids only — no event content.
    console.debug(
      `[calendar] PATCH course event=${eventId.slice(0, 8)} -> section=${String(data.event.courseSectionId).slice(0, 8)} source=${data.event.courseSectionSource} recurring=${data.recurring?.matchCount ?? 0}`,
    );
  }
  notifyCalendarMutated();
  return { ...data.event, recurring: data.recurring ?? null };
}

/**
 * Confirm "apply to all matching": creates the recurring rule and backfills
 * every other event in the series that has no stronger user intent.
 */
export async function applyRecurringAssignmentRule(
  eventId: string,
  courseSectionId: string,
): Promise<{ ruleId: string; assignedCount: number }> {
  const data = await apiRequest<{ rule: { id: string }; assignedCount: number }>(
    '/api/me/calendar/recurring-rules',
    {
      method: 'POST',
      sessionToken: token(),
      body: { eventId, courseSectionId },
    },
  );
  notifyCalendarMutated();
  return { ruleId: data.rule.id, assignedCount: data.assignedCount };
}

/**
 * Clear a manual course override so the feed-detected association (if any)
 * applies again.
 */
export async function clearEventCourseOverride(
  eventId: string,
): Promise<{ id: string; courseSectionId: string | null; courseSectionSource: CourseSectionSource }> {
  const data = await apiRequest<{
    event: { id: string; courseSectionId: string | null; courseSectionSource: CourseSectionSource };
  }>(`/api/me/calendar/events/${eventId}/course`, {
    method: 'PATCH',
    sessionToken: token(),
    body: { clearOverride: true },
  });
  notifyCalendarMutated();
  return data.event;
}
