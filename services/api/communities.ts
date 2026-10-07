import { apiRequest, apiUpload } from './client';
import { API_BASE_URL } from '@/constants/Api';
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
  courseName?: string;
  courseCode?: string;
}

/** Display title for headers: section communities show the course name
 *  ("Cybersecurity & Information Assurance"), not the code ("CSIA 301-01");
 *  university communities keep their name. */
export function communityDisplayName(c: Community): string {
  return c.type === 'section' ? c.courseName ?? c.name : c.name;
}

export interface CommunityThread {
  id: string;
  title: string;
  createdAt: string;
  /** Author's user id — needed for report/block actions on their content. */
  authorId: string;
  authorUsername: string;
  messageCount: number;
  isAuthor: boolean;
}

export interface ThreadDetail {
  id: string;
  communityId: string;
  title: string;
  createdAt: string;
  authorId: string;
  authorUsername: string;
  isAuthor: boolean;
}

/** An image attached to a thread post or reply. `url` is auth-gated. */
export interface MessageAttachment {
  id: string;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorUsername: string;
  isAuthor: boolean;
  attachment?: MessageAttachment | null;
}

/** A chat search hit: a thread title/opening-post match or a reply match. */
export interface ChatSearchResult {
  type: 'thread' | 'reply';
  threadId: string;
  communityId: string;
  communityName: string;
  threadTitle: string;
  snippet: string;
  authorUsername: string;
  createdAt: string;
}

/** Local image picked + compressed on-device, ready for upload. */
export interface ChatImageDraft {
  uri: string;
  width: number;
  height: number;
}

/**
 * Image source for <Image> — attachment URLs require the session bearer token,
 * so callers must pass `headers` through to the image component.
 */
export function chatAttachmentSource(attachment: MessageAttachment): { uri: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  return { uri: `${API_BASE_URL}${attachment.url}`, headers };
}

function token(): string | undefined {
  return getSessionToken() ?? undefined;
}

// ── In-memory community cache ──────────────────────────────────────────────
// Lets detail screens resolve a community by id without a second request when
// the list was just loaded. Memory only; nothing is persisted.
let lastFetchedCommunities: Community[] | null = null;

/** Drop the in-memory community cache — used on logout/account deletion. */
export function clearCommunityCache(): void {
  lastFetchedCommunities = null;
}

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
  image?: ChatImageDraft | null,
): Promise<CommunityThread> {
  if (image) {
    const data = await apiUpload<{ thread: CommunityThread }>(
      `/api/me/communities/${encodeURIComponent(communityId)}/threads`,
      {
        sessionToken: token(),
        fields: { title, message },
        file: { uri: image.uri, name: 'image.jpg', type: 'image/jpeg' },
      },
    );
    return data.thread;
  }
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
  image?: ChatImageDraft | null,
): Promise<ThreadMessage> {
  if (image) {
    const data = await apiUpload<{ message: ThreadMessage }>(
      `/api/me/threads/${threadId}/messages`,
      {
        sessionToken: token(),
        fields: { body },
        file: { uri: image.uri, name: 'image.jpg', type: 'image/jpeg' },
      },
    );
    return data.message;
  }
  const data = await apiRequest<{ message: ThreadMessage }>(
    `/api/me/threads/${threadId}/messages`,
    { method: 'POST', sessionToken: token(), body: { body } },
  );
  return data.message;
}

/**
 * Search threads and replies across the caller's accessible communities.
 * Pass communityId to scope to one community; omit for a global Chat search.
 */
export async function searchChat(
  query: string,
  options: { communityId?: string; type?: 'all' | 'threads' | 'replies'; limit?: number } = {},
): Promise<ChatSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (options.communityId) params.set('communityId', options.communityId);
  if (options.type && options.type !== 'all') params.set('type', options.type);
  if (options.limit) params.set('limit', String(options.limit));
  const data = await apiRequest<{ results: ChatSearchResult[] }>(
    `/api/me/chat/search?${params.toString()}`,
    { sessionToken: token() },
  );
  return data.results;
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
