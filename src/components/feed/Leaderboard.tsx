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
        setLoading(false);
        if (err.code !== 'permission-denied') {
          setError('Rang lista nedostupna');
        }
      },
    );
    return unsubscribe;
  }, []);

  if (!loading && error && entries.length === 0) {
    return null;
  }

  return (
    <div className="py-8 w-full max-w-full">
      <h2 className="text-[10px] uppercase font-mono tracking-widest text-[#8B8FA8] mb-6">
        Rang Lista
      </h2>

      {loading ? (
        <div className="space-y-[12px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-[12px] p-[12px] animate-pulse">
              <div className="w-[28px] h-[28px] rounded-full bg-[rgba(245,165,0,0.12)]" />
              <div className="w-[36px] h-[36px] rounded-full bg-[#1A1A22]" />
              <div className="flex-1 h-[14px] bg-[#1A1A22] rounded" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-[#8B8FA8] font-sans text-[14px] py-[4px]">Nema podataka</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => {
            const avatarSrc =
              entry.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`;
            return (
              <Link 
                key={entry.uid} 
                to={currentUser?.uid === entry.uid ? '/profile' : `/profile/${entry.uid}`}
                className="flex items-center gap-4 group"
              >
                <div className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F5A500]/15 text-[#F5A500] font-mono text-[14px] font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${index === 0 ? 'border-2 border-[#F5A500] p-[1px]' : ''}`}>
                      <img
                        src={avatarSrc}
                        alt={entry.username}
                        className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`;
                        }}
                      />
                    </div>
                    <span className="font-heading text-sm text-white group-hover:text-[#F5A500] transition-colors">
                      {entry.username}
                    </span>
                  </div>
                  <div className="lvl-badge text-[10px]">
                    LVL {entry.level}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
