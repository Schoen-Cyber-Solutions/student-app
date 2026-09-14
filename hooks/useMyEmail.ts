import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyEmailMessages } from '@/services/api/email';
import { toApiError } from '@/services/api/client';
import { getSessionToken } from '@/services/auth/devSession';
import { EmailMessage } from '@/types';

export type EmailStatus =
  | 'loading'
  | 'success'
  | 'empty'
  | 'unauthorized'
  | 'not_connected'
  | 'consent_required'
  | 'error';

export interface MyEmailState {
  status: EmailStatus;
  messages: EmailMessage[];
  retry: () => void;
}

export function useMyEmail(): MyEmailState {
  const [status, setStatus] = useState<EmailStatus>('loading');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
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
      setMessages([]);
      setStatus('unauthorized');
      return;
    }

    getMyEmailMessages(token)
      .then((list) => {
        if (cancelled || !mountedRef.current) return;
        setMessages(list);
        setStatus(list.length === 0 ? 'empty' : 'success');
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        const apiErr = toApiError(err);
        // Log only the category and status; never the token or response body.
        console.warn(`[useMyEmail] request failed: ${apiErr.kind}${apiErr.status ? ` ${apiErr.status}` : ''}`);

        if (apiErr.kind === 'unauthorized') {
          setMessages([]);
          setStatus('unauthorized');
        } else if (apiErr.kind === 'not_found') {
          setMessages([]);
          setStatus('not_connected');
        } else if (apiErr.kind === 'client' && (apiErr.body as { requiresAdmin?: boolean } | undefined)?.requiresAdmin) {
          setMessages([]);
          setStatus('consent_required');
        } else {
          setMessages([]);
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, messages, retry };
}
