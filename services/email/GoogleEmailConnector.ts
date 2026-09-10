import { EmailProviderConnector } from './EmailProviderConnector';

/**
 * Placeholder connector for Google Workspace / Gmail via Gmail API.
 *
 * Future integration steps:
 * 1. Authenticate via Google OAuth 2.0
 * 2. Acquire access token for Gmail API
 * 3. Call Gmail API endpoints:
 *    - GET /gmail/v1/users/me/messages
 *    - GET /gmail/v1/users/me/messages/{id}
 *    - POST /gmail/v1/users/me/messages/{id}/modify (labels: READ/UNREAD)
 * 4. Parse MIME payload into EmailMessage
 *
 * Do NOT implement real OAuth or store credentials here.
 */
export class GoogleEmailConnector implements EmailProviderConnector {
  async getInbox(): Promise<never[]> {
    throw new Error('GoogleEmailConnector.getInbox() is not yet implemented.');
  }

  async getMessage(): Promise<null> {
    throw new Error('GoogleEmailConnector.getMessage() is not yet implemented.');
  }

  async markAsRead(): Promise<void> {
    throw new Error('GoogleEmailConnector.markAsRead() is not yet implemented.');
  }

  async markAsUnread(): Promise<void> {
    throw new Error('GoogleEmailConnector.markAsUnread() is not yet implemented.');
  }
}
