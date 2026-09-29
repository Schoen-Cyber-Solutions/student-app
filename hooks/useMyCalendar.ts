import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMyCalendar, MyCalendarEvent } from '@/services/api/calendar';
import { toApiError } from '@/services/api/client';
import { getSessionToken } from '@/services/auth/devSession';
import { onCalendarMutated } from '@/utils/calendarEvents';

export type MyCalendarStatus =
  | 'loading'
  | 'success'
  | 'unauthorized'
  | 'error'
  | 'empty';

export interface MyCalendarState {
  status: MyCalendarStatus;
  events: MyCalendarEvent[];
  /** User-initiated reload; shows the loading state. */
  retry: () => void;
  /** Silent reload; keeps current events/state on non-auth failures. Use after
   *  mutations (e.g. course assignment) where a spinner would flicker. */
  refresh: () => void;
}

export interface UseMyCalendarRange {
  /** ISO-8601 lower bound, inclusive. */
  from: string;
  /** ISO-8601 upper bound, inclusive. */
  to: string;
}

export interface UseMyCalendarOptions {
  /** Optional provider allowlist forwarded to the API (e.g.
   *  CALENDAR_VIEW_PROVIDERS for the visual Calendar tab). Pass a stable
   *  reference — it's part of the fetch identity. Omit for all providers. */
  providers?: readonly string[];
  /** Ranges to warm silently after a successful load — typically the
   *  adjacent pages' windows (previous/next week for Week/Day, previous/next
   *  month grid for Month) so pager navigation resolves from cache. */
  prefetchRanges?: readonly UseMyCalendarRange[];
}

// ── Module-level range cache ──────────────────────────────────────────────
// Keyed by effective request identity (from|to|providers). Serves the
// previous/current/next week windows instantly during pager navigation and
// revalidates silently in the background. Cleared wholesale on any calendar
// mutation so legitimate writes never serve stale data.
const rangeCache = new Map<string, MyCalendarEvent[]>();
// Identical in-flight requests are deduped — a prefetch for a range a screen
// is already fetching is free.
const inFlight = new Map<string, Promise<MyCalendarEvent[]>>();
const CACHE_LIMIT = 10;

function cacheKey(from: string, to: string, providers?: readonly string[]): string {
  return `${from}|${to}|${providers ? providers.join(',') : ''}`;
}

function remember(key: string, events: MyCalendarEvent[]): void {
  // Re-insert so the Map's insertion order approximates LRU.
  if (rangeCache.has(key)) rangeCache.delete(key);
  rangeCache.set(key, events);
  while (rangeCache.size > CACHE_LIMIT) {
    const oldest = rangeCache.keys().next().value;
    if (oldest === undefined) break;
    rangeCache.delete(oldest);
  }
}

async function fetchRange(
  token: string,
  from: string,
  to: string,
  providers?: readonly string[],
): Promise<MyCalendarEvent[]> {
  const key = cacheKey(from, to, providers);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = getMyCalendar(token, from, to, providers)
    .then((list) => {
      remember(key, list);
      return list;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

/** Drop every cached range — called when calendar data is mutated so the next
 *  read revalidates against the server instead of serving stale events. */
export function clearCalendarRangeCache(): void {
  rangeCache.clear();
}

/**
 * Loads the user's normalized calendar events for [from, to].
 *
 * Stale-while-revalidate: a cached range renders instantly and refreshes
 * silently; a range change while events are on screen never flips back to
 * 'loading' — the previous events stay visible until fresh data lands, so
 * week-pager navigation shows no spinner flash.
 *
 * Refetches silently whenever the calling screen regains focus so edits made
 * in another tab (e.g. a course assignment changed from Calendar) propagate.
 * A sequence number guards against stale responses: only the latest issued
 * request may update state — an older in-flight response is discarded
 * (it still warms the cache under its own key, which is harmless).
 */
export function useMyCalendar(
  range: UseMyCalendarRange,
  options?: UseMyCalendarOptions,
): MyCalendarState {
  const [status, setStatus] = useState<MyCalendarStatus>('loading');
  const [events, setEvents] = useState<MyCalendarEvent[]>([]);
  const mountedRef = useRef(true);
  const seqRef = useRef(0);
  const firstFocusRef = useRef(true);
  // Mirrors `events` for the fetch path — decides whether a "showLoading"
  // request may blank the screen (only when nothing is on it).
  const eventsRef = useRef<MyCalendarEvent[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchNow = useCallback(
    async (opts: { showLoading: boolean; keepStateOnError: boolean; reason: string }) => {
      const seq = ++seqRef.current;
      const key = cacheKey(range.from, range.to, options?.providers);
      const cached = rangeCache.get(key);
      if (cached) {
        // Serve instantly, then revalidate silently below.
        eventsRef.current = cached;
        setEvents(cached);
        setStatus(cached.length === 0 ? 'empty' : 'success');
      } else if (opts.showLoading && eventsRef.current.length === 0) {
        // Nothing on screen — this is a real first-load, show the spinner.
        setStatus('loading');
      }
      if (__DEV__) {
        console.debug(`[useMyCalendar] fetch seq=${seq} reason=${opts.reason} range=${range.from.slice(0, 10)}..${range.to.slice(0, 10)} cache=${cached ? 'hit' : 'miss'}`);
      }

      const token = getSessionToken();
      if (!token) {
        eventsRef.current = [];
        setEvents([]);
        setStatus('unauthorized');
        return;
      }

      try {
        const list = await fetchRange(token, range.from, range.to, options?.providers);
        if (__DEV__) console.debug(`[useMyCalendar] seq=${seq} -> ${list.length} events`);
        if (!mountedRef.current || seq !== seqRef.current) return;
        eventsRef.current = list;
        setEvents(list);
        setStatus(list.length === 0 ? 'empty' : 'success');

        // After settle, silently warm the adjacent page windows so the next
        // pager step resolves from cache. Errors are swallowed — a failed
        // prefetch must never surface.
        if (options?.prefetchRanges) {
          for (const r of options.prefetchRanges) {
            const pk = cacheKey(r.from, r.to, options?.providers);
            if (!rangeCache.has(pk) && !inFlight.has(pk)) {
              void fetchRange(token, r.from, r.to, options?.providers).catch(() => {});
            }
          }
        }
      } catch (err) {
        if (!mountedRef.current || seq !== seqRef.current) return;
        const apiErr = toApiError(err);
        // Log category and status only — never the token or response body.
        console.warn(
          `[useMyCalendar] request failed: ${apiErr.kind}${apiErr.status ? ` ${apiErr.status}` : ''}`,
        );
        // Silent background refreshes keep previously loaded data unless the
        // session itself is gone — an expired token must clear the screen.
        if (opts.keepStateOnError && apiErr.kind !== 'unauthorized') return;
        eventsRef.current = [];
        setEvents([]);
        setStatus(apiErr.kind === 'unauthorized' ? 'unauthorized' : 'error');
      }
    },
    [range.from, range.to, options?.providers, options?.prefetchRanges],
  );

  // Initial load and range changes.
  useEffect(() => {
    void fetchNow({ showLoading: true, keepStateOnError: false, reason: 'mount/range' });
  }, [fetchNow]);

  // Any completed calendar write (course assignment, personal event, feed
  // sync) clears the range cache then refetches every mounted consumer
  // silently — no dependence on focus timing, and no stale cache entries
  // can outlive a legitimate mutation.
  useEffect(() => {
    return onCalendarMutated(() => {
      clearCalendarRangeCache();
      void fetchNow({ showLoading: false, keepStateOnError: true, reason: 'mutation' });
    });
  }, [fetchNow]);

  // Silent revalidation on every subsequent focus (skip the initial focus,
  // which the mount effect already covers). Empty deps so the effect only
  // re-runs on real focus events, not when fetchNow's identity changes.
  const fetchRef = useRef(fetchNow);
  useEffect(() => {
    fetchRef.current = fetchNow;
  });
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      void fetchRef.current({ showLoading: false, keepStateOnError: true, reason: 'focus' });
    }, []),
  );

  const retry = useCallback(() => {
    void fetchNow({ showLoading: true, keepStateOnError: false, reason: 'retry' });
  }, [fetchNow]);

  const refresh = useCallback(() => {
    void fetchNow({ showLoading: false, keepStateOnError: true, reason: 'refresh' });
  }, [fetchNow]);

  return { status, events, retry, refresh };
}
