import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';

export interface MeResponse {
  user: {
    id: string;
    username: string;
    onboardingState: string;
  };
}

export interface UpdateUsernameResponse {
  user: {
    id: string;
    username: string;
    onboardingState: string;
  };
}

export interface CalendarStatusResponse {
  connected: boolean;
  provider: string;
  lastSyncedAt: string | null;
  eventCount: number;
}

export interface ConnectCalendarResponse {
  status: string;
  eventsSynced: number;
}

function token(): string | undefined {
  return getSessionToken() ?? undefined;
}

export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/me', { sessionToken: token() });
}

export async function updateUsername(username: string): Promise<UpdateUsernameResponse> {
  return apiRequest<UpdateUsernameResponse>('/api/me/username', {
    method: 'POST',
    sessionToken: token(),
    body: { username },
  });
}

export async function getCalendarStatus(): Promise<CalendarStatusResponse> {
  return apiRequest<CalendarStatusResponse>('/api/me/calendar/status', {
    sessionToken: token(),
  });
}

export async function connectCalendar(feedUrl: string): Promise<ConnectCalendarResponse> {
  return apiRequest<ConnectCalendarResponse>('/api/me/calendar/connect', {
    method: 'POST',
    sessionToken: token(),
    body: { feedUrl },
  });
}

export async function skipCalendar(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/me/calendar/skip', {
    method: 'POST',
    sessionToken: token(),
  });
}
