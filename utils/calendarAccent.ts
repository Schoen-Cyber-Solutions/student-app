/**
 * Compatibility layer — the Calendar accent is the 'calendar' slice of the
 * shared per-tab accent store in ./tabAccent.
 */
import { setTabAccentRuntime, useTabAccent } from './tabAccent';

export function setCalendarAccentRuntime(hex: string): void {
  setTabAccentRuntime('calendar', hex);
}

export function useCalendarAccent(): string {
  return useTabAccent('calendar');
}
