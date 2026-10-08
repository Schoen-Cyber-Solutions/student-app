import { useEffect, useSyncExternalStore } from 'react';
import {
  CalendarRange,
  DEFAULT_CALENDAR_RANGE,
  getCalendarRange,
  registerCalendarRangeWriteListener,
} from './calendarRange';

/**
 * In-memory mirror of the persisted calendar range — same pattern as
 * ./tabAppearanceStore. Writes land here via the listener so mounted Day
 * and Week views re-render immediately without polling SecureStore.
 */

let cache: CalendarRange = DEFAULT_CALENDAR_RANGE;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

registerCalendarRangeWriteListener((next) => {
  cache = next;
  notify();
});

/** Pulls the persisted range into the runtime cache. Safe to call on focus. */
export async function refreshCalendarRange(): Promise<void> {
  const stored = await getCalendarRange();
  if (stored.startMin !== cache.startMin || stored.endMin !== cache.endMin) {
    cache = stored;
    notify();
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useCalendarRange(): CalendarRange {
  const range = useSyncExternalStore(subscribe, () => cache);
  // First mount anywhere triggers the cold-start load from SecureStore.
  useEffect(() => {
    void refreshCalendarRange();
  }, []);
  return range;
}
