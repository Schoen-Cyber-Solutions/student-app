/**
 * Tiny mutation notification for calendar-event writes.
 *
 * When any screen mutates calendar data (course assignment, personal event
 * CRUD, feed re-sync), every mounted consumer refetches — so switching tabs
 * can never display pre-mutation state, even if a focus-driven fetch landed
 * while the write was still in flight.
 *
 * Not a cache: screens still own their data; this just signals "refetch".
 */
const listeners = new Set<() => void>();

export function onCalendarMutated(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyCalendarMutated(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A broken listener must not break the mutation flow.
    }
  }
}
