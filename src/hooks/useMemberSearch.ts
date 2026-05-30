import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface MemberSearchResult {
  uid: string;
  username: string;
  avatar_url?: string;
}

export function useMemberSearch(searchQuery: string): MemberSearchResult[] {
  const [results, setResults] = useState<MemberSearchResult[]>([]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const q = query(
      collection(db, 'profiles'),
      where('username', '>=', searchQuery),
      where('username', '<=', searchQuery + ''),
      limit(5),
    );

    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        setResults(
          snap.docs.map((d) => ({
            uid: d.id,
            username: (d.data().username as string) || '',
            avatar_url: d.data().avatar_url as string | undefined,
          })),
        );
      })
      .catch((err) => console.warn('useMemberSearch error:', err));

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  return results;
}
