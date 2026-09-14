import { apiRequest } from './client';
import { EmailMessage } from '@/types';

interface ConnectResponse {
  url: string;
}

interface MessagesResponse {
  messages: EmailMessage[];
}

/**
 * GET /api/integrations/microsoft/connect
 *
 * Returns the Microsoft OAuth URL the client should open in a browser.
 */
export async function getMicrosoftConnectUrl(sessionToken: string): Promise<string> {
  const data = await apiRequest<ConnectResponse>('/api/integrations/microsoft/connect', { sessionToken });
  return data.url;
}

/**
 * GET /api/me/email/messages
 *
 * Returns the signed-in user's recent Outlook message metadata.
 * No message bodies, no Microsoft tokens, and no provider secrets are returned.
 */
export async function getMyEmailMessages(sessionToken: string): Promise<EmailMessage[]> {
  const data = await apiRequest<MessagesResponse>('/api/me/email/messages', { sessionToken });
  return data.messages ?? [];
}
