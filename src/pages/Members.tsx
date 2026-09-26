import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Users, Copy, Check, Plus, X, Loader2, Eye, EyeOff, Search, ShieldCheck, Clock, UserCheck, UserX, Settings,
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/post';
import XPBadge from '../components/ui/XPBadge';
import { useAuth, isAccessExpired } from '../contexts/AuthContext';
import { isAdminEmail } from '../lib/admin';
import { toast, confirmDialog } from '../lib/dialog';
import CommunityTabs from '../components/layout/CommunityTabs';

interface MemberEntry {
  uid: string;
  username: string;
  avatar_url?: string;
  xp: number;
  createdAt: unknown;
  createdMs: number;
  status: 'active' | 'inactive';
  email: string;
  isCreator: boolean;
  isAdmin: boolean;
  accessUntil: string | null;
  mainTopic?: string;
}

// Same rules as the profile editor: 2–30 chars, letters (incl. Croatian), digits, . _ -
const USERNAME_RE = /^[\p{L}\p{N}._-]{2,30}$/u;

const ACCESS_OPTIONS: { label: string; days: number }[] = [
  { label: '30 dana', days: 30 },
  { label: '90 dana', days: 90 },
  { label: '180 dana', days: 180 },
  { label: '365 dana', days: 365 },
  { label: 'Bez ograničenja', days: 0 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** createdAt is an ISO string on new docs and a Timestamp on older ones. */
function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null) {
    if ('toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
      return (value as { toMillis: () => number }).toMillis();
    }
    if ('seconds' in value && typeof (value as { seconds: unknown }).seconds === 'number') {
      return (value as { seconds: number }).seconds * 1000;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const t = new Date(value).getTime();
    return isNaN(t) ? 0 : t;
  }
  return 0;
}

function formatDate(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('hr-HR', { year: 'numeric', month: 'short', day: 'numeric' });
}

const accessFromDays = (days: number) => (days > 0 ? new Date(Date.now() + days * DAY_MS).toISOString() : null);

const avatarFor = (m: { avatar_url?: string; username: string }) =>
  m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.username)}`;

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors';

export default function Members() {
  const { user: currentUser, profile, isActualAdmin, loading: authLoading } = useAuth();
  const isAdmin = isActualAdmin && profile?.isAdmin === true;
  const canView = isAdmin || profile?.isCreator === true;

  const [allProfiles, setAllProfiles] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [activationDays, setActivationDays] = useState<number>(30);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [manageUid, setManageUid] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'creator'>('user');
  const [trialDays, setTrialDays] = useState<number>(30);
  const [newInstagram, setNewInstagram] = useState('');
  const [newTiktok, setNewTiktok] = useState('');
  const [newYoutube, setNewYoutube] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // No orderBy: it would silently drop docs without createdAt, and createdAt is
  // a mix of ISO strings and Timestamps. Sorted client-side instead.
  useEffect(() => {
    if (!currentUser || !canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'profiles'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() as Partial<UserProfile>;
          const createdAt = data.createdAt ?? null;
          return {
            uid: d.id,
            username: data.username || 'Nepoznat',
            avatar_url: data.avatar_url,
            xp: typeof data.xp === 'number' ? data.xp : 0,
            createdAt,
            createdMs: toMillis(createdAt),
            status: data.status === 'active' ? 'active' : 'inactive',
            email: data.email || '',
            isCreator: data.isCreator === true,
            isAdmin: data.isAdmin === true || isAdminEmail(data.email),
            accessUntil: data.accessUntil ?? null,
            mainTopic: data.mainTopic,
          } as MemberEntry;
        });
        list.sort((a, b) => b.createdMs - a.createdMs);
        setAllProfiles(list);
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
  }, [currentUser?.uid, canView]);

  const pending = useMemo(() => allProfiles.filter((m) => m.status !== 'active'), [allProfiles]);
  const members = useMemo(() => allProfiles.filter((m) => m.status === 'active'), [allProfiles]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.username.toLowerCase().includes(q) || (isAdmin && m.email.toLowerCase().includes(q)),
    );
  }, [members, search, isAdmin]);

  const managed = manageUid ? allProfiles.find((m) => m.uid === manageUid) ?? null : null;

  // All hooks above — only now may we bail out.
  if (!authLoading && profile && !canView) {
    return <Navigate to="/feed" replace />;
  }

  const pendingEmails = pending.filter((m) => m.email).map((m) => m.email);

  // ─── Admin actions ───────────────────────────────────────────────────────────

  const runAction = async (uid: string, fn: () => Promise<void>, okText: string) => {
    setBusyUid(uid);
    try {
      await fn();
      toast(okText, 'success');
    } catch (err) {
      console.error('Member update failed:', err);
      toast('Spremanje nije uspjelo. Provjeri vezu i pokušaj ponovno.', 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const activate = (m: MemberEntry, days: number) =>
    runAction(
      m.uid,
      () => updateDoc(doc(db, 'profiles', m.uid), {
        status: 'active',
        accessUntil: accessFromDays(days),
        updatedAt: new Date().toISOString(),
      }),
      `${m.username} je aktiviran${days > 0 ? ` (${days} dana)` : ' bez ograničenja'}.`,
    );

  const deactivate = async (m: MemberEntry) => {
    const ok = await confirmDialog(
      `Deaktivirati ${m.username}? Izgubit će pristup sadržaju dok ga ponovno ne aktiviraš.`,
      { confirmLabel: 'Deaktiviraj', danger: true },
    );
    if (!ok) return;
    await runAction(
      m.uid,
      () => updateDoc(doc(db, 'profiles', m.uid), { status: 'inactive', updatedAt: new Date().toISOString() }),
      `${m.username} je deaktiviran.`,
    );
  };

  const setAccessUntil = (m: MemberEntry, value: string | null) =>
    runAction(
      m.uid,
      () => updateDoc(doc(db, 'profiles', m.uid), { accessUntil: value, updatedAt: new Date().toISOString() }),
      value ? `Pristup vrijedi do ${formatDate(new Date(value).getTime())}.` : 'Pristup je bez ograničenja.',
    );

  const extendAccess = (m: MemberEntry, days: number) => {
    const base = Math.max(Date.now(), m.accessUntil ? new Date(m.accessUntil).getTime() || 0 : 0);
    return setAccessUntil(m, new Date(base + days * DAY_MS).toISOString());
  };

  const toggleCreator = async (m: MemberEntry) => {
    const next = !m.isCreator;
    const ok = await confirmDialog(
      next ? `Promaknuti ${m.username} u mentora/kreatora?` : `Ukloniti mentorska prava korisniku ${m.username}?`,
      { confirmLabel: next ? 'Promakni' : 'Ukloni', danger: !next },
    );
    if (!ok) return;
    await runAction(
      m.uid,
      () => updateDoc(doc(db, 'profiles', m.uid), {
        isCreator: next,
        ...(next && !m.mainTopic ? { mainTopic: 'Produkcija' } : {}),
      }),
      next ? 'Korisnik je sada mentor.' : 'Mentorska prava uklonjena.',
    );
  };

  const toggleAdmin = async (m: MemberEntry) => {
    const next = !m.isAdmin;
    const ok = await confirmDialog(
      next
        ? `Dati ${m.username} PUNA ADMIN prava? Moći će mijenjati sve račune i sadržaj.`
        : `Ukloniti admin prava korisniku ${m.username}?`,
      { confirmLabel: next ? 'Daj admin prava' : 'Ukloni admin', danger: true },
    );
    if (!ok) return;
    await runAction(
      m.uid,
      () => updateDoc(doc(db, 'profiles', m.uid), { isAdmin: next }),
      next ? 'Admin prava dodijeljena.' : 'Admin prava uklonjena.',
    );
  };

  // ─── Create account (Identity Toolkit REST signUp keeps the admin signed in) ──

  const resetAddForm = () => {
    setNewEmail('');
    setNewPassword('');
    setShowPassword(false);
    setNewUsername('');
    setNewRole('user');
    setTrialDays(30);
    setNewInstagram('');
    setNewTiktok('');
    setNewYoutube('');
    setAddError(null);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    const bareName = newUsername.trim().replace(/^@+/, '');
    if (!email || !bareName) return;
    if (!USERNAME_RE.test(bareName)) {
      setAddError('Korisničko ime: 2–30 znakova, samo slova, brojke i . _ -');
      return;
    }
    const cleanUsername = `@${bareName}`;
    const existingProfile = allProfiles.find((p) => p.email.toLowerCase() === email);
    const nameTaken = allProfiles.some(
      (p) => p.uid !== existingProfile?.uid && p.username.toLowerCase() === cleanUsername.toLowerCase(),
    );
    if (nameTaken) {
      setAddError('To korisničko ime je već zauzeto.');
      return;
    }
    if (!existingProfile && newPassword.length < 8) {
      setAddError('Lozinka mora imati barem 8 znakova.');
      return;
    }

    setIsSubmitting(true);
    setAddError(null);
    try {
      let newUid = '';
      if (existingProfile) {
        newUid = existingProfile.uid;
      } else {
        const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: newPassword, returnSecureToken: false }),
        });
        const data = await response.json();
        if (!response.ok) {
          const code: string = data.error?.message || '';
          if (code.startsWith('EMAIL_EXISTS')) {
            throw new Error('Taj email je već registriran, ali nema profil. Neka se korisnik prijavi — pojavit će se na popisu "Na čekanju" pa ga aktiviraj.');
          }
          if (code.startsWith('WEAK_PASSWORD')) throw new Error('Lozinka je preslaba (barem 8 znakova).');
          if (code.startsWith('INVALID_EMAIL')) throw new Error('Email adresa nije ispravna.');
          throw new Error(code || 'Greška pri kreiranju računa.');
        }
        newUid = data.localId;
      }

      const handle = (v: string) => {
        const t = v.trim();
        return t ? (t.startsWith('@') || t.startsWith('http') ? t : `@${t}`) : '';
      };

      const profileData: Partial<UserProfile> = {
        username: cleanUsername,
        status: 'active',
        isCreator: newRole === 'creator',
        accessUntil: accessFromDays(trialDays),
        updatedAt: new Date().toISOString(),
      };
      if (newRole === 'creator' && !existingProfile?.mainTopic) profileData.mainTopic = 'Produkcija';
      if (!existingProfile) {
        profileData.uid = newUid;
        profileData.email = email;
        profileData.xp = 0;
        profileData.level = 1;
        profileData.createdAt = new Date().toISOString();
      }
      if (newInstagram.trim()) profileData.instagram = handle(newInstagram);
      if (newTiktok.trim()) profileData.tiktok = handle(newTiktok);
      if (newYoutube.trim()) profileData.youtube = newYoutube.trim();

      await setDoc(doc(db, 'profiles', newUid), profileData, { merge: true });

      setShowAddModal(false);
      resetAddForm();
      toast(
        existingProfile
          ? 'Korisnik već postoji — profil je ažuriran i aktiviran (lozinka nije promijenjena).'
          : 'Član je dodan i aktiviran. Pošalji mu email i lozinku.',
        'success',
      );
    } catch (err) {
      console.error('Add member error:', err);
      setAddError(err instanceof Error ? err.message : 'Došlo je do greške.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const statusBadge = (m: MemberEntry) => {
    if (m.status !== 'active') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">Na čekanju</span>;
    }
    if (isAccessExpired(m.accessUntil)) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/15 text-red-300 border border-red-500/30">Istekao</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Aktivan</span>;
  };

  const accessLabel = (m: MemberEntry) =>
    m.accessUntil ? `do ${formatDate(new Date(m.accessUntil).getTime())}` : 'bez ograničenja';

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
              {isAdmin && (
                <button
                  onClick={() => { resetAddForm(); setShowAddModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-[#0A0A0F] font-bold rounded-lg text-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Dodaj
                </button>
              )}
            </span>
          )}
        </div>

        {/* ── Pending accounts (admin) ── */}
        {isAdmin && !loading && !error && (
          <div className="ursa-card p-4 border-yellow-500/20 bg-yellow-500/5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">
                  Na čekanju ({pending.length})
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Registrirani računi bez pristupa — aktiviraj ih nakon uplate.
                </p>
              </div>
              {pending.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={activationDays}
                    onChange={(e) => setActivationDays(Number(e.target.value))}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    aria-label="Trajanje pristupa pri aktivaciji"
                  >
                    {ACCESS_OPTIONS.map((o) => (
                      <option key={o.days} value={o.days} className="bg-black">{o.label}</option>
                    ))}
                  </select>
                  {pendingEmails.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pendingEmails.join('; '));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 3000);
                        } catch {
                          toast('Kopiranje nije uspjelo.', 'error');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 rounded-lg font-black text-[10px] uppercase tracking-widest transition-colors whitespace-nowrap"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Kopirano!' : 'Kopiraj emailove'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {pending.length === 0 ? (
              <p className="text-sm text-white/50">Nema računa na čekanju.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {pending.map((m) => (
                  <li key={m.uid} className="flex flex-wrap items-center gap-3 py-2.5">
                    <img
                      src={avatarFor(m)}
                      alt=""
                      className="w-9 h-9 rounded-full border border-white/10 object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{m.username}</p>
                      <p className="text-[11px] text-white/50 truncate">
                        {m.email || 'bez emaila'}{m.createdMs ? ` · ${formatDate(m.createdMs)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => activate(m, activationDays)}
                        disabled={busyUid === m.uid}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-black rounded-lg text-xs font-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
                      >
                        {busyUid === m.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                        Aktiviraj
                      </button>
                      <button
                        onClick={() => setManageUid(m.uid)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors"
                        aria-label={`Upravljaj: ${m.username}`}
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!loading && !error && members.length > 6 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAdmin ? 'Traži po imenu ili emailu' : 'Traži po imenu'}
              className={`${inputCls} pl-9`}
            />
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
        ) : filteredMembers.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center p-8">Nema članova</p>
        ) : isAdmin ? (
          /* Admin: list with status + access + manage */
          <ul className="ursa-card divide-y divide-white/5 overflow-hidden">
            {filteredMembers.map((m) => (
              <li key={m.uid} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link
                  to={currentUser?.uid === m.uid ? '/profile' : `/profile/${m.uid}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  <img
                    src={avatarFor(m)}
                    alt=""
                    className="w-10 h-10 rounded-full border border-white/10 object-cover shrink-0 group-hover:border-primary/50"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-primary flex items-center gap-1.5">
                      {m.username}
                      {m.isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-label="Admin" />}
                      {m.isCreator && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-black uppercase">Mentor</span>}
                    </p>
                    <p className="text-[11px] text-white/50 truncate">{m.email}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="text-right hidden sm:block">
                    {statusBadge(m)}
                    <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" /> {accessLabel(m)}
                    </p>
                  </div>
                  <span className="sm:hidden">{statusBadge(m)}</span>
                  <button
                    onClick={() => setManageUid(m.uid)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/80 hover:text-white hover:border-primary/50 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Upravljaj
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredMembers.map((member) => (
              <Link
                key={member.uid}
                to={currentUser?.uid === member.uid ? '/profile' : `/profile/${member.uid}`}
                className="ursa-card p-4 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors group"
              >
                <img
                  src={avatarFor(member)}
                  alt={member.username}
                  className="w-14 h-14 rounded-full border border-white/10 object-cover group-hover:border-primary/50 transition-colors"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.username)}`;
                  }}
                />
                <span className="font-bold text-sm text-center truncate w-full group-hover:text-primary transition-colors">
                  {member.username}
                </span>
                <XPBadge xp={member.xp} compact />
                {member.createdMs > 0 && (
                  <span className="text-[10px] text-muted-foreground">{formatDate(member.createdMs)}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Manage member (admin) ── */}
      {isAdmin && managed && (
        <ManageMemberModal
          member={managed}
          isSelf={managed.uid === currentUser?.uid}
          busy={busyUid === managed.uid}
          onClose={() => setManageUid(null)}
          onActivate={(days) => activate(managed, days)}
          onDeactivate={() => deactivate(managed)}
          onSetAccess={(v) => setAccessUntil(managed, v)}
          onExtend={(days) => extendAccess(managed, days)}
          onToggleCreator={() => toggleCreator(managed)}
          onToggleAdmin={() => toggleAdmin(managed)}
          statusBadge={statusBadge(managed)}
          accessLabel={accessLabel(managed)}
        />
      )}

      {/* ── Create account (admin) ── */}
      {isAdmin && showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
              aria-label="Zatvori"
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
                  onChange={(e) => setNewUsername(e.target.value)}
                  className={inputCls}
                  placeholder="npr. ivan_horvat"
                  maxLength={31}
                  required
                />
                <p className="text-xs text-white/40 mt-1">2–30 znakova: slova, brojke i . _ - (bez razmaka)</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Email adresa</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputCls}
                  placeholder="ivan@example.com"
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Lozinka</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputCls} pr-11`}
                    placeholder="Barem 8 znakova"
                    autoComplete="new-password"
                    minLength={8}
                    required={!allProfiles.some((p) => p.email.toLowerCase() === newEmail.trim().toLowerCase())}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/50 hover:text-white"
                    aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Uloga</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'user' | 'creator')}
                  className={inputCls}
                >
                  <option value="user" className="bg-black">Obični korisnik</option>
                  <option value="creator" className="bg-black">Kreator / mentor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Pristup</label>
                <select
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className={inputCls}
                >
                  {ACCESS_OPTIONS.map((o) => (
                    <option key={o.days} value={o.days} className="bg-black">{o.label}</option>
                  ))}
                </select>
                <p className="text-xs text-white/40 mt-1">Nakon isteka korisnik gubi pristup (možeš ga produljiti kasnije).</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">Instagram (opcionalno)</label>
                <input type="text" value={newInstagram} onChange={(e) => setNewInstagram(e.target.value)} className={inputCls} placeholder="@username" />
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">TikTok (opcionalno)</label>
                <input type="text" value={newTiktok} onChange={(e) => setNewTiktok(e.target.value)} className={inputCls} placeholder="@username" />
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">YouTube (opcionalno)</label>
                <input type="text" value={newYoutube} onChange={(e) => setNewYoutube(e.target.value)} className={inputCls} placeholder="Kanal link ili handle" />
              </div>

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

interface ManageMemberModalProps {
  member: MemberEntry;
  isSelf: boolean;
  busy: boolean;
  onClose: () => void;
  onActivate: (days: number) => void;
  onDeactivate: () => void;
  onSetAccess: (value: string | null) => void;
  onExtend: (days: number) => void;
  onToggleCreator: () => void;
  onToggleAdmin: () => void;
  statusBadge: React.ReactNode;
  accessLabel: string;
}

function ManageMemberModal({
  member: m, isSelf, busy, onClose, onActivate, onDeactivate, onSetAccess, onExtend,
  onToggleCreator, onToggleAdmin, statusBadge, accessLabel,
}: ManageMemberModalProps) {
  const [days, setDays] = useState(30);
  const [dateValue, setDateValue] = useState('');
  const emailAdmin = isAdminEmail(m.email);

  useEffect(() => {
    setDateValue(m.accessUntil ? m.accessUntil.slice(0, 10) : '');
  }, [m.accessUntil]);

  const btn = 'px-3 py-2 rounded-xl text-xs font-black transition-colors disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white" aria-label="Zatvori">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <img src={avatarFor(m)} alt="" className="w-12 h-12 rounded-full border border-white/10 object-cover" />
          <div className="min-w-0">
            <p className="font-black text-white truncate">{m.username}</p>
            <p className="text-xs text-white/50 truncate">{m.email || 'bez emaila'}</p>
            <p className="text-[11px] text-white/40">Registriran: {formatDate(m.createdMs) || 'nepoznato'}</p>
          </div>
        </div>

        {/* Status */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-white/60">Status</span>
            {statusBadge}
          </div>
          {isSelf ? (
            <p className="text-xs text-white/40">Ne možeš mijenjati status vlastitog računa.</p>
          ) : m.status === 'active' ? (
            <button onClick={onDeactivate} disabled={busy} className={`${btn} w-full bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 flex items-center justify-center gap-2`}>
              <UserX className="w-4 h-4" /> Deaktiviraj
            </button>
          ) : (
            <div className="flex gap-2">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                aria-label="Trajanje pristupa"
              >
                {ACCESS_OPTIONS.map((o) => (
                  <option key={o.days} value={o.days} className="bg-black">{o.label}</option>
                ))}
              </select>
              <button onClick={() => onActivate(days)} disabled={busy} className={`${btn} bg-emerald-500 text-black hover:bg-emerald-400 flex items-center gap-2`}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />} Aktiviraj
              </button>
            </div>
          )}
        </section>

        {/* Access until */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-white/60">Pristup</span>
            <span className="text-xs font-bold text-white">{accessLabel}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onExtend(30)} disabled={busy} className={`${btn} bg-white/5 border border-white/10 text-white hover:border-primary/50`}>+30 dana</button>
            <button onClick={() => onExtend(90)} disabled={busy} className={`${btn} bg-white/5 border border-white/10 text-white hover:border-primary/50`}>+90 dana</button>
            <button onClick={() => onSetAccess(null)} disabled={busy || !m.accessUntil} className={`${btn} bg-white/5 border border-white/10 text-white hover:border-primary/50`}>Bez ograničenja</button>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
              aria-label="Pristup vrijedi do"
            />
            <button
              onClick={() => {
                if (!dateValue) { toast('Odaberi datum.', 'error'); return; }
                // End of the chosen day, local time
                const d = new Date(`${dateValue}T23:59:59`);
                if (isNaN(d.getTime())) { toast('Datum nije ispravan.', 'error'); return; }
                onSetAccess(d.toISOString());
              }}
              disabled={busy}
              className={`${btn} bg-primary text-black hover:bg-primary/90`}
            >
              Spremi datum
            </button>
          </div>
          {m.status !== 'active' && (
            <p className="text-[11px] text-yellow-300/80">Račun je na čekanju — datum vrijedi tek nakon aktivacije.</p>
          )}
        </section>

        {/* Roles */}
        <section className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-white/60">Uloge</span>
          <button
            onClick={onToggleCreator}
            disabled={busy}
            className={`${btn} w-full ${m.isCreator ? 'bg-red-500/15 border border-red-500/30 text-red-300' : 'bg-primary/15 border border-primary/30 text-primary'}`}
          >
            {m.isCreator ? 'Ukloni mentor status' : 'Promakni u mentora'}
          </button>
          {emailAdmin ? (
            <p className="text-[11px] text-white/40">Glavni admin (po emailu) — admin prava se ne mogu ukloniti ovdje.</p>
          ) : isSelf ? (
            <p className="text-[11px] text-white/40">Ne možeš mijenjati vlastita admin prava.</p>
          ) : (
            <button
              onClick={onToggleAdmin}
              disabled={busy}
              className={`${btn} w-full ${m.isAdmin ? 'bg-red-500/15 border border-red-500/30 text-red-300' : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'} flex items-center justify-center gap-2`}
            >
              <ShieldCheck className="w-4 h-4" />
              {m.isAdmin ? 'Ukloni admin prava' : 'Daj admin prava'}
            </button>
          )}
        </section>

        <Link to={isSelf ? '/profile' : `/profile/${m.uid}`} className="block text-center text-xs font-bold text-primary hover:underline">
          Otvori profil
        </Link>
      </div>
    </div>
  );
}
