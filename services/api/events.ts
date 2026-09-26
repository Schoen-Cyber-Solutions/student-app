import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';

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
