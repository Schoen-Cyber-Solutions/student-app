import { EmailProviderConnector } from './EmailProviderConnector';

/**
 * Placeholder connector for Microsoft 365 / Outlook via Microsoft Graph.
 *
 * Future integration steps:
 * 1. Authenticate via Microsoft Identity Platform (MSAL / OAuth 2.0)
 * 2. Acquire access token for Microsoft Graph
 * 3. Call Graph API endpoints:
 *    - GET /me/messages
 *    - GET /me/messages/{id}
 *    - PATCH /me/messages/{id}  (isRead)
 * 4. Normalize Graph API response fields into EmailMessage
 *
 * Do NOT implement real OAuth or store credentials here.
 */
export class MicrosoftEmailConnector implements EmailProviderConnector {
  async getInbox(): Promise<never[]> {
    throw new Error('MicrosoftEmailConnector.getInbox() is not yet implemented.');
  }

  async getMessage(): Promise<null> {
    throw new Error('MicrosoftEmailConnector.getMessage() is not yet implemented.');
  }

  async markAsRead(): Promise<void> {
    throw new Error('MicrosoftEmailConnector.markAsRead() is not yet implemented.');
  }

  async markAsUnread(): Promise<void> {
    throw new Error('MicrosoftEmailConnector.markAsUnread() is not yet implemented.');
  }
}
