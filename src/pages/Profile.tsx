import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { calculateLevel } from '../lib/xp';
import Leaderboard from '../components/feed/Leaderboard';
import { User, Phone, Mail, Camera, ShieldCheck, LogOut, ArrowLeft, ChevronDown, KeyRound, Flame, Target, Bookmark, Trash2, TrendingUp } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, updateDoc, collection, query, where, getDocs, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import XPBadge from '../components/ui/XPBadge';
import { UserProfile } from '../types/post';
import { prepareImage, uploadMedia, mediaPath, deleteMediaByUrl, uploadErrorMessage, MB } from '../lib/media';
import { toast, confirmDialog } from '../lib/dialog';
import { LegalLinks } from '../components/legal/LegalPage';

function parseFirestoreDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Level is always derived from XP (same table as lib/xp.ts). */
function levelOf(p?: { xp?: number } | null): number {
  return calculateLevel(p?.xp || 0);
}

// 2–30 chars: letters (incl. č ć đ š ž), digits, . _ -
const USERNAME_RE = /^[\p{L}\p{N}._-]{2,30}$/u;
const stripAt = (v?: string | null) => (v || '').trim().replace(/^@+/, '');

const AVATAR_MAX_BYTES = 5 * MB; // storage.rules: avatars are image/* < 5 MB
const DAY_MS = 24 * 60 * 60 * 1000;

const GOAL_OPTIONS = [1, 2, 3, 5, 7];

type ProfileTab = 'profil' | 'rang-lista' | 'ciljevi' | 'spremljeno';
type SavedSubTab = 'ideje' | 'hookovi' | 'trendovi';
type ViewedProfile = UserProfile & { id: string };

export default function Profile() {
  const { userId: paramId, username: paramUsername } = useParams();
  const navigate = useNavigate();
  const { user, profile: myProfile, isActualAdmin, signOut, updateLocalProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [otherProfile, setOtherProfile] = useState<ViewedProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);

  // Form states for current user
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  // Social states
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<ProfileTab>('profil');
  const [savedSubTab, setSavedSubTab] = useState<SavedSubTab>('ideje');

  // Streak / Goals state
  const [weeklyGoal, setWeeklyGoal] = useState<number>(myProfile?.weeklyGoal ?? 3);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalToast, setGoalToast] = useState<string | null>(null);

  // Saved items
  const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
  const [savedHooks, setSavedHooks] = useState<any[]>([]);
  const [savedTrends, setSavedTrends] = useState<any[]>([]);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      toast('Link za promjenu lozinke poslan je na tvoj email.', 'success');
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      console.error('Reset error:', err);
      toast('Slanje linka nije uspjelo. Pokušaj ponovno.', 'error');
    }
  };

  // Determine if we are looking at our own profile
  const isOwnProfile =
    (!paramId && !paramUsername) ||
    (!!paramId && paramId === user?.uid) ||
    (!!paramUsername && stripAt(paramUsername).toLowerCase() === stripAt(myProfile?.username).toLowerCase());

  const viewedProfile: ViewedProfile | null = isOwnProfile
    ? (myProfile && user ? { ...myProfile, id: user.uid } : null)
    : otherProfile;
  const viewedId = viewedProfile?.id;
  const isRealAdmin = isActualAdmin && myProfile?.isAdmin === true;

  // Keep the edit form in sync with the saved profile while it is closed
  // (never overwrite what the user is typing).
  useEffect(() => {
    if (!isOwnProfile || !myProfile || editOpen) return;
    setUsername(myProfile.username || '');
    setPhoneNumber(myProfile.phone_number || '');
    setBio(myProfile.bio || '');
    setGender(myProfile.gender || 'male');
    setInstagram(myProfile.instagram || '');
    setTiktok(myProfile.tiktok || '');
    setYoutube(myProfile.youtube || '');
    setWeeklyGoal(myProfile.weeklyGoal ?? 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile, editOpen, myProfile?.username, myProfile?.phone_number, myProfile?.bio, myProfile?.gender,
    myProfile?.instagram, myProfile?.tiktok, myProfile?.youtube, myProfile?.weeklyGoal]);

  // Someone else's profile: live listener by id, or by username (with or without '@').
  useEffect(() => {
    if (isOwnProfile || !user) {
      setOtherProfile(null);
      setNotFound(false);
      setFetchingProfile(false);
      return;
    }
    setFetchingProfile(true);
    setNotFound(false);
    setOtherProfile(null);

    const onError = (err: unknown) => {
      console.error('Error fetching profile:', err);
      setFetchingProfile(false);
      setNotFound(true);
    };

    if (paramId) {
      return onSnapshot(doc(db, 'profiles', paramId), (snap) => {
        setOtherProfile(snap.exists() ? { ...(snap.data() as UserProfile), id: snap.id } : null);
        setNotFound(!snap.exists());
        setFetchingProfile(false);
      }, onError);
    }

    const bare = stripAt(paramUsername);
    if (!bare) {
      setFetchingProfile(false);
      setNotFound(true);
      return;
    }
    const q = query(collection(db, 'profiles'), where('username', 'in', [`@${bare}`, bare]), limit(1));
    return onSnapshot(q, (snap) => {
      const d = snap.docs[0];
      setOtherProfile(d ? { ...(d.data() as UserProfile), id: d.id } : null);
      setNotFound(!d);
      setFetchingProfile(false);
    }, onError);
  }, [paramId, paramUsername, isOwnProfile, user?.uid]);

  // Load saved items for own profile (rules only allow reading your own docs,
  // so every listener must be filtered by the owner).
  useEffect(() => {
    if (!user || !isOwnProfile) return;
    const uid = user.uid;
    const warn = (what: string) => (err: unknown) => console.warn(`[Profile] ${what} listener error:`, err);

    const unsubIdeas = onSnapshot(
      query(collection(db, 'videoIdeas'), where('userId', '==', uid)),
      snap => setSavedIdeas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      warn('videoIdeas'),
    );

    const unsubHooks = onSnapshot(
      query(collection(db, 'hookVault'), where('authorId', '==', uid)),
      // Show hooks submitted by the user (saved = submitted in this context)
      snap => setSavedHooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      warn('hookVault'),
    );

    const unsubTrends = onSnapshot(
      query(collection(db, 'savedTrends'), where('userId', '==', uid)),
      snap => setSavedTrends(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      warn('savedTrends'),
    );

    return () => {
      unsubIdeas();
      unsubHooks();
      unsubTrends();
    };
  }, [user?.uid, isOwnProfile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setFormError(null);

    const bare = stripAt(username);
    if (!USERNAME_RE.test(bare)) {
      setFormError('Korisničko ime: 2–30 znakova, samo slova, brojke i . _ - (bez razmaka).');
      return;
    }
    const cleanUsername = `@${bare}`;

    setLoading(true);
    try {
      if (cleanUsername !== myProfile?.username) {
        const snap = await getDocs(
          query(collection(db, 'profiles'), where('username', 'in', [cleanUsername, bare]), limit(2)),
        );
        if (snap.docs.some(d => d.id !== user.uid)) {
          setFormError('To korisničko ime je već zauzeto.');
          return;
        }
      }

      await setDoc(
        doc(db, 'profiles', user.uid),
        {
          username: cleanUsername,
          phone_number: phoneNumber.trim(),
          bio: bio.trim(),
          gender,
          instagram: instagram.trim(),
          tiktok: tiktok.trim(),
          youtube: youtube.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setUsername(cleanUsername);
      setEditOpen(false);
      toast('Profil uspješno ažuriran!', 'success');
    } catch (err) {
      console.error(err);
      toast('Greška pri ažuriranju profila.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // allow picking the same file again
    if (!file || !user?.uid) return;

    const uid = user.uid;
    const previous = myProfile?.avatar_url;
    setUploadProgress(0);
    try {
      const blob = await prepareImage(file, 512);
      if (blob.size >= AVATAR_MAX_BYTES) {
        toast('Slika je prevelika (max 5 MB).', 'error');
        return;
      }
      const { promise } = uploadMedia(mediaPath(`avatars/${uid}`, blob.type), blob, (f) =>
        setUploadProgress(Math.round(f * 100)),
      );
      const url = await promise;
      await setDoc(doc(db, 'profiles', uid), { avatar_url: url, updatedAt: new Date().toISOString() }, { merge: true });
      // Only ever clean up the user's own previous avatar file
      if (previous && previous !== url && previous.includes(`avatars%2F${uid}%2F`)) {
        deleteMediaByUrl(previous);
      }
      toast('Profilna slika ažurirana!', 'success');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast(uploadErrorMessage(err), 'error');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleSaveGoal = async (goal: number) => {
    if (!user) return;
    setSavingGoal(true);
    try {
      await setDoc(doc(db, 'profiles', user.uid), { weeklyGoal: goal }, { merge: true });
      updateLocalProfile({ weeklyGoal: goal });
      setWeeklyGoal(goal);
      setGoalToast('Cilj ažuriran! 🎯');
      setTimeout(() => setGoalToast(null), 2500);
    } catch (e) {
      console.error(e);
      toast('Spremanje cilja nije uspjelo.', 'error');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleRemoveSavedIdea = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'videoIdeas', id));
    } catch (err) {
      console.error(err);
      toast('Brisanje nije uspjelo.', 'error');
    }
  };

  const handleRemoveSavedTrend = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'savedTrends', id));
    } catch (err) {
      console.error(err);
      toast('Brisanje nije uspjelo.', 'error');
    }
  };

  // ─── Admin actions on someone else's profile ─────────────────────────────────

  const adminUpdate = async (patch: Partial<UserProfile>, okText: string) => {
    if (!viewedId || !isRealAdmin) return;
    setAdminBusy(true);
    try {
      await updateDoc(doc(db, 'profiles', viewedId), { ...patch, updatedAt: new Date().toISOString() });
      toast(okText, 'success');
    } catch (err) {
      console.error('Admin update failed:', err);
      toast('Spremanje nije uspjelo.', 'error');
    } finally {
      setAdminBusy(false);
    }
  };

  const handleToggleActive = async () => {
    if (!viewedProfile) return;
    if (viewedProfile.status === 'active') {
      const ok = await confirmDialog(
        `Deaktivirati ${viewedProfile.username}? Izgubit će pristup sadržaju dok ga ponovno ne aktiviraš.`,
        { confirmLabel: 'Deaktiviraj', danger: true },
      );
      if (ok) await adminUpdate({ status: 'inactive' }, 'Korisnik je deaktiviran.');
    } else {
      const ok = await confirmDialog(`Aktivirati ${viewedProfile.username} na 30 dana?`, { confirmLabel: 'Aktiviraj' });
      if (ok) {
        await adminUpdate(
          { status: 'active', accessUntil: new Date(Date.now() + 30 * DAY_MS).toISOString() },
          'Korisnik je aktiviran na 30 dana.',
        );
      }
    }
  };

  const handleExtendAccess = async (days: number) => {
    if (!viewedProfile) return;
    const current = viewedProfile.accessUntil ? new Date(viewedProfile.accessUntil).getTime() || 0 : 0;
    const next = new Date(Math.max(Date.now(), current) + days * DAY_MS);
    await adminUpdate({ accessUntil: next.toISOString() }, `Pristup produljen do ${next.toLocaleDateString('hr-HR')}.`);
  };

  const handleToggleCreator = async () => {
    if (!viewedProfile) return;
    const next = !viewedProfile.isCreator;
    const ok = await confirmDialog(
      next
        ? 'Jesi li siguran da želiš promaknuti ovog korisnika u mentora?'
        : 'Jesi li siguran da želiš ukloniti mentorska prava ovom korisniku?',
      { confirmLabel: next ? 'Promakni' : 'Ukloni', danger: !next },
    );
    if (!ok) return;
    await adminUpdate(
      { isCreator: next, ...(next && !viewedProfile.mainTopic ? { mainTopic: 'Produkcija' } : {}) },
      next ? 'Korisnik promaknut u mentora!' : 'Mentorska prava uklonjena.',
    );
  };

  if (fetchingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isOwnProfile && notFound) {
    return (
      <div className="p-4 md:p-10 max-w-2xl mx-auto text-center space-y-4">
        <p className="text-white font-bold">Profil nije pronađen.</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm font-bold hover:underline">
          Povratak
        </button>
      </div>
    );
  }


  const avatarSrc =
    viewedProfile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewedProfile?.username || 'user'}`;

  const weeklyPostCount = myProfile?.weeklyPostCount ?? 0;
  const streak = myProfile?.streak ?? 0;
  const goalMet = weeklyPostCount >= weeklyGoal;

  return (
    <div className="p-4 md:p-10 max-w-2xl mx-auto pb-20">
      <header className="mb-10 flex items-start justify-between">
        <div>
          {!isOwnProfile && (
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Povratak</span>
            </button>
          )}
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-white">
            {isOwnProfile ? 'KORISNIČKI ' : 'PREGLED '} 
            <span className="text-primary">PROFILA</span>
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest mt-1">
            {isOwnProfile 
              ? 'Upravljaj svojim podacima, prati Creator XP i razinu.' 
              : `Statistika i podaci korisnika ${viewedProfile?.username}.`}
          </p>
        </div>
      </header>

      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="ursa-card p-8 flex flex-col items-center text-center">
          <div className="relative group mb-4">
            <div className="w-32 h-32 rounded-full border-2 border-primary p-1">
              <img
                src={avatarSrc}
                className="w-full h-full rounded-full object-cover"
                alt="Avatar"
              />
              {isOwnProfile && uploadProgress !== null && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white">{uploadProgress}%</span>
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null}
                className="absolute bottom-1 right-1 p-2 bg-primary text-black rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          {isOwnProfile && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          )}
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
            {viewedProfile?.username || 'Creator Član'}
          </h2>
          <div className="mt-2">
            <XPBadge xp={viewedProfile?.xp ?? 0} />
          </div>
          {viewedProfile?.status === 'active' && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                Aktivni Član
              </span>
            </div>
          )}

          {viewedProfile?.isCreator && (
            <Link
              to={`/creator/${viewedProfile.id}`}
              className="mt-4 px-6 py-2.5 bg-[#3B82F6] text-white rounded-full font-heading font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              POGLEDAJ STRANICU MENTORA
            </Link>
          )}

          {/* Streak badge — only own profile */}
          {isOwnProfile && streak > 0 && (
            <div className="flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)]">
              <Flame className="w-4 h-4 text-[#3B82F6]" />
              <span className="font-mono font-bold text-[13px] text-[#3B82F6]">
                {streak} {streak === 1 ? 'tjedan' : streak < 5 ? 'tjedna' : 'tjedana'} zaredom
              </span>
            </div>
          )}

          {/* SOCIAL ICONS (View & Own Profile) */}
          {(viewedProfile?.instagram || viewedProfile?.tiktok || viewedProfile?.youtube) && (
            <div className="flex items-center justify-center gap-3 mt-6">
              {viewedProfile.instagram && (
                <a href={`https://instagram.com/${viewedProfile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {viewedProfile.tiktok && (
                <a href={`https://tiktok.com/@${viewedProfile.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96-.5 3.9-1.5 5.56-1.14 1.83-3.1 3.12-5.26 3.4-2.18.29-4.52-.22-6.29-1.57-1.74-1.35-2.87-3.37-3.08-5.59-.2-2.22.42-4.51 1.82-6.25 1.34-1.63 3.33-2.67 5.43-2.84.4-.04.81-.04 1.21-.02v3.9c-.39-.02-.79-.04-1.18-.01-1.07.08-2.11.53-2.89 1.3-.77.78-1.22 1.83-1.26 2.92-.04 1.09.34 2.16 1.03 3.02.7.85 1.71 1.37 2.8 1.48 1.09.11 2.21-.21 3.09-.86.88-.65 1.42-1.61 1.56-2.69.14-1.07-.11-2.18-.7-3.09V.02h3.04z"/></svg>
                </a>
              )}
              {viewedProfile.youtube && (
                <a href={viewedProfile.youtube.startsWith('http') ? viewedProfile.youtube : `https://youtube.com/@${viewedProfile.youtube.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              )}
              
              {isOwnProfile && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors h-10 ml-2"
                >
                  Uredi Mreže
                </button>
              )}
            </div>
          )}
        </div>

        {/* TAB BAR — own profile only */}
        {isOwnProfile && (
          <div className="flex gap-1 p-1 bg-[#151E30] rounded-2xl border border-[rgba(255,255,255,0.06)]">
            {([
              { key: 'profil', label: 'Profil' },
              { key: 'rang-lista', label: 'Rang Lista' },
              { key: 'ciljevi', label: 'Ciljevi' },
              { key: 'spremljeno', label: 'Spremljeno' },
            ] as { key: ProfileTab; label: string }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#8B8FA8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ══════════ PROFIL TAB ══════════ */}
        {(!isOwnProfile || activeTab === 'profil') && (
          isOwnProfile ? (
            /* Form Section for Own Profile */
            <div className="ursa-card p-8 space-y-6">
              {/* Email */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-muted-foreground uppercase ml-1">Email adresa</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Collapsible edit section */}
              <button
                type="button"
                onClick={() => setEditOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-black uppercase tracking-widest text-white hover:border-primary/50 transition-colors"
              >
                <span>Uredi profil</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${editOpen ? 'rotate-180' : ''}`} />
              </button>

              {editOpen && (
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-black text-muted-foreground uppercase ml-1">Korisničko ime</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
                        placeholder="@korisnicko_ime"
                        maxLength={31}
                        autoComplete="username"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground ml-1">2–30 znakova: slova, brojke i . _ - (bez razmaka)</p>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-black text-muted-foreground uppercase ml-1">Broj mobitela</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
                        placeholder="+385 91 000 0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-black text-muted-foreground uppercase ml-1">Opis o meni</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={300}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white resize-none placeholder:text-muted-foreground/50"
                      placeholder="Napiši nešto o sebi, svojim ciljevima..."
                    />
                    <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-black text-muted-foreground uppercase ml-1">Spol</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white appearance-none"
                    >
                      <option value="male" className="bg-black text-white">Muško</option>
                      <option value="female" className="bg-black text-white">Žensko</option>
                    </select>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <h3 className="text-sm font-black uppercase text-white mb-4 tracking-widest">Moje Mreže</h3>
                    <div className="space-y-4">
                      <div className="space-y-2 text-left">
                        <label className="text-xs font-black text-muted-foreground uppercase ml-1">Instagram</label>
                        <input
                          type="text"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary focus:outline-none transition-colors text-white"
                          placeholder="@korisničkoime"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <label className="text-xs font-black text-muted-foreground uppercase ml-1">TikTok</label>
                        <input
                          type="text"
                          value={tiktok}
                          onChange={(e) => setTiktok(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary focus:outline-none transition-colors text-white"
                          placeholder="@korisničkoime"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <label className="text-xs font-black text-muted-foreground uppercase ml-1">YouTube</label>
                        <input
                          type="text"
                          value={youtube}
                          onChange={(e) => setYoutube(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary focus:outline-none transition-colors text-white"
                          placeholder="Naziv kanala ili URL"
                        />
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <p className="text-sm text-red-400 font-bold text-center" role="alert">{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary text-black rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    {loading ? 'SPREMANJE...' : 'AŽURIRAJ PROFIL'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* View-only stats for other users */
            <div className="space-y-6">
              {viewedProfile?.bio && (
                <div className="ursa-card p-6">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Opis o meni</p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{viewedProfile.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="ursa-card p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ukupni XP</span>
                  <span className="text-2xl font-black text-primary">{(viewedProfile?.xp ?? 0).toLocaleString()}</span>
                </div>
                <div className="ursa-card p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Razina</span>
                  <span className="text-2xl font-black text-white">{levelOf(viewedProfile)}</span>
                </div>
              </div>
              {isRealAdmin && !isOwnProfile && viewedId && viewedProfile && (
                <div className="space-y-4">
                  <div className="ursa-card p-6 border border-primary/20 bg-primary/5">
                    <h3 className="text-sm font-black text-primary uppercase mb-4">Admin kontrole: pristup</h3>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground uppercase text-xs">Datum pridruživanja:</span>
                        <span className="font-bold text-white">
                          {(() => { const d = parseFirestoreDate(viewedProfile.createdAt); return d ? d.toLocaleDateString('hr-HR') : 'Nepoznato'; })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground uppercase text-xs">Status:</span>
                        <span className={`font-bold ${viewedProfile.status === 'active' ? 'text-emerald-400' : 'text-yellow-300'}`}>
                          {viewedProfile.status === 'active' ? 'Aktivan' : 'Na čekanju / neaktivan'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground uppercase text-xs">Pristup do:</span>
                        <span className="font-bold text-primary">
                          {(() => {
                            const d = parseFirestoreDate(viewedProfile.accessUntil);
                            return d ? d.toLocaleDateString('hr-HR') : 'Bez ograničenja';
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleToggleActive}
                        disabled={adminBusy}
                        className={`py-2.5 rounded-xl text-sm font-black transition-colors disabled:opacity-50 ${
                          viewedProfile.status === 'active'
                            ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                            : 'bg-emerald-500 text-black hover:bg-emerald-400'
                        }`}
                      >
                        {viewedProfile.status === 'active' ? 'DEAKTIVIRAJ' : 'AKTIVIRAJ (30 DANA)'}
                      </button>
                      <button
                        onClick={() => handleExtendAccess(30)}
                        disabled={adminBusy}
                        className="py-2.5 bg-primary text-black rounded-xl text-sm font-black hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        +30 DANA
                      </button>
                    </div>
                    <Link to="/members" className="block text-center text-xs font-bold text-primary hover:underline mt-4">
                      Detaljno upravljanje (datum, uloge) u Članovima
                    </Link>
                  </div>

                  <div className="ursa-card p-6 border border-primary/20 bg-primary/5">
                    <h3 className="text-sm font-black text-primary uppercase mb-4">Admin kontrole: Creator uloga</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {viewedProfile.isCreator
                        ? 'Ovaj korisnik je trenutno MENTOR/KREATOR i drži predavanja.'
                        : 'Ovaj korisnik je trenutno običan član/student.'}
                    </p>
                    <button
                      onClick={handleToggleCreator}
                      disabled={adminBusy}
                      className={`w-full py-3 rounded-xl text-sm font-black hover:scale-[1.02] transition-transform disabled:opacity-50 ${
                        viewedProfile.isCreator
                          ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                          : 'bg-primary text-black'
                      }`}
                    >
                      {viewedProfile.isCreator ? 'UKLONI MENTOR STATUS' : 'PROMAKNI U MENTORA'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* ══════════ RANG LISTA TAB ══════════ */}
        {isOwnProfile && activeTab === 'rang-lista' && (
          <div className="ursa-card p-6">
            <Leaderboard />
          </div>
        )}

        {/* ══════════ CILJEVI TAB ══════════ */}
        {isOwnProfile && activeTab === 'ciljevi' && (
          <div className="space-y-5">
            {/* Goal toast */}
            {goalToast && (
              <div className="text-center py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono font-bold text-[11px] uppercase tracking-widest animate-pulse">
                {goalToast}
              </div>
            )}

            {/* Streak card */}
            <div className="ursa-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
                  <Flame className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="font-heading font-[800] text-[18px] text-white uppercase">Streak</h3>
                  <p className="font-sans text-[12px] text-[#8B8FA8]">Uzastopni tjedni gdje si ispunio cilj</p>
                </div>
              </div>

              {streak > 0 ? (
                <div className="flex items-center gap-3 p-4 bg-[rgba(59,130,246,0.08)] rounded-2xl border border-[rgba(59,130,246,0.2)]">
                  <span className="text-[36px]">🔥</span>
                  <div>
                    <p className="font-mono font-bold text-[28px] text-[#3B82F6] leading-none">{streak}</p>
                    <p className="font-sans text-[13px] text-[#8B8FA8] mt-1">
                      {streak === 1 ? 'tjedan zaredom' : streak < 5 ? 'tjedna zaredom' : 'tjedana zaredom'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-2xl border border-[rgba(255,255,255,0.06)] text-center">
                  <p className="text-[#8B8FA8] text-[13px]">Ispuni tjedni cilj da pokreneš streak! 💪</p>
                </div>
              )}
            </div>

            {/* Weekly goal card */}
            <div className="ursa-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="font-heading font-[800] text-[18px] text-white uppercase">Tjedni Cilj</h3>
                  <p className="font-sans text-[12px] text-[#8B8FA8]">Koliko videa / objava tjedno?</p>
                </div>
              </div>

              {/* Goal selector */}
              <div className="flex gap-2 mb-5">
                {GOAL_OPTIONS.map(g => (
                  <button
                    key={g}
                    onClick={() => handleSaveGoal(g)}
                    disabled={savingGoal}
                    className={`flex-1 py-2.5 rounded-full font-mono font-bold text-[15px] transition-all ${
                      weeklyGoal === g
                        ? 'bg-[#3B82F6] text-white shadow-[0_0_16px_rgba(59,130,246,0.4)]'
                        : 'bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[13px] text-[#8B8FA8]">
                    Tjedni cilj: <span className="text-white font-bold">{weeklyPostCount}/{weeklyGoal}</span> {weeklyPostCount === 1 ? 'objava' : 'objave'}
                  </span>
                  {goalMet && (
                    <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                      ✓ ISPUNJENO!
                    </span>
                  )}
                </div>
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (weeklyPostCount / weeklyGoal) * 100)}%`,
                      background: goalMet
                        ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                        : 'linear-gradient(90deg, #3B82F6, #2563EB)',
                      boxShadow: goalMet
                        ? '0 0 12px rgba(34,197,94,0.5)'
                        : '0 0 12px rgba(59,130,246,0.5)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* XP stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="ursa-card p-5 flex flex-col items-center text-center">
                <span className="text-[10px] font-mono text-[#4A4A5A] uppercase tracking-widest mb-1">Ukupni XP</span>
                <span className="text-[24px] font-mono font-bold text-[#3B82F6]">{(myProfile?.xp ?? 0).toLocaleString()}</span>
              </div>
              <div className="ursa-card p-5 flex flex-col items-center text-center">
                <span className="text-[10px] font-mono text-[#4A4A5A] uppercase tracking-widest mb-1">Razina</span>
                <span className="text-[24px] font-mono font-bold text-white">{levelOf(myProfile)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ SPREMLJENO TAB ══════════ */}
        {isOwnProfile && activeTab === 'spremljeno' && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {([
                { key: 'ideje', label: 'Ideje', count: savedIdeas.length },
                { key: 'hookovi', label: 'Hookovi', count: savedHooks.length },
                { key: 'trendovi', label: 'Trendovi', count: savedTrends.length },
              ] as { key: SavedSubTab; label: string; count: number }[]).map(sub => (
                <button
                  key={sub.key}
                  onClick={() => setSavedSubTab(sub.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
                    savedSubTab === sub.key
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:text-white'
                  }`}
                >
                  {sub.label}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${savedSubTab === sub.key ? 'bg-black/20' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                    {sub.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Ideje */}
            {savedSubTab === 'ideje' && (
              savedIdeas.length === 0 ? (
                <EmptyState label="video ideja" />
              ) : (
                <div className="flex flex-col gap-3">
                  {savedIdeas.map((idea: any) => (
                    <div key={idea.id} className="ursa-card p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-full font-mono text-[10px] font-bold uppercase">{idea.nisa}</span>
                            <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] rounded-full text-[10px]">{idea.platforma}</span>
                          </div>
                          <p className="font-heading font-bold text-[15px] text-white leading-snug">"{idea.hook}"</p>
                        </div>
                        <button
                          onClick={() => handleRemoveSavedIdea(idea.id)}
                          className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Hookovi */}
            {savedSubTab === 'hookovi' && (
              savedHooks.length === 0 ? (
                <EmptyState label="hookova" />
              ) : (
                <div className="flex flex-col gap-3">
                  {savedHooks.map((hook: any) => (
                    <div key={hook.id} className="ursa-card p-5">
                      <p className="font-heading font-bold text-[15px] text-white mb-2">"{hook.hookText}"</p>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] rounded-full text-[11px]">{hook.kategorija}</span>
                        <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] rounded-full text-[11px]">{hook.nisa}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Trendovi */}
            {savedSubTab === 'trendovi' && (
              savedTrends.length === 0 ? (
                <EmptyState label="trendova" />
              ) : (
                <div className="flex flex-col gap-3">
                  {savedTrends.map((trend: any) => (
                    <div key={trend.id} className="ursa-card p-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-[#8B8FA8]" />
                        </div>
                        <div>
                          <p className="font-sans font-bold text-[14px] text-white">{trend.name}</p>
                          <p className="font-sans text-[12px] text-[#8B8FA8]">{trend.reach} reach</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSavedTrend(trend.id)}
                        className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Reset password + Sign out (only on own profile, when on profil tab) */}
        {isOwnProfile && activeTab === 'profil' && (
          <div className="space-y-3">
            <button
              onClick={handlePasswordReset}
              disabled={resetSent}
              className="w-full py-4 ursa-card border-primary/20 text-primary font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors disabled:opacity-60"
            >
              <KeyRound className="w-5 h-5" />
              {resetSent ? '✓ LINK POSLAN NA TVOJ EMAIL' : 'RESETIRAJ LOZINKU'}
            </button>
            <button
              onClick={signOut}
              className="w-full py-4 ursa-card border-red-500/20 text-red-400 font-black text-lg flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" /> ODJAVA
            </button>
            <LegalLinks className="block text-center text-xs text-white/40 pt-2" />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="ursa-card p-10 text-center">
      <Bookmark className="w-10 h-10 text-[#4A4A5A] mx-auto mb-3" />
      <p className="text-[#8B8FA8] text-[14px] font-heading font-bold">Još nisi ništa spremio.</p>
      <p className="text-[#4A4A5A] text-[12px] mt-1">Počni istraživati da vidiš {label} ovdje!</p>
    </div>
  );
}
