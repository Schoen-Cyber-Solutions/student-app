import { useEffect, useState } from 'react';
import { ChatSearchResult, searchChat } from '@/services/api/communities';

export type ChatSearchType = 'all' | 'threads' | 'replies';

const DEBOUNCE_MS = 300;
export const CHAT_SEARCH_MIN_LENGTH = 2;

/**
 * Debounced chat search. Fires one request per pause in typing; queries below
 * the minimum length return an empty result set without hitting the network.
 */
export function useChatSearch(options: { communityId?: string } = {}) {
  const { communityId } = options;
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ChatSearchType>('all');
  const [results, setResults] = useState<ChatSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < CHAT_SEARCH_MIN_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setResults(await searchChat(q, { communityId, type }));
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, type, communityId]);

  return { query, setQuery, type, setType, results, searching };
}
