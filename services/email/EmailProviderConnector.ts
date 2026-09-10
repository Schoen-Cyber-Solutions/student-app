import { EmailMessage } from '@/types';

/**
 * Provider-independent email connector interface.
 * Implementations for Microsoft 365 and Google Workspace will plug in here.
 * The Email UI uses ONLY this interface — never provider-specific types.
 */
export interface EmailProviderConnector {
  getInbox(): Promise<EmailMessage[]>;
  getMessage(id: string): Promise<EmailMessage | null>;
  markAsRead(id: string): Promise<void>;
  markAsUnread(id: string): Promise<void>;
}
