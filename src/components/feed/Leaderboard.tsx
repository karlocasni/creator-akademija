import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types/post';
import XPBadge from '../ui/XPBadge';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardEntry {
  uid: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
}

export default function Leaderboard() {
  const { user: currentUser } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'profiles'), orderBy('xp', 'desc'), limit(10));
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
        console.warn('Leaderboard snapshot error:', err.code);
        // Silently hide the leaderboard on permission or index errors
        setLoading(false);
        if (err.code !== 'permission-denied') {
          setError('Rang lista nedostupna');
        }
      },
    );
    return unsubscribe;
  }, []);

  // Don't render anything if permission denied — avoids visible errors
  if (!loading && error && entries.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-3xl p-6 border border-white/5">
      <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground mb-4">
        Rang Lista
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-5 h-4 bg-white/10 rounded" />
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="flex-1 h-4 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">Nema podataka</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const avatarSrc =
              entry.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`;
            return (
              <Link 
                key={entry.uid} 
                to={currentUser?.uid === entry.uid ? '/profile' : `/profile/${entry.uid}`}
                className="flex items-center gap-3 group hover:bg-white/5 p-1 rounded-xl transition-colors"
              >
                <span
                  className={`w-5 text-center text-xs font-black shrink-0 ${
                    index === 0
                      ? 'text-yellow-400'
                      : index === 1
                        ? 'text-zinc-400'
                        : index === 2
                          ? 'text-amber-600'
                          : 'text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </span>
                <img
                  src={avatarSrc}
                  alt={entry.username}
                  className="w-8 h-8 rounded-full border border-white/10 shrink-0 group-hover:border-primary/50 transition-colors"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`;
                  }}
                />
                <span className="flex-1 font-bold text-sm truncate group-hover:text-primary transition-colors">{entry.username}</span>
                <XPBadge xp={entry.xp} compact />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
