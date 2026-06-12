import { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Plus, Link2, Heart, Shield, X, ChevronDown, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { bottomNavEventTarget } from '../components/layout/BottomNav';
import { db } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, updateDoc, doc, serverTimestamp, query, orderBy
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
  pinnedSubmissionId?: string;
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
  const end = new Date(deadline);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getSundayOfCurrentWeek(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysToSunday);
  sunday.setHours(23, 59, 59, 0);
  return sunday.toISOString();
}

export default function Challenge() {
  const { profile, updateLocalProfile, user } = useAuth();
  const navigate = useNavigate();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  // UI state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);

  // Submission form
  const [videoLink, setVideoLink] = useState('');
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin form
  const [adminTitle, setAdminTitle] = useState('');
  const [adminDesc, setAdminDesc] = useState('');
  const [adminExample, setAdminExample] = useState('');
  const [adminXp, setAdminXp] = useState(50);
  const [adminCreating, setAdminCreating] = useState(false);

  useEffect(() => {
    bottomNavEventTarget.dispatchEvent(new Event('hide'));
    return () => {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'challenges'), snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
      setChallenges(items);
      const active = items.find(c => c.active) || null;
      setActiveChallenge(active);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'challengeSubmissions'), snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
      setSubmissions(items);
    });
    return unsub;
  }, []);

  const handleSubmit = async () => {
    if (!videoLink.trim() || !user || !activeChallenge || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'challengeSubmissions'), {
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
      });
      if (profile) {
        updateLocalProfile({ xp: profile.xp + (activeChallenge.xpReward || 50) });
      }
      setXpAwarded(true);
      setTimeout(() => setXpAwarded(false), 3000);
      setVideoLink('');
      setSubmitDesc('');
      setShowSubmitForm(false);
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
    await updateDoc(doc(db, 'challengeSubmissions', sub.id), {
      likes: newLikes,
      likeCount: newLikes.length,
    });
  };

  const handlePin = async (sub: Submission) => {
    if (!profile?.isAdmin || !activeChallenge) return;
    // Unpin others, pin this
    for (const s of submissions.filter(s => s.challengeId === activeChallenge.id)) {
      await updateDoc(doc(db, 'challengeSubmissions', s.id), { isPinned: false });
    }
    await updateDoc(doc(db, 'challengeSubmissions', sub.id), { isPinned: true });
  };

  const handleCreateChallenge = async () => {
    if (!adminTitle.trim() || adminCreating) return;
    setAdminCreating(true);
    try {
      // Deactivate existing active challenge
      for (const c of challenges.filter(c => c.active)) {
        await updateDoc(doc(db, 'challenges', c.id), { active: false });
      }
      await addDoc(collection(db, 'challenges'), {
        title: adminTitle.trim(),
        description: adminDesc.trim(),
        exampleText: adminExample.trim(),
        xpReward: adminXp,
        deadline: getSundayOfCurrentWeek(),
        active: true,
        createdAt: serverTimestamp(),
      });
      setAdminTitle('');
      setAdminDesc('');
      setAdminExample('');
      setAdminXp(50);
      setShowAdminForm(false);
    } catch (e) {
      console.error('Create challenge failed:', e);
    } finally {
      setAdminCreating(false);
    }
  };

  const activeSubs = submissions
    .filter(s => activeChallenge && s.challengeId === activeChallenge.id)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.likeCount || 0) - (a.likeCount || 0);
    });

  const previousChallenges = challenges.filter(c => !c.active);

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden pb-[80px]">
      {/* TOP BAR */}
      <div className="pt-[24px] px-[16px] flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/feed')}
          className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#8B8FA8] hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-[800] text-[20px] text-[#FFFFFF] leading-[1.1] uppercase">
            Challenge Tjedna
          </h1>
          <p className="font-sans text-[13px] text-[#8B8FA8]">Pokaži što znaš i osvoji XP</p>
        </div>
      </div>

      <div className="px-[16px] flex flex-col gap-5">

        {/* XP TOAST */}
        {xpAwarded && (
          <div className="text-center py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono font-bold text-[11px] uppercase tracking-widest animate-pulse">
            🎉 XP dodan! Odlična prijava!
          </div>
        )}

        {/* ACTIVE CHALLENGE HERO */}
        {activeChallenge ? (
          <div
            className="rounded-[24px] p-[24px] relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(245,165,0,0.15) 0%, rgba(245,165,0,0.03) 60%), #111116',
              border: '1px solid rgba(245,165,0,0.3)',
              boxShadow: '0 0 40px rgba(245,165,0,0.08)',
            }}
          >
            {/* Left accent */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[24px]"
              style={{ background: '#F5A500', boxShadow: '0 0 20px rgba(245,165,0,0.7)' }} />

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245,165,0,0.15)' }}>
                <Trophy className="w-6 h-6 text-[#F5A500]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[#F5A500] text-[9px] font-bold uppercase tracking-[0.2em] block mb-1">
                  Aktivni Challenge
                </span>
                <h2 className="font-heading font-[800] text-[20px] text-white leading-tight">{activeChallenge.title}</h2>
              </div>
            </div>

            <p className="font-sans text-[14px] text-[rgba(255,255,255,0.75)] leading-relaxed mb-4">
              {activeChallenge.description}
            </p>

            {activeChallenge.exampleText && (
              <div className="bg-[rgba(255,255,255,0.04)] rounded-[14px] p-4 mb-4 border border-[rgba(255,255,255,0.06)]">
                <span className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest block mb-1">Inspiracija</span>
                <p className="font-sans text-[13px] text-white/70 italic">{activeChallenge.exampleText}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(255,255,255,0.06)] rounded-full">
                  <Clock className="w-3.5 h-3.5 text-[#8B8FA8]" />
                  <span className="font-mono text-[11px] text-[#8B8FA8]">
                    {getDaysRemaining(activeChallenge.deadline)} dana do kraja
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-[#F5A500]/20 rounded-full">
                  <span className="font-mono font-bold text-[11px] text-[#F5A500]">+{activeChallenge.xpReward || 50} XP</span>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitForm(v => !v)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#F5A500] text-[#0A0A0F] rounded-full font-heading font-[800] text-[13px] uppercase hover:scale-[1.03] active:scale-[0.98] transition-transform"
              >
                <Plus className="w-4 h-4" />
                Submittaj
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#111116] rounded-[24px] border border-[rgba(255,255,255,0.06)] p-10 text-center">
            <Trophy className="w-12 h-12 text-[#4A4A5A] mx-auto mb-3" />
            <p className="text-[#8B8FA8] text-[15px] font-heading font-bold">Nema aktivnog challengea</p>
            <p className="text-[#4A4A5A] text-[13px] mt-1">Admin uskoro objavljuje novi!</p>
          </div>
        )}

        {/* SUBMIT FORM */}
        {showSubmitForm && activeChallenge && (
          <div className="bg-[#111116] rounded-[24px] border border-[rgba(245,165,0,0.2)] p-[20px] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-[800] text-[15px] text-white uppercase">Pošalji svoju prijavu</h3>
              <button onClick={() => setShowSubmitForm(false)} className="text-[#8B8FA8] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">
                Link TikTok / Instagram Reel videa
              </label>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A5A]" />
                <input
                  value={videoLink}
                  onChange={e => setVideoLink(e.target.value)}
                  placeholder="https://tiktok.com/@korisnik/video/..."
                  className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 pl-11 pr-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#F5A500] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">Kratki opis</label>
              <textarea
                value={submitDesc}
                onChange={e => setSubmitDesc(e.target.value)}
                placeholder="Reci nam nešto o svom videu..."
                rows={3}
                className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#F5A500] focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!videoLink.trim() || submitting}
              className="w-full py-3 bg-[#F5A500] text-[#0A0A0F] font-heading font-[800] text-[14px] rounded-full uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'ŠALJEM...' : `SUBMITTAJ (+${activeChallenge.xpReward || 50} XP)`}
            </button>
          </div>
        )}

        {/* SUBMISSIONS */}
        {activeChallenge && (
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8B8FA8] mb-3">
              Prijave članova ({activeSubs.length})
            </h3>
            {activeSubs.length === 0 ? (
              <div className="bg-[#111116] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-8 text-center">
                <p className="text-[#4A4A5A] text-[13px]">Budi prvi koji šalje prijavu!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeSubs.map(sub => (
                  <div
                    key={sub.id}
                    className={`rounded-[20px] p-5 flex flex-col gap-3 ${
                      sub.isPinned
                        ? 'border-2 border-[#F5A500] bg-gradient-to-br from-[rgba(245,165,0,0.1)] to-[#111116]'
                        : 'bg-[#111116] border border-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {sub.isPinned && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#F5A500]" />
                        <span className="font-mono text-[10px] text-[#F5A500] uppercase tracking-widest font-bold">
                          🏆 Pobjednička prijava
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <img
                        src={sub.authorAvatar}
                        alt={sub.authorName}
                        className="w-9 h-9 rounded-full border border-[rgba(255,255,255,0.1)]"
                      />
                      <div>
                        <p className="font-sans font-bold text-[14px] text-white">{sub.authorName}</p>
                        {sub.description && (
                          <p className="font-sans text-[12px] text-[#8B8FA8] mt-0.5">{sub.description}</p>
                        )}
                      </div>
                    </div>

                    <a
                      href={sub.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[13px] text-[#F5A500] font-bold hover:underline truncate"
                    >
                      <Link2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sub.videoLink}</span>
                    </a>

                    <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                      <button
                        onClick={() => handleLike(sub)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
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
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ml-auto ${
                            sub.isPinned
                              ? 'bg-[#F5A500]/20 text-[#F5A500]'
                              : 'bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-[#F5A500]/10 hover:text-[#F5A500]'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          {sub.isPinned ? 'Pobjednička' : 'Označi kao pobjednika'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADMIN CREATE CHALLENGE */}
        {profile?.isAdmin && (
          <div className="bg-[#111116] rounded-[24px] border border-[rgba(245,165,0,0.15)] p-[20px]">
            <button
              onClick={() => setShowAdminForm(v => !v)}
              className="w-full flex items-center justify-between text-[#F5A500] font-heading font-[800] text-[14px] uppercase tracking-widest"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin: Kreiraj Novi Challenge
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdminForm ? 'rotate-180' : ''}`} />
            </button>

            {showAdminForm && (
              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">Naslov challengea</label>
                  <input
                    value={adminTitle}
                    onChange={e => setAdminTitle(e.target.value)}
                    placeholder="npr. 7 dana dosljednosti..."
                    className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#F5A500] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">Opis / upute</label>
                  <textarea
                    value={adminDesc}
                    onChange={e => setAdminDesc(e.target.value)}
                    rows={3}
                    placeholder="Što kreatori trebaju napraviti..."
                    className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#F5A500] focus:outline-none transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">Inspiracija / primjer (opcionalno)</label>
                  <input
                    value={adminExample}
                    onChange={e => setAdminExample(e.target.value)}
                    placeholder="npr. Pogledaj ovaj video za inspiraciju..."
                    className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#F5A500] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">XP nagrada</label>
                  <div className="flex gap-2">
                    {[25, 50, 100, 200].map(xp => (
                      <button
                        key={xp}
                        onClick={() => setAdminXp(xp)}
                        className={`px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${
                          adminXp === xp
                            ? 'bg-[#F5A500] text-[#0A0A0F]'
                            : 'bg-[rgba(255,255,255,0.05)] text-[#8B8FA8]'
                        }`}
                      >
                        +{xp}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreateChallenge}
                  disabled={!adminTitle.trim() || adminCreating}
                  className="w-full py-3 bg-[#F5A500] text-[#0A0A0F] font-heading font-[800] text-[14px] rounded-full uppercase hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adminCreating ? 'KREIRAM...' : 'KREIRAJ CHALLENGE'}
                </button>
                <p className="text-[11px] text-[#4A4A5A] text-center">Deadline se automatski postavlja na nedjelju ove tjedne.</p>
              </div>
            )}
          </div>
        )}

        {/* PREVIOUS CHALLENGES */}
        {previousChallenges.length > 0 && (
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8B8FA8] mb-3">Prošli Challengei</h3>
            <div className="flex flex-col gap-2">
              {previousChallenges.map(c => (
                <div key={c.id} className="bg-[#111116] rounded-[16px] border border-[rgba(255,255,255,0.04)] p-4 opacity-60">
                  <p className="font-heading font-[700] text-[14px] text-white">{c.title}</p>
                  <p className="font-sans text-[12px] text-[#4A4A5A] mt-1">
                    {submissions.filter(s => s.challengeId === c.id).length} prijava • +{c.xpReward} XP
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
