import { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, Plus, Link2, Heart, Shield, X, Clock, Sparkles, Trash2, Award, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import CommunityTabs from '../components/layout/CommunityTabs';
import { db } from '../lib/firebase';
import { sendBroadcastNotification } from '../lib/notifications';
import {
  collection, onSnapshot, updateDoc, doc, serverTimestamp, deleteDoc, addDoc, getDocs,
  query, where, writeBatch, arrayUnion, arrayRemove, increment,
} from 'firebase/firestore';
import { toast, confirmDialog } from '../lib/dialog';
import { safeUrl } from '../lib/media';

interface Challenge {
  id: string;
  title: string;
  description: string;
  deadline: string;
  exampleText?: string;
  xpReward: number;
  active: boolean;
  createdAt: any;
  pinnedSubmissionId?: string | null;
  winnerName?: string | null;
  winnerId?: string | null;
}

interface Submission {
  id: string;
  challengeId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  videoLink: string;
  description: string;
  likes: string[];
  likeCount: number;
  isPinned?: boolean;
  createdAt: any;
}

function getDaysRemaining(deadline: string): number {
  if (!deadline) return 0;
  const end = new Date(deadline);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// Firestore Timestamp | ISO string | pending serverTimestamp (null) → millis
const toMillis = (v: any): number => {
  if (!v) return Date.now();
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'string') return Date.parse(v) || 0;
  return 0;
};

const errorCode = (err: unknown) => (err as { code?: string })?.code || '';

const avatarFor = (sub: Submission) =>
  safeUrl(sub.authorAvatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sub.authorId || sub.id)}`;

export default function Challenge() {
  const { profile, updateLocalProfile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightedWinnerId = searchParams.get('winnerId');

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // UI state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const likeBusyRef = useRef<Set<string>>(new Set());

  // Submission form
  const [videoLink, setVideoLink] = useState('');
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin form
  const [adminTitle, setAdminTitle] = useState('');
  const [adminDesc, setAdminDesc] = useState('');
  const [adminExample, setAdminExample] = useState('');
  const [adminXp, setAdminXp] = useState(50);
  const [adminDays, setAdminDays] = useState(7);
  const [adminCreating, setAdminCreating] = useState(false);

  const winnerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'challenges'),
      snap => {
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Challenge))
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setChallenges(items);
        setLoadError(null);
        setLoading(false);
      },
      err => {
        console.error('[Challenges] Challenges listener failed:', err);
        setLoadError(errorCode(err) === 'permission-denied'
          ? 'Izazovi su dostupni samo aktivnim članovima.'
          : 'Izazovi se nisu mogli učitati. Provjeri vezu i osvježi stranicu.');
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'challengeSubmissions'),
      snap => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission))),
      err => {
        console.error('[Challenges] Submissions listener failed:', err);
        toast('Prijave na izazove se nisu mogle učitati.', 'error');
      },
    );
    return unsub;
  }, []);

  // The newest active challenge is "the" active one
  const activeChallenge = useMemo(() => challenges.find(c => c.active) || null, [challenges]);

  useEffect(() => {
    if (highlightedWinnerId && winnerRef.current) {
      winnerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedWinnerId, submissions]);

  const handleSubmit = async () => {
    if (!user || !activeChallenge || submitting) return;
    const link = safeUrl(videoLink.trim());
    if (!link) {
      toast('Upiši ispravan link na video (mora počinjati s https://).', 'error');
      return;
    }
    if (activeChallenge.deadline && new Date(activeChallenge.deadline).getTime() < Date.now()) {
      toast('Rok za ovaj izazov je istekao.', 'info');
      return;
    }
    setSubmitting(true);
    try {
      // XP only for the first submission of this user to this challenge
      const prior = await getDocs(query(
        collection(db, 'challengeSubmissions'),
        where('challengeId', '==', activeChallenge.id),
        where('authorId', '==', user.uid),
      ));
      const firstSubmission = prior.empty;

      await addDoc(collection(db, 'challengeSubmissions'), {
        challengeId: activeChallenge.id,
        authorId: user.uid,
        authorName: profile?.username || 'Korisnik',
        authorAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        videoLink: link,
        description: submitDesc.trim(),
        likes: [],
        likeCount: 0,
        isPinned: false,
        createdAt: serverTimestamp(),
      });

      const reward = activeChallenge.xpReward || 50;
      if (firstSubmission && profile) {
        updateLocalProfile({ xp: (profile.xp || 0) + Math.min(reward, 500) });
        setXpAwarded(reward);
        setTimeout(() => setXpAwarded(null), 4000);
        toast(`Video prijava je poslana! +${reward} XP`, 'success');
      } else {
        toast('Video prijava je poslana! (XP se dodjeljuje samo za prvu prijavu na izazov.)', 'success');
      }
      setVideoLink('');
      setSubmitDesc('');
      setShowSubmitForm(false);
    } catch (err) {
      console.error('[Challenges] Submit failed:', err);
      toast(errorCode(err) === 'permission-denied'
        ? 'Nemaš dopuštenje za slanje prijave (link mora počinjati s https://).'
        : 'Slanje prijave nije uspjelo. Pokušaj ponovno.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Likes: only my own uid is added/removed and the counter moves by one (firestore.rules)
  const handleLike = async (sub: Submission) => {
    if (!user || likeBusyRef.current.has(sub.id)) return;
    const liked = !!sub.likes?.includes(user.uid);
    likeBusyRef.current.add(sub.id);
    try {
      await updateDoc(doc(db, 'challengeSubmissions', sub.id), {
        likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likeCount: increment(liked ? -1 : 1),
      });
    } catch (err) {
      console.error('[Challenges] Like failed:', err);
      toast('Lajk nije spremljen. Pokušaj ponovno.', 'error');
    } finally {
      likeBusyRef.current.delete(sub.id);
    }
  };

  // 1. OZNAČI KAO POBJEDNIKA + BROADCAST NOTIFICATION
  const handlePin = async (sub: Submission) => {
    if (!profile?.isAdmin || !activeChallenge || pinBusy) return;
    const willPin = !sub.isPinned;
    setPinBusy(true);
    try {
      // Only the isPinned flag is written on submissions
      const batch = writeBatch(db);
      if (willPin) {
        submissions
          .filter(s => s.challengeId === activeChallenge.id && s.isPinned && s.id !== sub.id)
          .forEach(s => batch.update(doc(db, 'challengeSubmissions', s.id), { isPinned: false }));
      }
      batch.update(doc(db, 'challengeSubmissions', sub.id), { isPinned: willPin });
      batch.update(doc(db, 'challenges', activeChallenge.id), {
        pinnedSubmissionId: willPin ? sub.id : null,
        winnerName: willPin ? sub.authorName : null,
        winnerId: willPin ? sub.authorId : null,
      });
      await batch.commit();
    } catch (err) {
      console.error('[Challenges] Pin failed:', err);
      toast('Označavanje pobjednika nije uspjelo. Pokušaj ponovno.', 'error');
      return;
    } finally {
      setPinBusy(false);
    }

    if (willPin) {
      await sendBroadcastNotification({
        senderId: user?.uid || 'admin',
        senderName: profile?.username || 'Mentor Ismael',
        senderAvatar: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor',
        type: 'challenge_winner',
        message: `🏆 ${sub.authorName} je proglašen/a pobjednikom izazova "${activeChallenge.title}"! Pogledaj pobjednički video rad.`,
        link: `/challenge?winnerId=${sub.id}`,
      });
      toast(`🏆 ${sub.authorName} je označen/a kao pobjednik! Obavijest je poslana polaznicima.`, 'success');
    } else {
      toast('Oznaka pobjednika je uklonjena.', 'info');
    }
  };

  // 2. KREIRAJ NOVI CHALLENGE (deactivates the previous ones in the same batch)
  const handleCreateChallenge = async () => {
    if (!profile?.isAdmin || adminCreating) return;
    const title = adminTitle.trim();
    const description = adminDesc.trim();
    if (!title || !description) {
      toast('Upiši naslov i opis izazova.', 'error');
      return;
    }
    setAdminCreating(true);
    try {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + adminDays);
      deadlineDate.setHours(23, 59, 59, 0);

      const batch = writeBatch(db);
      challenges
        .filter(c => c.active)
        .forEach(c => batch.update(doc(db, 'challenges', c.id), { active: false }));
      batch.set(doc(collection(db, 'challenges')), {
        title,
        description,
        exampleText: adminExample.trim(),
        xpReward: adminXp,
        deadline: deadlineDate.toISOString(),
        active: true,
        createdAt: serverTimestamp(),
      });
      await batch.commit();

      setAdminTitle('');
      setAdminDesc('');
      setAdminExample('');
      setAdminXp(50);
      setAdminDays(7);
      setShowAdminForm(false);
      toast('⚡ Novi izazov je kreiran i postavljen kao aktivan!', 'success');

      await sendBroadcastNotification({
        senderId: user?.uid || 'admin',
        senderName: profile?.username || 'Mentor Ismael',
        senderAvatar: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor',
        type: 'new_challenge',
        message: `⚡ Novi Izazov Tjedna je aktivan: "${title}" (+${adminXp} XP)! Sudjeluj i osvoji nagrade.`,
        link: '/challenge',
      });
    } catch (err) {
      console.error('[Challenges] Create challenge failed:', err);
      toast('Kreiranje izazova nije uspjelo. Pokušaj ponovno.', 'error');
    } finally {
      setAdminCreating(false);
    }
  };

  // 3. AKTIVIRAJ PONOVO: becomes the only active challenge for another 7 days
  const handleReactivateChallenge = async (c: Challenge) => {
    if (!profile?.isAdmin) return;
    try {
      const newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + 7);
      newDeadline.setHours(23, 59, 59, 0);

      const batch = writeBatch(db);
      challenges
        .filter(ch => ch.active && ch.id !== c.id)
        .forEach(ch => batch.update(doc(db, 'challenges', ch.id), { active: false }));
      batch.update(doc(db, 'challenges', c.id), {
        active: true,
        deadline: newDeadline.toISOString(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      toast(`⚡ Izazov "${c.title}" je sada aktivni izazov tjedna (7 dana do kraja)!`, 'success');

      await sendBroadcastNotification({
        senderId: user?.uid || 'admin',
        senderName: profile?.username || 'Mentor Ismael',
        senderAvatar: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor',
        type: 'new_challenge',
        message: `⚡ Izazov je ponovno aktivan: "${c.title}" (+${c.xpReward || 50} XP)! Prijavi svoj video rad (7 dana do kraja).`,
        link: '/challenge',
      });
    } catch (err) {
      console.error('[Challenges] Reactivate failed:', err);
      toast('Aktivacija izazova nije uspjela. Pokušaj ponovno.', 'error');
    }
  };

  const handleDeactivateChallenge = async (c: Challenge) => {
    if (!profile?.isAdmin) return;
    const ok = await confirmDialog(`Završiti izazov "${c.title}"? Prebacit će se u prošle izazove.`, { confirmLabel: 'Završi' });
    if (!ok) return;
    try {
      await updateDoc(doc(db, 'challenges', c.id), { active: false });
      toast('Izazov je završen i prebačen u prošle izazove.', 'info');
    } catch (err) {
      console.error('[Challenges] Deactivate failed:', err);
      toast('Završavanje izazova nije uspjelo.', 'error');
    }
  };

  const handleDeleteChallenge = async (c: Challenge) => {
    if (!profile?.isAdmin) return;
    const ok = await confirmDialog(
      `Trajno obrisati izazov "${c.title}" i sve njegove prijave? Ovo se ne može poništiti.`,
      { confirmLabel: 'Obriši', danger: true },
    );
    if (!ok) return;
    try {
      const subs = submissions.filter(s => s.challengeId === c.id);
      for (let i = 0; i < subs.length; i += 400) {
        const batch = writeBatch(db);
        subs.slice(i, i + 400).forEach(s => batch.delete(doc(db, 'challengeSubmissions', s.id)));
        await batch.commit();
      }
      await deleteDoc(doc(db, 'challenges', c.id));
      toast('Izazov je obrisan.', 'success');
    } catch (err) {
      console.error('[Challenges] Delete failed:', err);
      toast('Brisanje izazova nije uspjelo.', 'error');
    }
  };

  const loadExampleTemplate = () => {
    setAdminTitle('Snimi 3 različita hooka za isti proizvod');
    setAdminDesc('Cilj je vježbati uvodne 3 sekunde. Snimi tri potpuno različita pristupa (Vizualni šok, Statistički hook, Emocionalni hook) i postavi poveznicu na video.');
    setAdminExample('Pogledaj lekciju 1 o hookovima za inspiraciju. Svaki hook mora imati drugačiju energiju i kut snimanja!');
    setAdminXp(50);
    setAdminDays(7);
  };

  const activeSubs = submissions
    .filter(s => activeChallenge && s.challengeId === activeChallenge.id)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.likeCount || 0) - (a.likeCount || 0);
    });

  const winnerSub = activeSubs.find(s => s.isPinned);
  const winnerLink = winnerSub ? safeUrl(winnerSub.videoLink) : null;
  const previousChallenges = challenges.filter(c => c.id !== activeChallenge?.id);
  const videoLinkValid = !videoLink.trim() || !!safeUrl(videoLink.trim());
  const alreadySubmitted = !!user && !!activeChallenge &&
    submissions.some(s => s.challengeId === activeChallenge.id && s.authorId === user.uid);

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden pb-[80px]">
      {/* Community Header Tabs */}
      <CommunityTabs />

      {/* HEADER TITLE */}
      <div className="pt-2 px-[16px] flex items-center justify-between gap-3 mb-4">
        <div className="text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-bold uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>Tjedni Zadaci & Pobjednici</span>
          </div>
          <h1 className="font-heading font-[800] text-[24px] text-[#FFFFFF] leading-[1.1] uppercase">
            IZAZOVI <span className="text-primary">ZA KREATORE</span>
          </h1>
          <p className="font-sans text-[13px] text-[#8B8FA8]">
            {profile?.isAdmin 
              ? 'Kreiraj izazove, ocijeni radove i odaberi službenog pobjednika koji dobiva obavijest za cijelu zajednicu.' 
              : 'Pokaži svoje vještine, pošalji video i osvoji XP bodove i priznanje pobjednika.'}
          </p>
        </div>

        {profile?.isAdmin && (
          <button
            onClick={() => setShowAdminForm(v => !v)}
            className="px-4 py-2.5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:scale-105 transition-transform flex items-center gap-1.5 shrink-0 shadow-lg shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novi Izazov</span>
          </button>
        )}
      </div>

      <div className="px-[16px] flex flex-col gap-5">

        {/* LOAD ERROR */}
        {loadError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 flex items-start gap-3 text-red-200 text-[13px] text-left">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{loadError}</span>
          </div>
        )}

        {/* XP TOAST */}
        {xpAwarded !== null && (
          <div className="text-center py-2 bg-primary/15 border border-primary/30 text-primary rounded-full font-mono font-bold text-[11px] uppercase tracking-widest animate-pulse">
            🎉 +{xpAwarded} XP dodano na vaš profil! Odlična video prijava!
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ADMIN CREATE CHALLENGE FORM */}
        {!loading && !loadError && profile?.isAdmin && (showAdminForm || !activeChallenge) && (
          <div className="bg-[#151E30] rounded-[24px] border border-primary/30 p-6 shadow-xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="flex items-center gap-2 text-primary font-heading font-black text-sm uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                Kreiraj Novi Challenge za Polaznike
              </span>
              <button
                type="button"
                onClick={loadExampleTemplate}
                className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full hover:bg-amber-500/25 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Primjer: 3 Hooka (7 dana)
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-1">
                  Naslov challengea *
                </label>
                <input
                  value={adminTitle}
                  onChange={e => setAdminTitle(e.target.value)}
                  placeholder="npr. Snimi 3 različita hooka za isti proizvod..."
                  className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#3B82F6] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-1">
                  Opis / Upute za polaznike *
                </label>
                <textarea
                  value={adminDesc}
                  onChange={e => setAdminDesc(e.target.value)}
                  rows={3}
                  placeholder="Detaljno objasni što točno kreatori trebaju snimiti i napraviti..."
                  className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#3B82F6] focus:outline-none transition-colors resize-none text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-1">
                  Inspiracija / Primjer (opcionalno)
                </label>
                <input
                  value={adminExample}
                  onChange={e => setAdminExample(e.target.value)}
                  placeholder="npr. Pogledaj lekciju 1 o hookovima za inspiraciju..."
                  className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#3B82F6] focus:outline-none transition-colors text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">
                    Trajanje izazova
                  </label>
                  <div className="flex gap-2">
                    {[3, 7, 14, 30].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setAdminDays(days)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors border cursor-pointer ${
                          adminDays === days
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white/5 border-white/5 text-[#8B8FA8] hover:bg-white/10'
                        }`}
                      >
                        {days} dana
                      </button>
                    ))}
                  </div>
                </div>

                {/* XP Reward */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">
                    XP Nagrada za polaznika
                  </label>
                  <div className="flex gap-2">
                    {[25, 50, 100, 200].map(xp => (
                      <button
                        key={xp}
                        type="button"
                        onClick={() => setAdminXp(xp)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors border cursor-pointer ${
                          adminXp === xp
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white/5 border-white/5 text-[#8B8FA8] hover:bg-white/10'
                        }`}
                      >
                        +{xp} XP
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {activeChallenge && (
                  <button
                    type="button"
                    onClick={() => setShowAdminForm(false)}
                    className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-full font-heading font-black text-xs uppercase hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Odustani
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCreateChallenge}
                  disabled={!adminTitle.trim() || adminCreating}
                  className="w-full py-3.5 bg-primary text-white font-heading font-black text-sm rounded-full uppercase hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-50 shadow-xl shadow-primary/20 cursor-pointer"
                >
                  {adminCreating ? 'OBJAVLJUJEM...' : 'OBJAVI NOVI CHALLENGE I OBAVIJESTI ČLANOVE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE CHALLENGE HERO */}
        {loading || loadError ? null : activeChallenge ? (
          <div
            className="rounded-[24px] p-[24px] relative overflow-hidden text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.03) 60%), #151E30',
              border: '1px solid rgba(59,130,246,0.3)',
              boxShadow: '0 0 40px rgba(59,130,246,0.08)',
            }}
          >
            {/* Left accent */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[24px]"
              style={{ background: '#3B82F6', boxShadow: '0 0 20px rgba(59,130,246,0.7)' }} />

            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(59,130,246,0.15)' }}>
                  <Trophy className="w-6 h-6 text-[#3B82F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[#3B82F6] text-[9.5px] font-bold uppercase tracking-[0.2em] block mb-1">
                    Aktivni Challenge Tjedna
                  </span>
                  <h2 className="font-heading font-[800] text-[20px] md:text-[22px] text-white leading-tight">
                    {activeChallenge.title}
                  </h2>
                </div>
              </div>

              {profile?.isAdmin && (
                <button
                  onClick={() => handleDeactivateChallenge(activeChallenge)}
                  className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg hover:bg-red-500/20 transition-colors shrink-0 cursor-pointer"
                  title="Završi i prebaci u prošle izazove"
                >
                  Završi
                </button>
              )}
            </div>

            <p className="font-sans text-[14px] text-[rgba(255,255,255,0.75)] leading-relaxed mb-4">
              {activeChallenge.description}
            </p>

            {activeChallenge.exampleText && (
              <div className="bg-[rgba(255,255,255,0.04)] rounded-[14px] p-4 mb-4 border border-[rgba(255,255,255,0.06)]">
                <span className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest block mb-1">Inspiracija & Savjet</span>
                <p className="font-sans text-[13px] text-white/70 italic">{activeChallenge.exampleText}</p>
              </div>
            )}

            {/* If there is an official winner, showcase winner banner right in the challenge hero! */}
            {winnerSub && (
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/5 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 block">Službeni Pobjednik Izazova</span>
                    <p className="font-heading font-black text-sm text-white">{winnerSub.authorName}</p>
                  </div>
                </div>
                {winnerLink && (
                  <a
                    href={winnerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-black font-black text-[11px] uppercase rounded-full hover:scale-105 transition-transform shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pogledaj Video
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(255,255,255,0.06)] rounded-full">
                  <Clock className="w-3.5 h-3.5 text-[#8B8FA8]" />
                  <span className="font-mono text-[11px] text-[#8B8FA8]">
                    {getDaysRemaining(activeChallenge.deadline)} dana do kraja
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-[#3B82F6]/20 rounded-full">
                  <span className="font-mono font-bold text-[11px] text-[#3B82F6]">+{activeChallenge.xpReward || 50} XP</span>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitForm(v => !v)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] text-white rounded-full font-heading font-[800] text-[13px] uppercase hover:scale-[1.03] active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Pošalji Rad
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#151E30] rounded-[24px] border border-[rgba(255,255,255,0.06)] p-10 text-center space-y-3">
            <Trophy className="w-12 h-12 text-[#4A4A5A] mx-auto opacity-50" />
            <p className="text-[#8B8FA8] text-[15px] font-heading font-bold">Trenutno nema aktivnog challengea</p>
            <p className="text-[#4A4A5A] text-[13px]">
              {profile?.isAdmin 
                ? 'Kliknite na "Aktiviraj ponovo" na nekom od prošlih izazova ili kreirajte novi!' 
                : 'Admin uskoro objavljuje novi tjedni izazov!'}
            </p>
          </div>
        )}

        {/* SUBMIT FORM */}
        {showSubmitForm && activeChallenge && (
          <div className="bg-[#151E30] rounded-[24px] border border-[rgba(59,130,246,0.2)] p-[20px] flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-[800] text-[15px] text-white uppercase">Pošalji svoju prijavu</h3>
              <button onClick={() => setShowSubmitForm(false)} className="text-[#8B8FA8] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">
                Poveznica na video (TikTok / Instagram Reel / YouTube / Loom) *
              </label>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A5A]" />
                <input
                  value={videoLink}
                  onChange={e => setVideoLink(e.target.value)}
                  placeholder="https://tiktok.com/@korisnik/video/..."
                  inputMode="url"
                  className={`w-full bg-[#0E1420] border rounded-[14px] py-3 pl-11 pr-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#3B82F6] focus:outline-none transition-colors ${
                    videoLinkValid ? 'border-[rgba(255,255,255,0.08)]' : 'border-red-500/60'
                  }`}
                />
              </div>
              {!videoLinkValid && (
                <p className="mt-1.5 text-[11px] text-red-400">Link mora počinjati s https:// (npr. https://www.tiktok.com/…).</p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">
                Kratke bilješke o uratku
              </label>
              <textarea
                value={submitDesc}
                onChange={e => setSubmitDesc(e.target.value)}
                placeholder="Napiši što si isprobao, koji su hookovi korišteni i kako je prošlo..."
                rows={3}
                className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#3B82F6] focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!videoLink.trim() || !videoLinkValid || submitting}
              className="w-full py-3.5 bg-[#3B82F6] text-white font-heading font-[800] text-[14px] rounded-full uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              {submitting
                ? 'ŠALJEM PRIJAVU...'
                : alreadySubmitted
                  ? 'POŠALJI JOŠ JEDAN RAD'
                  : `SUBMITTAJ RAD (+${activeChallenge.xpReward || 50} XP)`}
            </button>
          </div>
        )}

        {/* SUBMISSIONS LIST */}
        {activeChallenge && (
          <div className="text-left">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8B8FA8] mb-3">
              Prijave članova zajednice ({activeSubs.length})
            </h3>
            {activeSubs.length === 0 ? (
              <div className="bg-[#151E30] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-8 text-center">
                <p className="text-[#4A4A5A] text-[13px]">Budi prvi koji šalje prijavu za ovaj challenge!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeSubs.map(sub => {
                  const isHighlighted = highlightedWinnerId === sub.id;
                  return (
                    <div
                      key={sub.id}
                      ref={sub.isPinned || isHighlighted ? winnerRef : null}
                      className={`rounded-[20px] p-5 flex flex-col gap-3 transition-all duration-300 ${
                        sub.isPinned
                          ? 'border-2 border-amber-400/80 bg-gradient-to-br from-amber-500/15 via-[#151E30] to-[#151E30] shadow-xl shadow-amber-500/10'
                          : isHighlighted
                          ? 'border-2 border-primary bg-primary/10 shadow-xl'
                          : 'bg-[#151E30] border border-[rgba(255,255,255,0.06)]'
                      }`}
                    >
                      {sub.isPinned && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-400 animate-bounce" />
                            <span className="font-heading font-black text-[12px] text-amber-300 uppercase tracking-wider">
                              🏆 Službeni Pobjednik Izazova
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-amber-300/80 bg-amber-400/20 px-2 py-0.5 rounded-full">
                            TOP RAD
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <img
                          src={avatarFor(sub)}
                          alt={sub.authorName}
                          className={`w-10 h-10 rounded-full border object-cover ${
                            sub.isPinned ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-white/10'
                          }`}
                        />
                        <div>
                          <p className="font-sans font-bold text-[14px] text-white flex items-center gap-1.5">
                            {sub.authorName}
                            {sub.isPinned && <CheckCircle className="w-4 h-4 text-amber-400 inline" />}
                          </p>
                          {sub.description && (
                            <p className="font-sans text-[12px] text-[#8B8FA8] mt-0.5">{sub.description}</p>
                          )}
                        </div>
                      </div>

                      {safeUrl(sub.videoLink) ? (
                        <a
                          href={safeUrl(sub.videoLink)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[13px] text-[#3B82F6] font-bold hover:underline truncate bg-white/5 px-3 py-2 rounded-xl"
                        >
                          <Link2 className="w-4 h-4 shrink-0 text-primary" />
                          <span className="truncate">{sub.videoLink}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-2 text-[13px] text-[#8B8FA8] bg-white/5 px-3 py-2 rounded-xl">
                          <Link2 className="w-4 h-4 shrink-0" />
                          Neispravan link
                        </span>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                        <button
                          onClick={() => handleLike(sub)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                            user && sub.likes?.includes(user.uid)
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-red-500/10 hover:text-red-400'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${user && sub.likes?.includes(user.uid) ? 'fill-current' : ''}`} />
                          {Math.max(0, sub.likeCount || 0)}
                        </button>

                        {profile?.isAdmin && (
                          <button
                            onClick={() => handlePin(sub)}
                            disabled={pinBusy}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-heading font-black uppercase tracking-wider transition-all ml-auto cursor-pointer shadow-md disabled:opacity-50 ${
                              sub.isPinned
                                ? 'bg-amber-400 text-black hover:bg-amber-300'
                                : 'bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white'
                            }`}
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            {sub.isPinned ? 'Pobjednik (Ukloni)' : 'Označi kao pobjednika'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PREVIOUS CHALLENGES */}
        {previousChallenges.length > 0 && (
          <div className="text-left pt-4 border-t border-white/5">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8B8FA8] mb-3">
              Prošli Izazovi ({previousChallenges.length})
            </h3>
            <div className="flex flex-col gap-2.5">
              {previousChallenges.map(c => (
                <div 
                  key={c.id} 
                  className="bg-[#151E30] rounded-[18px] border border-[rgba(255,255,255,0.05)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition-colors"
                >
                  <div>
                    <p className="font-heading font-[700] text-[15px] text-white leading-tight">{c.title}</p>
                    <p className="font-sans text-[12px] text-[#8B8FA8] mt-1">
                      {submissions.filter(s => s.challengeId === c.id).length} prijava • +{c.xpReward} XP
                      {c.winnerName && (
                        <span className="text-amber-400 ml-2 font-bold">🏆 Pobjednik: {c.winnerName}</span>
                      )}
                    </p>
                  </div>

                  {profile?.isAdmin && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleReactivateChallenge(c)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-white hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20 cursor-pointer"
                        title="Aktiviraj ovaj izazov ponovno (postaje trenutni aktivni izazov za sve)"
                      >
                        ⚡ Aktiviraj ponovo
                      </button>
                      <button
                        onClick={() => handleDeleteChallenge(c)}
                        className="p-2 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Obriši trajno"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
