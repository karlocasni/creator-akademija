import { useState, useEffect, useRef } from 'react';
import { Trophy, Plus, Link2, Heart, Shield, X, Clock, Sparkles, Trash2, Award, ExternalLink, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CommunityTabs from '../components/layout/CommunityTabs';
import { db } from '../lib/firebase';
import { sendBroadcastNotification } from '../lib/notifications';
import {
  collection, addDoc, setDoc, onSnapshot, updateDoc, doc, serverTimestamp, deleteDoc
} from 'firebase/firestore';

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

export default function Challenge() {
  const { profile, updateLocalProfile, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedWinnerId = searchParams.get('winnerId');

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  // UI state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    const unsub = onSnapshot(collection(db, 'challenges'), snap => {
      if (snap.empty) {
        const stored = localStorage.getItem('creator_mock_challenges');
        if (stored) {
          try {
            const items = JSON.parse(stored) as Challenge[];
            setChallenges(items);
            const active = items.find(c => c.active) || null;
            setActiveChallenge(active);
            return;
          } catch (_) {}
        }
        import('../lib/firebase-mock').then(({ SEED_CHALLENGES }) => {
          const items = SEED_CHALLENGES as unknown as Challenge[];
          setChallenges(items);
          const active = items.find(c => c.active) || null;
          setActiveChallenge(active);
        });
      } else {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
        setChallenges(items);
        const active = items.find(c => c.active) || null;
        setActiveChallenge(active);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'challengeSubmissions'), snap => {
      if (snap.empty) {
        const stored = localStorage.getItem('creator_mock_challenge_submissions');
        if (stored) {
          try {
            setSubmissions(JSON.parse(stored));
            return;
          } catch (_) {}
        }
        import('../lib/firebase-mock').then(({ SEED_CHALLENGE_SUBMISSIONS }) => {
          setSubmissions(SEED_CHALLENGE_SUBMISSIONS as Submission[]);
        });
      } else {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
        setSubmissions(items);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (highlightedWinnerId && winnerRef.current) {
      winnerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedWinnerId, submissions]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSubmit = async () => {
    if (!videoLink.trim() || !user || !activeChallenge || submitting) return;
    setSubmitting(true);
    try {
      const newSub = {
        challengeId: activeChallenge.id,
        authorId: user.uid,
        authorName: profile?.username || 'Korisnik',
        authorAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        videoLink: videoLink.trim(),
        description: submitDesc.trim(),
        likes: [],
        likeCount: 0,
        isPinned: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'challengeSubmissions'), newSub);
      
      const createdItem: Submission = {
        id: docRef.id,
        ...newSub,
        createdAt: new Date().toISOString(),
      };

      setSubmissions(prev => {
        const next = [createdItem, ...prev];
        try { localStorage.setItem('creator_mock_challenge_submissions', JSON.stringify(next)); } catch (_) {}
        return next;
      });

      if (profile) {
        updateLocalProfile({ xp: (profile.xp || 0) + (activeChallenge.xpReward || 50) });
      }
      setXpAwarded(true);
      setTimeout(() => setXpAwarded(false), 3000);
      setVideoLink('');
      setSubmitDesc('');
      setShowSubmitForm(false);
      showToast('🎉 Video prijava uspješno poslana! Dobili ste XP!');
    } catch (e) {
      console.error('Submit failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (sub: Submission) => {
    if (!user) return;
    const liked = sub.likes?.includes(user.uid);
    const newLikes = liked
      ? sub.likes.filter(id => id !== user.uid)
      : [...(sub.likes || []), user.uid];
    
    setSubmissions(prev => {
      const next = prev.map(s => s.id === sub.id ? { ...s, likes: newLikes, likeCount: newLikes.length } : s);
      try { localStorage.setItem('creator_mock_challenge_submissions', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    await setDoc(doc(db, 'challengeSubmissions', sub.id), {
      likes: newLikes,
      likeCount: newLikes.length,
    }, { merge: true }).catch(() => {});
  };

  // 1. OZNAČI KAO POBJEDNIKA + SEND BROADCAST NOTIFICATION TO EVERYONE
  const handlePin = async (sub: Submission) => {
    if (!profile?.isAdmin || !activeChallenge) return;
    try {
      const willPin = !sub.isPinned;

      // Update submissions locally & immediately
      const updatedSubs = submissions.map(s => {
        if (s.id === sub.id) {
          return { ...s, isPinned: willPin };
        }
        if (willPin && s.challengeId === activeChallenge.id) {
          return { ...s, isPinned: false };
        }
        return s;
      });
      setSubmissions(updatedSubs);
      try { localStorage.setItem('creator_mock_challenge_submissions', JSON.stringify(updatedSubs)); } catch (_) {}

      // Update active challenge locally & immediately
      const updatedChallenges = challenges.map(ch => {
        if (ch.id === activeChallenge.id) {
          return {
            ...ch,
            pinnedSubmissionId: willPin ? sub.id : null,
            winnerName: willPin ? sub.authorName : null,
            winnerId: willPin ? sub.authorId : null,
          };
        }
        return ch;
      });
      setChallenges(updatedChallenges);
      const newActive = updatedChallenges.find(ch => ch.id === activeChallenge.id) || null;
      setActiveChallenge(newActive);
      try { localStorage.setItem('creator_mock_challenges', JSON.stringify(updatedChallenges)); } catch (_) {}

      // Persist to Firestore with setDoc merge
      for (const s of updatedSubs.filter(item => item.challengeId === activeChallenge.id)) {
        await setDoc(doc(db, 'challengeSubmissions', s.id), {
          ...s,
          isPinned: s.id === sub.id ? willPin : false
        }, { merge: true }).catch(() => {});
      }

      await setDoc(doc(db, 'challenges', activeChallenge.id), {
        pinnedSubmissionId: willPin ? sub.id : null,
        winnerName: willPin ? sub.authorName : null,
        winnerId: willPin ? sub.authorId : null,
      }, { merge: true }).catch(() => {});

      if (willPin) {
        // Send broadcast notification to all users with link to the winning submission
        await sendBroadcastNotification({
          senderId: user?.uid || 'admin',
          senderName: profile?.username || 'Mentor Ismael',
          senderAvatar: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor',
          type: 'challenge_winner',
          message: `🏆 ${sub.authorName} je proglašen/a pobjednikom izazova "${activeChallenge.title}"! Pogledaj pobjednički video rad.`,
          link: `/challenge?winnerId=${sub.id}`,
        });

        showToast(`🏆 ${sub.authorName} je označen/a kao pobjednik! Obavijest je poslana svim polaznicima.`);
      } else {
        showToast('Oznaka pobjednika je uklonjena.');
      }
    } catch (e) {
      console.error('Handle pin failed:', e);
    }
  };

  // 2. KREIRAJ NOVI CHALLENGE
  const handleCreateChallenge = async () => {
    if (!adminTitle.trim() || adminCreating) return;
    setAdminCreating(true);
    try {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + adminDays);
      deadlineDate.setHours(23, 59, 59, 0);

      const newChallengeData = {
        title: adminTitle.trim(),
        description: adminDesc.trim(),
        exampleText: adminExample.trim(),
        xpReward: adminXp,
        deadline: deadlineDate.toISOString(),
        active: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'challenges'), newChallengeData);

      const createdChallenge: Challenge = {
        id: docRef.id,
        ...newChallengeData,
        createdAt: new Date().toISOString(),
      };

      // Set as the only active challenge
      const updatedChallenges = challenges.map(ch => ({ ...ch, active: false }));
      updatedChallenges.unshift(createdChallenge);

      setChallenges(updatedChallenges);
      setActiveChallenge(createdChallenge);
      try { localStorage.setItem('creator_mock_challenges', JSON.stringify(updatedChallenges)); } catch (_) {}

      // Send notification about new active challenge
      await sendBroadcastNotification({
        senderId: user?.uid || 'admin',
        senderName: profile?.username || 'Mentor Ismael',
        senderAvatar: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor',
        type: 'new_challenge',
        message: `⚡ Novi Izazov Tjedna je aktivan: "${adminTitle.trim()}" (+${adminXp} XP)! Sudjeluj i osvoji nagrade.`,
        link: '/challenge',
      });

      setAdminTitle('');
      setAdminDesc('');
      setAdminExample('');
      setAdminXp(50);
      setAdminDays(7);
      setShowAdminForm(false);
      showToast('⚡ Novi izazov je uspješno kreiran i postavljen kao aktivan!');
    } catch (e) {
      console.error('Create challenge failed:', e);
    } finally {
      setAdminCreating(false);
    }
  };

  // 3. AKTIVIRAJ PONOVO: OVERRIDES THE CURRENT ACTIVE CHALLENGE AND SWAPS PLACES
  const handleReactivateChallenge = async (c: Challenge) => {
    if (!profile?.isAdmin) return;
    try {
      const newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + 7);
      newDeadline.setHours(23, 59, 59, 0);

      // 1. Swap in local state immediately so UI updates in real-time
      const updatedChallenges = challenges.map(ch => {
        if (ch.id === c.id) {
          return {
            ...ch,
            active: true,
            deadline: newDeadline.toISOString(),
            pinnedSubmissionId: null,
            daysRemaining: 7,
          };
        }
        return {
          ...ch,
          active: false,
        };
      });

      setChallenges(updatedChallenges);
      const newActive = updatedChallenges.find(ch => ch.id === c.id) || null;
      setActiveChallenge(newActive);
      try { localStorage.setItem('creator_mock_challenges', JSON.stringify(updatedChallenges)); } catch (_) {}

      // 2. Persist to Firestore with setDoc merge
      for (const ch of updatedChallenges) {
        await setDoc(doc(db, 'challenges', ch.id), {
          ...ch,
          active: ch.id === c.id,
          deadline: ch.id === c.id ? newDeadline.toISOString() : (ch.deadline || new Date().toISOString()),
          pinnedSubmissionId: ch.id === c.id ? null : (ch.pinnedSubmissionId || null),
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch((err: any) => console.warn('setDoc challenge error:', err));
      }

      // 3. Send notification to everyone
      await sendBroadcastNotification({
        senderId: user?.uid || 'admin',
        senderName: profile?.username || 'Mentor Ismael',
        senderAvatar: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor',
        type: 'new_challenge',
        message: `⚡ Izazov je ponovno aktivan: "${c.title}" (+${c.xpReward || 50} XP)! Prijavi svoj video rad (7 dana do kraja).`,
        link: '/challenge',
      });

      showToast(`⚡ Izazov "${c.title}" je sada AKTIVNI izazov tjedna (7 dana do kraja)!`);
    } catch (e) {
      console.error('Reactivate challenge failed:', e);
    }
  };

  const handleDeactivateChallenge = async (c: Challenge) => {
    if (!profile?.isAdmin) return;
    try {
      await updateDoc(doc(db, 'challenges', c.id), { active: false });
      showToast('Izazov je završen i prebačen u prošle izazove.');
    } catch (e) {
      console.error('Deactivate failed:', e);
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!profile?.isAdmin) return;
    if (!confirm('Želite li trajno obrisati ovaj izazov?')) return;
    try {
      await deleteDoc(doc(db, 'challenges', id));
      showToast('Izazov je obrisan.');
    } catch (e) {
      console.error('Delete failed:', e);
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
  const previousChallenges = challenges.filter(c => !c.active);

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

        {/* TOAST BANNER */}
        {toastMessage && (
          <div className="text-center py-2.5 px-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl font-bold text-[12px] uppercase tracking-wider animate-pulse shadow-lg">
            {toastMessage}
          </div>
        )}

        {/* XP TOAST */}
        {xpAwarded && (
          <div className="text-center py-2 bg-primary/15 border border-primary/30 text-primary rounded-full font-mono font-bold text-[11px] uppercase tracking-widest animate-pulse">
            🎉 +50 XP dodano na vaš profil! Odlična video prijava!
          </div>
        )}

        {/* ADMIN CREATE CHALLENGE FORM */}
        {profile?.isAdmin && (showAdminForm || !activeChallenge) && (
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
        {activeChallenge ? (
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
                <a
                  href={winnerSub.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-black font-black text-[11px] uppercase rounded-full hover:scale-105 transition-transform shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Pogledaj Video
                </a>
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
                  className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 pl-11 pr-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#3B82F6] focus:outline-none transition-colors"
                />
              </div>
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
              disabled={!videoLink.trim() || submitting}
              className="w-full py-3.5 bg-[#3B82F6] text-white font-heading font-[800] text-[14px] rounded-full uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              {submitting ? 'ŠALJEM PRIJAVU...' : `SUBMITTAJ RAD (+${activeChallenge.xpReward || 50} XP)`}
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
                          src={sub.authorAvatar}
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

                      <a
                        href={sub.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[13px] text-[#3B82F6] font-bold hover:underline truncate bg-white/5 px-3 py-2 rounded-xl"
                      >
                        <Link2 className="w-4 h-4 shrink-0 text-primary" />
                        <span className="truncate">{sub.videoLink}</span>
                      </a>

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
                          {sub.likeCount || 0}
                        </button>

                        {profile?.isAdmin && (
                          <button
                            onClick={() => handlePin(sub)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-heading font-black uppercase tracking-wider transition-all ml-auto cursor-pointer shadow-md ${
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
                        onClick={() => handleDeleteChallenge(c.id)}
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
