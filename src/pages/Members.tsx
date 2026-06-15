import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Users, Copy, Check, Plus, X, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types/post';
import XPBadge from '../components/ui/XPBadge';
import { useAuth } from '../contexts/AuthContext';
import CommunityTabs from '../components/layout/CommunityTabs';

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
  const { user: currentUser, profile, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [allProfiles, setAllProfiles] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'creator'>('user');
  const [trialDays, setTrialDays] = useState<number>(30);
  const [newInstagram, setNewInstagram] = useState('');
  const [newTiktok, setNewTiktok] = useState('');
  const [newYoutube, setNewYoutube] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const unpaidEmails = allProfiles
    .filter((m) => m.status !== 'active' && m.email)
    .map((m) => m.email as string);

  if (!authLoading && profile && !profile.isAdmin && !profile.isCreator) {
    return <Navigate to="/feed" replace />;
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newUsername) return;
    setIsSubmitting(true);
    setAddError(null);

    try {
      const existingProfile = allProfiles.find(p => p.email?.toLowerCase() === newEmail.toLowerCase());
      
      let newUid = '';

      if (existingProfile) {
        // User already exists in profiles
        newUid = existingProfile.uid;
      } else {
        // 1. Create user via Identity Toolkit REST API
        const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newEmail,
            password: newPassword, // explicit user password
            returnSecureToken: true,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'Greška pri kreiranju računa');
        }

        newUid = data.localId;
      }

      // 2. Write/Update profile to Firestore
      let accessUntil = null;
      if (newRole === 'user' && trialDays > 0) {
        const date = new Date();
        date.setDate(date.getDate() + trialDays);
        accessUntil = date.toISOString();
      }

      const updatedProfileData: Partial<UserProfile> = {
        username: newUsername,
        isCreator: newRole === 'creator',
        accessUntil,
      };

      if (!existingProfile) {
        updatedProfileData.uid = newUid;
        updatedProfileData.email = newEmail;
        updatedProfileData.status = 'active';
        updatedProfileData.xp = 0;
        updatedProfileData.level = 1;
        updatedProfileData.createdAt = new Date().toISOString();
      }

      if (newInstagram) updatedProfileData.instagram = newInstagram;
      if (newTiktok) updatedProfileData.tiktok = newTiktok;
      if (newYoutube) updatedProfileData.youtube = newYoutube;

      await setDoc(doc(db, 'profiles', newUid), updatedProfileData, { merge: true });

      setShowAddModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewUsername('');
      setNewRole('user');
      setTrialDays(30);
      setNewInstagram('');
      setNewTiktok('');
      setNewYoutube('');
      
      if (existingProfile) {
        alert('Korisnik već postoji. Njegov profil je uspješno ažuriran (napomena: lozinka nije promijenjena).');
      } else {
        alert('Član je uspješno dodan s postavljenom lozinkom.');
      }
    } catch (err: any) {
      console.error('Add member error:', err);
      setAddError(err.message || 'Došlo je do greške.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="flex flex-col w-full max-w-full overflow-hidden">
      <CommunityTabs />
      
      <div className="py-2 px-4 md:px-0 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-black text-3xl uppercase tracking-tighter">ČLANOVI</h1>
        {!loading && (
          <span className="text-xs font-bold ml-auto flex items-center gap-2">
            <span className="px-2 py-0.5 bg-primary/15 text-primary rounded-full border border-primary/30 hidden sm:inline-block">
              {members.length} aktivno
            </span>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-[#0A0A0F] font-bold rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Dodaj
            </button>
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
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-heading font-black text-xl mb-4 uppercase">Dodaj Novog Člana</h2>
            
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Korisničko ime</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="npr. Ivan Horvat"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Email adresa</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="ivan@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Lozinka</label>
                <input 
                  type="text" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Unesite lozinku za korisnika"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Uloga</label>
                <select 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as 'user' | 'creator')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                >
                  <option value="user">Obični Korisnik</option>
                  <option value="creator">Kreator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Instagram (opcionalno)</label>
                <input 
                  type="text" 
                  value={newInstagram}
                  onChange={e => setNewInstagram(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">TikTok (opcionalno)</label>
                <input 
                  type="text" 
                  value={newTiktok}
                  onChange={e => setNewTiktok(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">YouTube (opcionalno)</label>
                <input 
                  type="text" 
                  value={newYoutube}
                  onChange={e => setNewYoutube(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Kanal link ili handle"
                />
              </div>

              {newRole === 'user' && (
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-1">Pristup (broj dana)</label>
                  <input 
                    type="number" 
                    value={trialDays}
                    onChange={e => setTrialDays(parseInt(e.target.value))}
                    min="1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    required
                  />
                  <p className="text-xs text-white/40 mt-1">Nakon ovog broja dana, korisnik će biti odjavljen.</p>
                </div>
              )}

              {addError && <p className="text-red-400 text-sm font-medium">{addError}</p>}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-[#0A0A0F] font-black rounded-xl py-3 mt-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Dodavanje...' : 'Dodaj Člana'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
