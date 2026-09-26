import { useCallback, useEffect, useRef, useState } from 'react';
import { Community, getMyCommunities, getMyCommunityById } from '@/services/api/communities';
import { toApiError } from '@/services/api/client';
import { getSessionToken } from '@/services/auth/devSession';

/**
 * UI-facing status for the community list. Every failure is collapsed to one
 * of three user-meaningful categories; technical detail stays in the console.
 */
export type MyCommunitiesStatus =
  | 'loading'
  | 'success'
  | 'unauthorized'
  | 'error';

export interface MyCommunitiesState {
  status: MyCommunitiesStatus;
  communities: Community[];
  retry: () => void;
}

export function useMyCommunities(): MyCommunitiesState {
  const [status, setStatus] = useState<MyCommunitiesStatus>('loading');
  const [communities, setCommunities] = useState<Community[]>([]);
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
    setStatus((prev) => (prev === 'success' ? prev : 'loading'));

    const token = getSessionToken();
    if (!token) {
      setCommunities([]);
      setStatus('unauthorized');
      return;
    }

    getMyCommunities()
      .then((list) => {
        if (cancelled || !mountedRef.current) return;
        setCommunities(list);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        const apiErr = toApiError(err);
        console.warn(`[useMyCommunities] request failed: ${apiErr.kind}${apiErr.status ? ` ${apiErr.status}` : ''}`);
        setCommunities([]);
        setStatus(apiErr.kind === 'unauthorized' ? 'unauthorized' : 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, communities, retry };
}

/**
 * Resolve a single community (name/subtitle) for detail screens by id.
 * Returns undefined while loading or when the user has no access — callers
 * already render a fallback for that.
 */
export function useMyCommunity(communityId: string | undefined): Community | undefined {
  const [community, setCommunity] = useState<Community | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    if (!getSessionToken() || !communityId) {
      setCommunity(undefined);
      return;
    }

    getMyCommunityById(communityId)
      .then((c) => {
        if (mounted) setCommunity(c);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const apiErr = toApiError(err);
        console.warn(`[useMyCommunity] request failed: ${apiErr.kind}${apiErr.status ? ` ${apiErr.status}` : ''}`);
        setCommunity(undefined);
      });

    return () => {
      mounted = false;
    };
  }, [communityId]);

  return community;
}
