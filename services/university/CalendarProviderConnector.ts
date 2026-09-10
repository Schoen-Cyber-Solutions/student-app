import { CalendarEvent, ExternalReference } from '@/types';

/**
 * Provider-independent calendar connector interface.
 * Implementations for university calendar systems, Microsoft Outlook, Google Calendar,
 * or ICS feeds will plug in here.
 * The Calendar UI uses ONLY normalized CalendarEvent types.
 *
 * Future integration steps (per provider):
 * 1. Authenticate or subscribe to the university calendar feed
 * 2. Fetch events for the current academic term
 * 3. Parse provider-specific formats (iCal, Graph API, etc.) into CalendarEvent
 * 4. Store locally with minimal retention; refresh periodically rather than mirroring permanently.
 */
export interface CalendarProviderConnector {
  getEvents(startDate: string, endDate: string): Promise<CalendarEvent[]>;
  /** Return provider-specific IDs for sync. The UI never uses these directly. */
  getExternalRefs(eventId: string): Promise<ExternalReference[]>;
}
