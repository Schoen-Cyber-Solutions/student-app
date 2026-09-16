import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';

export interface UserProfile {
  id: string;
  username: string;
  onboardingState: string;
  firstName: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  introCompleted: boolean;
  program: string | null;
  academicYear: string | null;
}

export interface MeResponse {
  user: UserProfile;
}

export interface ProfileSetupBody {
  username: string;
  firstName?: string | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  program?: string | null;
  academicYear?: string | null;
}

export interface UpdateProfileBody {
  firstName?: string | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  program?: string | null;
  academicYear?: string | null;
}

export interface CalendarStatusResponse {
  connected: boolean;
  provider: string | null;
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

export async function getMyUniversity(): Promise<{ name: string; domain: string }> {
  return apiRequest<{ name: string; domain: string }>('/api/me/university', { sessionToken: token() });
}

export async function setupProfile(body: ProfileSetupBody): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/me/profile/setup', {
    method: 'POST',
    sessionToken: token(),
    body,
  });
}

export async function updateProfile(body: UpdateProfileBody): Promise<MeResponse> {
  return apiRequest<MeResponse>('/api/me/profile', {
    method: 'PATCH',
    sessionToken: token(),
    body,
  });
}

export async function completeIntro(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/me/intro/complete', {
    method: 'POST',
    sessionToken: token(),
  });
}

export async function getCalendarStatus(): Promise<CalendarStatusResponse> {
  return apiRequest<CalendarStatusResponse>('/api/me/calendar/status', {
    sessionToken: token(),
  });
}

export async function connectCalendar(feedUrl: string, provider: string): Promise<ConnectCalendarResponse> {
  return apiRequest<ConnectCalendarResponse>('/api/me/calendar/connect', {
    method: 'POST',
    sessionToken: token(),
    body: { feedUrl, provider },
  });
}

export async function syncCalendar(): Promise<{ status: string; eventsSynced: number }> {
  return apiRequest<{ status: string; eventsSynced: number }>('/api/me/calendar/sync', {
    method: 'POST',
    sessionToken: token(),
  });
}

export async function skipCalendar(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/me/calendar/skip', {
    method: 'POST',
    sessionToken: token(),
  });
}

export async function getCourseColors(): Promise<{ courseCode: string; color: string }[]> {
  const data = await apiRequest<{ colors: { courseCode: string; color: string }[] }>('/api/me/course-colors', {
    sessionToken: token(),
  });
  return data.colors;
}

export async function setCourseColor(courseCode: string, color: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/me/course-colors', {
    method: 'POST',
    sessionToken: token(),
    body: { courseCode, color },
  });
}
