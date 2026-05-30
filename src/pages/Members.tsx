import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Copy, Check } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/post';
import XPBadge from '../components/ui/XPBadge';
import { useAuth } from '../contexts/AuthContext';

interface MemberEntry {
  uid: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
  createdAt: unknown;
  status: string;
  email?: string;
}

function formatJoinDate(createdAt: unknown): string {
  try {
    let date: Date;
    // Firestore Timestamp object
    if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
      date = (createdAt as { toDate: () => Date }).toDate();
    } else if (typeof createdAt === 'string' && createdAt) {
      date = new Date(createdAt);
    } else {
      return '';
    }
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function Members() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [allProfiles, setAllProfiles] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const unpaidEmails = allProfiles
    .filter((m) => m.status !== 'active' && m.email)
    .map((m) => m.email as string);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'profiles'),
      orderBy('createdAt', 'desc'),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMembers(
          snapshot.docs
            .map((d) => {
              const data = d.data() as UserProfile;
              return {
                uid: d.id,
                username: data.username || 'Nepoznat',
                avatar_url: data.avatar_url,
                xp: data.xp ?? 0,
                level: data.level ?? 1,
                createdAt: data.createdAt ?? '',
                status: data.status || 'inactive',
              };
            })
            .filter((m) => m.status === 'active'),
        );
        setAllProfiles(
          snapshot.docs.map((d) => {
            const data = d.data() as UserProfile;
            return {
              uid: d.id,
              username: data.username || 'Nepoznat',
              avatar_url: data.avatar_url,
              xp: data.xp ?? 0,
              level: data.level ?? 1,
              createdAt: data.createdAt ?? '',
              status: data.status || 'inactive',
              email: data.email || '',
            };
          }),
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('Members snapshot error:', err.code);
        setError('Greška pri učitavanju članova.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return (
    <div className="py-6 px-4 md:px-0 space-y-4">
      <div className="flex items-center gap-3 px-2">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-black text-3xl uppercase tracking-tighter">ČLANOVI</h1>
        {!loading && (
          <span className="text-xs font-bold ml-auto flex items-center gap-2">
            <span className="px-2 py-0.5 bg-primary/15 text-primary rounded-full border border-primary/30">
              {members.length} platilo
            </span>
          </span>
        )}
      </div>

      {/* Copy unpaid emails button */}
      {!loading && unpaidEmails.length > 0 && (
        <div className="ursa-card p-4 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">Registrirani bez plaćanja</p>
              <p className="text-sm text-white/70 mt-0.5">{unpaidEmails.length} korisnika — kopiraj za slanje maila</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(unpaidEmails.join('; '));
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 rounded-xl font-black text-xs uppercase tracking-widest transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopirano!' : 'Kopiraj emailove'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ursa-card p-4 flex flex-col items-center gap-3 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-white/10" />
              <div className="w-20 h-4 bg-white/10 rounded" />
              <div className="w-12 h-5 bg-white/10 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm text-center p-8">{error}</p>
      ) : members.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center p-8">Nema članova</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {members.map((member) => {
            const avatarSrc =
              member.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
            const profilePath =
              currentUser?.uid === member.uid ? '/profile' : `/profile/${member.uid}`;

            return (
              <Link
                key={member.uid}
                to={profilePath}
                className="ursa-card p-4 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors group"
              >
                <img
                  src={avatarSrc}
                  alt={member.username}
                  className="w-14 h-14 rounded-full border border-white/10 object-cover group-hover:border-primary/50 transition-colors"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
                  }}
                />
                <span className="font-bold text-sm text-center truncate w-full text-center group-hover:text-primary transition-colors">
                  {member.username}
                </span>
                <XPBadge xp={member.xp} compact />
                {Boolean(member.createdAt) && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatJoinDate(member.createdAt)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
