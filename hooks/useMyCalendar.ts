import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyCalendar, MyCalendarEvent } from '@/services/api/calendar';
import { toApiError } from '@/services/api/client';
import { getSessionToken } from '@/services/auth/devSession';

export type MyCalendarStatus =
  | 'loading'
  | 'success'
  | 'unauthorized'
  | 'error'
  | 'empty';

export interface MyCalendarState {
  status: MyCalendarStatus;
  events: MyCalendarEvent[];
  retry: () => void;
}

export interface UseMyCalendarRange {
  /** ISO-8601 lower bound, inclusive. */
  from: string;
  /** ISO-8601 upper bound, inclusive. */
  to: string;
}

export function useMyCalendar(range: UseMyCalendarRange): MyCalendarState {
  const [status, setStatus] = useState<MyCalendarStatus>('loading');
  const [events, setEvents] = useState<MyCalendarEvent[]>([]);
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    const token = getSessionToken();
    if (!token) {
      setEvents([]);
      setStatus('unauthorized');
      return;
    }

    getMyCalendar(token, range.from, range.to)
      .then((list) => {
        if (cancelled || !mountedRef.current) return;
        setEvents(list);
        setStatus(list.length === 0 ? 'empty' : 'success');
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        const apiErr = toApiError(err);
        // Log category and status only — never the token or response body.
        console.warn(`[useMyCalendar] request failed: ${apiErr.kind}${apiErr.status ? ` ${apiErr.status}` : ''}`);
        setEvents([]);
        setStatus(apiErr.kind === 'unauthorized' ? 'unauthorized' : 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, range.from, range.to]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, events, retry };
}
