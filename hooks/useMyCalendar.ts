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

/**
 * Loads the user's normalized calendar events for [from, to].
 *
 * Refetches silently whenever the calling screen regains focus so edits made
 * in another tab (e.g. a course assignment changed from Calendar) propagate.
 * A sequence number guards against stale responses: only the latest issued
 * request may update state — an older in-flight response is discarded.
 */
export function useMyCalendar(range: UseMyCalendarRange): MyCalendarState {
  const [status, setStatus] = useState<MyCalendarStatus>('loading');
  const [events, setEvents] = useState<MyCalendarEvent[]>([]);
  const mountedRef = useRef(true);
  const seqRef = useRef(0);
  const firstFocusRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchNow = useCallback(
    async (opts: { showLoading: boolean; keepStateOnError: boolean; reason: string }) => {
      const seq = ++seqRef.current;
      if (opts.showLoading) setStatus('loading');
      if (__DEV__) {
        console.debug(`[useMyCalendar] fetch seq=${seq} reason=${opts.reason} range=${range.from.slice(0, 10)}..${range.to.slice(0, 10)}`);
      }

      const token = getSessionToken();
      if (!token) {
        setEvents([]);
        setStatus('unauthorized');
        return;
      }

      try {
        const list = await getMyCalendar(token, range.from, range.to);
        if (__DEV__) console.debug(`[useMyCalendar] seq=${seq} -> ${list.length} events`);
        if (!mountedRef.current || seq !== seqRef.current) return;
        setEvents(list);
        setStatus(list.length === 0 ? 'empty' : 'success');
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
        setEvents([]);
        setStatus(apiErr.kind === 'unauthorized' ? 'unauthorized' : 'error');
      }
    },
    [range.from, range.to],
  );

  // Initial load and range changes.
  useEffect(() => {
    void fetchNow({ showLoading: true, keepStateOnError: false, reason: 'mount/range' });
  }, [fetchNow]);

  // Any completed calendar write (course assignment, personal event, feed
  // sync) refetches every mounted consumer immediately — no dependence on
  // focus timing, so a PATCH in flight during a tab switch can't strand
  // stale data.
  useEffect(() => {
    return onCalendarMutated(() => {
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
