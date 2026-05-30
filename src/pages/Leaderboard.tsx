import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/post';
import XPBadge from '../components/ui/XPBadge';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardEntry {
  uid: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
}

const MEDAL_COLORS: Record<number, string> = {
  0: 'text-yellow-400',
  1: 'text-zinc-400',
  2: 'text-amber-600',
};

export default function LeaderboardPage() {
  const { user: currentUser } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only start listener if we have a real Firebase user
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'profiles'), orderBy('xp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setEntries(
          snapshot.docs.map((d) => {
            const data = d.data() as UserProfile;
            return {
              uid: d.id,
              username: data.username || 'Nepoznat',
              avatar_url: data.avatar_url,
              xp: data.xp ?? 0,
              level: data.level ?? 1,
            };
          }),
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('Leaderboard page snapshot error:', err.code);
        setError('Greška pri učitavanju rang liste.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return (
    <div className="py-6 px-4 md:px-0 space-y-4">
      <div className="flex items-center gap-3 px-2">
        <Trophy className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-black text-3xl uppercase tracking-tighter">RANG LISTA</h1>
      </div>

      <div className="ursa-card divide-y divide-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-6 h-4 bg-white/10 rounded" />
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 h-4 bg-white/10 rounded" />
                <div className="w-16 h-6 bg-white/10 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm text-center p-8">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center p-8">Nema podataka</p>
        ) : (
          entries.map((entry, index) => {
            const avatarSrc =
              entry.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`;
            const profilePath =
              currentUser?.uid === entry.uid ? '/profile' : `/profile/${entry.uid}`;

            return (
              <Link
                key={entry.uid}
                to={profilePath}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors group"
              >
                <span
                  className={`w-6 text-center text-sm font-black shrink-0 ${
                    MEDAL_COLORS[index] ?? 'text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </span>
                <img
                  src={avatarSrc}
                  alt={entry.username}
                  className="w-10 h-10 rounded-full border border-white/10 shrink-0 group-hover:border-primary/50 transition-colors object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`;
                  }}
                />
                <span className="flex-1 font-bold text-sm truncate group-hover:text-primary transition-colors">
                  {entry.username}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <XPBadge xp={entry.xp} compact />
                  <span className="text-xs text-muted-foreground font-medium w-16 text-right">
                    {entry.xp.toLocaleString()} XP
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
