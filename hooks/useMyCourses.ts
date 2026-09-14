import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyCourseById, getMyCourses, MyCourse } from '@/services/api/courses';
import { toApiError } from '@/services/api/client';
import { getSessionToken } from '@/services/auth/devSession';

/**
 * UI-facing status for the course list. Every failure is collapsed to one of
 * three user-meaningful categories; technical detail stays in the console.
 */
export type MyCoursesStatus =
  | 'loading'
  | 'success'
  | 'unauthorized' // no session, or backend rejected it
  | 'error'; // network / server / unexpected

export interface MyCoursesState {
  status: MyCoursesStatus;
  courses: MyCourse[];
  /** Re-run the fetch. Safe to call from any state. */
  retry: () => void;
}

export function useMyCourses(): MyCoursesState {
  const [status, setStatus] = useState<MyCoursesStatus>('loading');
  const [courses, setCourses] = useState<MyCourse[]>([]);
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
      setCourses([]);
      setStatus('unauthorized');
      return;
    }

    getMyCourses(token)
      .then((list) => {
        if (cancelled || !mountedRef.current) return;
        setCourses(list);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        const apiErr = toApiError(err);
        // Log category + status only — never the token or response body.
        console.warn(`[useMyCourses] request failed: ${apiErr.kind}${apiErr.status ? ` ${apiErr.status}` : ''}`);
        setCourses([]);
        setStatus(apiErr.kind === 'unauthorized' ? 'unauthorized' : 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, courses, retry };
}

/**
 * Resolve a single course (name/code) for detail screens by internal id.
 * Returns undefined while loading, when unauthenticated, or when the user
 * has no access to that course — callers already render a fallback for that.
 */
export function useMyCourse(courseId: string | undefined): MyCourse | undefined {
  const [course, setCourse] = useState<MyCourse | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const token = getSessionToken();
    if (!token || !courseId) {
      setCourse(undefined);
      return;
    }

    getMyCourseById(token, courseId)
      .then((c) => {
        if (mounted) setCourse(c);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const apiErr = toApiError(err);
        console.warn(`[useMyCourse] request failed: ${apiErr.kind}${apiErr.status ? ` ${apiErr.status}` : ''}`);
        setCourse(undefined);
      });

    return () => {
      mounted = false;
    };
  }, [courseId]);

  return course;
}
