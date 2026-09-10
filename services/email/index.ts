import { EmailMessage } from '@/types';
import { mockEmails } from '@/data/mockEmails';

export { EmailProviderConnector } from './EmailProviderConnector';
export { MicrosoftEmailConnector } from './MicrosoftEmailConnector';
export { GoogleEmailConnector } from './GoogleEmailConnector';

// ── Mock data-layer operations (backend-friendly async interface) ──

/** Return all inbox messages, newest first. */
export async function getInbox(): Promise<EmailMessage[]> {
  return [...mockEmails].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
}

/** Return a single message by id, or null if not found. */
export async function getMessage(id: string): Promise<EmailMessage | null> {
  return mockEmails.find((e) => e.id === id) ?? null;
}

/** Mark a message as read. */
export async function markAsRead(id: string): Promise<void> {
  const msg = mockEmails.find((e) => e.id === id);
  if (msg) msg.isRead = true;
}

/** Mark a message as unread. */
export async function markAsUnread(id: string): Promise<void> {
  const msg = mockEmails.find((e) => e.id === id);
  if (msg) msg.isRead = false;
}
