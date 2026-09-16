import { apiRequest } from './client';
import { getSessionToken } from '../auth/devSession';

/**
 * Course community data as returned by the backend. Public identity is the
 * username only — no university email, names, or LMS identifiers appear here.
 */
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
  courseId: string;
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

export async function getCourseThreads(courseId: string): Promise<CommunityThread[]> {
  const data = await apiRequest<{ threads: CommunityThread[] }>(
    `/api/me/courses/${courseId}/threads`,
    { sessionToken: token() },
  );
  return data.threads;
}

export async function createCourseThread(
  courseId: string,
  title: string,
  message: string,
): Promise<CommunityThread> {
  const data = await apiRequest<{ thread: CommunityThread }>(
    `/api/me/courses/${courseId}/threads`,
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
