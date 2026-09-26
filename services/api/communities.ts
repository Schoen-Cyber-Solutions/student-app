import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';

/**
 * Community data as returned by the backend. Public identity is the username
 * only — no university email, names, or LMS identifiers appear here.
 *
 * Communities are addressed by typed ids: "uni:{universityId}" for the
 * university-wide community and "sec:{courseSectionId}" for a section
 * community. Authorization is always resolved server-side.
 */
export interface Community {
  id: string;
  type: 'university' | 'section';
  name: string;
  subtitle: string;
  courseCode?: string;
}

export interface CommunityThread {
  id: string;
  title: string;
  createdAt: string;
  authorUsername: string;
  messageCount: number;
  isAuthor: boolean;
}

export interface ThreadDetail {
  id: string;
  communityId: string;
  title: string;
  createdAt: string;
  authorUsername: string;
  isAuthor: boolean;
}

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  authorUsername: string;
  isAuthor: boolean;
}

function token(): string | undefined {
  return getSessionToken() ?? undefined;
}

// ── In-memory community cache ──────────────────────────────────────────────
// Lets detail screens resolve a community by id without a second request when
// the list was just loaded. Memory only; nothing is persisted.
let lastFetchedCommunities: Community[] | null = null;

export async function getMyCommunities(): Promise<Community[]> {
  const data = await apiRequest<{ communities: Community[] }>('/api/me/communities', {
    sessionToken: token(),
  });
  lastFetchedCommunities = data.communities;
  return data.communities;
}

export async function getMyCommunityById(communityId: string): Promise<Community | undefined> {
  const cached = lastFetchedCommunities?.find((c) => c.id === communityId);
  if (cached) return cached;
  const fresh = await getMyCommunities();
  return fresh.find((c) => c.id === communityId);
}

export async function getCommunityThreads(communityId: string): Promise<CommunityThread[]> {
  const data = await apiRequest<{ threads: CommunityThread[] }>(
    `/api/me/communities/${encodeURIComponent(communityId)}/threads`,
    { sessionToken: token() },
  );
  return data.threads;
}

export async function createCommunityThread(
  communityId: string,
  title: string,
  message: string,
): Promise<CommunityThread> {
  const data = await apiRequest<{ thread: CommunityThread }>(
    `/api/me/communities/${encodeURIComponent(communityId)}/threads`,
    { method: 'POST', sessionToken: token(), body: { title, message } },
  );
  return data.thread;
}

export async function getThread(
  threadId: string,
): Promise<{ thread: ThreadDetail; messages: ThreadMessage[] }> {
  return apiRequest<{ thread: ThreadDetail; messages: ThreadMessage[] }>(
    `/api/me/threads/${threadId}`,
    { sessionToken: token() },
  );
}

export async function postThreadMessage(
  threadId: string,
  body: string,
): Promise<ThreadMessage> {
  const data = await apiRequest<{ message: ThreadMessage }>(
    `/api/me/threads/${threadId}/messages`,
    { method: 'POST', sessionToken: token(), body: { body } },
  );
  return data.message;
}

export async function deleteThread(threadId: string): Promise<void> {
  await apiRequest(`/api/me/threads/${threadId}`, {
    method: 'DELETE',
    sessionToken: token(),
  });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await apiRequest(`/api/me/messages/${messageId}`, {
    method: 'DELETE',
    sessionToken: token(),
  });
}
