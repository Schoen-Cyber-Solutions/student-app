import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';
import { notifyCalendarMutated } from '@/utils/calendarEvents';

/** Public campus event imported from the university's official source
 *  (e.g. Laker Connect). Read-only — RSVP happens on the source site. */
export interface CampusEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  timezone: string;
  location: string | null;
  organization: string | null;
  category: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  rsvpUrl: string | null;
  isCancelled: boolean;
  /** Id of the user's saved calendar copy (provider 'laker_connect'), or
   *  null when the event hasn't been added to Calendar. */
  savedEventId: string | null;
}

export interface CampusEventsSource {
  providerName: string;
  directoryUrl: string;
  lastSyncedAt: string | null;
  /** True when the latest refresh failed — events shown may be stale. */
  degraded: boolean;
}

export interface CampusEventsResponse {
  university: { name: string };
  source: CampusEventsSource | null;
  events: CampusEvent[];
}

function token(): string | undefined {
  return getSessionToken() ?? undefined;
}

export async function getCampusEvents(filters?: {
  category?: string;
  q?: string;
}): Promise<CampusEventsResponse> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.q) params.set('q', filters.q);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<CampusEventsResponse>(`/api/me/events${query}`, { sessionToken: token() });
}

export async function getCampusEvent(id: string): Promise<CampusEvent> {
  const data = await apiRequest<{ event: CampusEvent }>(`/api/me/events/${id}`, {
    sessionToken: token(),
  });
  return data.event;
}

/**
 * Save a campus event into the user's own Calendar (creates a
 * provider='laker_connect' copy server-side). Idempotent — returns the
 * saved row's id whether newly created or already present.
 */
export async function saveCampusEventToCalendar(id: string): Promise<string> {
  const data = await apiRequest<{ savedEventId: string }>(
    `/api/me/events/${encodeURIComponent(id)}/save`,
    { method: 'POST', sessionToken: token() },
  );
  notifyCalendarMutated();
  return data.savedEventId;
}

/** Remove the user's saved calendar copy. The discovery event itself is
 *  unaffected; safe to call when nothing is saved. */
export async function removeCampusEventFromCalendar(id: string): Promise<void> {
  await apiRequest<{ status: string }>(
    `/api/me/events/${encodeURIComponent(id)}/save`,
    { method: 'DELETE', sessionToken: token() },
  );
  notifyCalendarMutated();
}
