import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface MemberSearchResult {
  uid: string;
  /** Username without the leading '@' (callers render/insert `@${username}`). */
  username: string;
  avatar_url?: string;
}

const MAX_RESULTS = 5;
const PREFIX_END = '';

/**
 * Prefix search for @mentions. Usernames are stored with a leading '@'
 * ("@ivan"), older ones without it, so both prefixes are queried.
 */
export function useMemberSearch(searchQuery: string): MemberSearchResult[] {
  const [results, setResults] = useState<MemberSearchResult[]>([]);

  useEffect(() => {
    const term = (searchQuery || '').trim().replace(/^@+/, '');
    if (!term) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const prefixQuery = (prefix: string) =>
      getDocs(
        query(
          collection(db, 'profiles'),
          where('username', '>=', prefix),
          where('username', '<=', prefix + PREFIX_END),
          limit(MAX_RESULTS * 2),
        ),
      );

    // Small debounce so every keystroke doesn't fire two queries
    const timer = setTimeout(() => {
      Promise.all([prefixQuery(`@${term}`), prefixQuery(term)])
        .then(snaps => {
          if (cancelled) return;
          const seen = new Set<string>();
          const merged: MemberSearchResult[] = [];
          for (const snap of snaps) {
            for (const d of snap.docs) {
              const data = d.data();
              if (seen.has(d.id) || data.status !== 'active') continue;
              seen.add(d.id);
              merged.push({
                uid: d.id,
                username: String(data.username || '').replace(/^@+/, ''),
                avatar_url: data.avatar_url as string | undefined,
              });
            }
          }
          setResults(merged.filter(r => r.username).slice(0, MAX_RESULTS));
        })
        .catch(err => {
          if (!cancelled) setResults([]);
          console.warn('useMemberSearch error:', err);
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  return results;
}
