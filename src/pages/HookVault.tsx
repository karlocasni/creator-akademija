import { useState, useEffect, useRef } from 'react';
import { Archive, ArrowLeft, Plus, Copy, Check, Heart, X, ChevronDown, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { bottomNavEventTarget } from '../components/layout/BottomNav';
import { db } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, updateDoc, doc, serverTimestamp, arrayUnion, arrayRemove, increment,
} from 'firebase/firestore';
import { toast } from '../lib/dialog';

const KATEGORIJE = ['Radoznalost', 'Kontroverza', 'Priča', 'Šok', 'Humor', 'Pitanje', 'Lista'];
const NIŠE = ['Lifestyle', 'Fitness', 'Edukacija', 'Humor', 'Gaming', 'Glazba', 'Hrana', 'Putovanja', 'Moda', 'Biznis', 'Motivacija', 'Općenito'];

type FilterType = 'Sve' | typeof KATEGORIJE[number];
type SortType = 'liked' | 'newest';

/**
 * Stored shape (firestore.rules): `likedBy` = uids that liked, `likes` = counter.
 * Older docs kept the uid array in `likes` plus a `likeCount` — normalised on read.
 */
interface HookItem {
  id: string;
  hookText: string;
  kategorija: string;
  nisa: string;
  zastoRadi: string;
  authorId: string;
  authorName: string;
  likedBy: string[];
  likeCount: number;
  /** true when `likes` is still the legacy uid array (not a number) */
  legacyLikes: boolean;
  createdAt: any;
}

const HOOK_XP = 15;

const normalizeHook = (id: string, data: Record<string, any>): HookItem => {
  const legacyLikes = Array.isArray(data.likes);
  const likedBy: string[] = Array.isArray(data.likedBy) ? data.likedBy : [];
  const likeCount = typeof data.likes === 'number'
    ? data.likes
    : typeof data.likeCount === 'number' ? data.likeCount : (legacyLikes ? data.likes.length : likedBy.length);
  return {
    id,
    hookText: data.hookText || '',
    kategorija: data.kategorija || 'Radoznalost',
    nisa: data.nisa || 'Općenito',
    zastoRadi: data.zastoRadi || '',
    authorId: data.authorId || '',
    authorName: data.authorName || 'Korisnik',
    likedBy,
    likeCount: Math.max(0, likeCount),
    legacyLikes,
    createdAt: data.createdAt,
  };
};

const normalizeText = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

const KATEGORIJA_COLORS: Record<string, string> = {
  Radoznalost: '#6366F1',
  Kontroverza: '#EF4444',
  Priča: '#8B5CF6',
  Šok: '#EC4899',
  Humor: '#F59E0B',
  Pitanje: '#10B981',
  Lista: '#3B82F6',
};

export default function HookVault() {
  const { profile, updateLocalProfile, user } = useAuth();
  const navigate = useNavigate();

  const [hooks, setHooks] = useState<HookItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('Sve');
  const [sort, setSort] = useState<SortType>('liked');
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const likeBusyRef = useRef<Set<string>>(new Set());

  // Form state
  const [hookText, setHookText] = useState('');
  const [kategorija, setKategorija] = useState('Radoznalost');
  const [nisa, setNisa] = useState('Općenito');
  const [zastoRadi, setZastoRadi] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    bottomNavEventTarget.dispatchEvent(new Event('hide'));
    return () => {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'hookVault'),
      snap => {
        setHooks(snap.docs.map(d => normalizeHook(d.id, d.data())));
        setLoadError(null);
        setLoading(false);
      },
      err => {
        console.error('[HookVault] Listener failed:', err);
        setLoadError((err as { code?: string }).code === 'permission-denied'
          ? 'Hook Vault je dostupan samo aktivnim članovima.'
          : 'Hookovi se nisu mogli učitati. Provjeri vezu i osvježi stranicu.');
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const handleAddHook = async () => {
    const text = hookText.trim();
    if (!text || !user || submitting) return;
    // Same hook twice = no second XP (and no duplicate in the vault)
    if (hooks.some(h => normalizeText(h.hookText) === normalizeText(text))) {
      toast('Ovaj hook je već u Vaultu.', 'info');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'hookVault'), {
        hookText: text,
        kategorija,
        nisa,
        zastoRadi: zastoRadi.trim(),
        authorId: user.uid,
        authorName: profile?.username || 'Korisnik',
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      });
      // XP once per saved hook
      if (profile) {
        updateLocalProfile({ xp: (profile.xp || 0) + HOOK_XP });
      }
      setXpAwarded(true);
      setTimeout(() => setXpAwarded(false), 3000);
      setHookText('');
      setZastoRadi('');
      setShowForm(false);
    } catch (err) {
      console.error('[HookVault] Failed to add hook:', err);
      toast('Hook nije spremljen. Pokušaj ponovno.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Only my uid is toggled in likedBy and the counter moves by exactly one (firestore.rules)
  const handleLike = async (hook: HookItem) => {
    if (!user || likeBusyRef.current.has(hook.id)) return;
    const liked = hook.likedBy.includes(user.uid);
    likeBusyRef.current.add(hook.id);
    try {
      await updateDoc(doc(db, 'hookVault', hook.id), {
        likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        // Legacy docs still hold an array in `likes`: replace it with the count
        likes: hook.legacyLikes
          ? Math.max(0, hook.likeCount + (liked ? -1 : 1))
          : increment(liked ? -1 : 1),
      });
    } catch (err) {
      console.error('[HookVault] Like failed:', err);
      toast('Lajk nije spremljen. Pokušaj ponovno.', 'error');
    } finally {
      likeBusyRef.current.delete(hook.id);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast('Kopiranje nije uspjelo.', 'error');
    }
  };

  const filtered = hooks
    .filter(h => filter === 'Sve' || h.kategorija === filter)
    .sort((a, b) => {
      if (sort === 'liked') return (b.likeCount || 0) - (a.likeCount || 0);
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden pb-[80px]">
      {/* TOP BAR */}
      <div className="pt-[24px] px-[16px] flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/tools')}
          className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#8B8FA8] hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-[800] text-[20px] text-[#FFFFFF] leading-[1.1] uppercase">
            Hook Vault
          </h1>
          <p className="font-sans text-[13px] text-[#8B8FA8]">Zajednička baza hookova zajednice</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-full font-heading font-[800] text-[12px] uppercase tracking-widest hover:scale-[1.03] active:scale-[0.98] transition-transform shrink-0"
        >
          <Plus className="w-4 h-4" />
          Dodaj Hook
        </button>
      </div>

      <div className="px-[16px] flex flex-col gap-4">

        {/* XP TOAST */}
        {xpAwarded && (
          <div className="text-center py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono font-bold text-[11px] uppercase tracking-widest animate-pulse">
            🎉 +{HOOK_XP} Creator XP dodan!
          </div>
        )}

        {/* ADD HOOK FORM */}
        {showForm && (
          <div className="bg-[#151E30] rounded-[24px] border border-[rgba(59,130,246,0.2)] p-[20px] flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-heading font-[800] text-[15px] text-white uppercase">Dodaj Hook (+{HOOK_XP} XP)</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8B8FA8] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">Hook tekst</label>
              <textarea
                value={hookText}
                onChange={e => setHookText(e.target.value)}
                placeholder="Napiši hook koji hvata pažnju u prve 3 sekunde..."
                rows={3}
                className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#3B82F6] focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">Kategorija</label>
                <div className="relative">
                  <select value={kategorija} onChange={e => setKategorija(e.target.value)}
                    className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[13px] text-white appearance-none focus:border-[#3B82F6] focus:outline-none">
                    {KATEGORIJE.map(k => <option key={k} value={k} className="bg-[#0E1420]">{k}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8FA8] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">Niša</label>
                <div className="relative">
                  <select value={nisa} onChange={e => setNisa(e.target.value)}
                    className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[13px] text-white appearance-none focus:border-[#3B82F6] focus:outline-none">
                    {NIŠE.map(n => <option key={n} value={n} className="bg-[#0E1420]">{n}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8FA8] pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#8B8FA8] block mb-2">Zašto radi?</label>
              <input
                value={zastoRadi}
                onChange={e => setZastoRadi(e.target.value)}
                placeholder="Kratko objasni psihologiju iza hooka..."
                className="w-full bg-[#0E1420] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#3B82F6] focus:outline-none transition-colors"
              />
            </div>

            <button
              onClick={handleAddHook}
              disabled={!hookText.trim() || submitting}
              className="w-full py-3 bg-[#3B82F6] text-white font-heading font-[800] text-[14px] rounded-full uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'DODAJEM...' : 'OBJAVI HOOK'}
            </button>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {['Sve', ...KATEGORIJE].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as FilterType)}
              className={`px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-white text-[#0E1420]'
                  : 'bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.1)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* SORT */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[#4A4A5A] uppercase tracking-widest">Sortiraj:</span>
          <button
            onClick={() => setSort('liked')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${sort === 'liked' ? 'bg-[#3B82F6]/20 text-[#3B82F6]' : 'text-[#8B8FA8] hover:text-white'}`}
          >
            Najpopularniji
          </button>
          <button
            onClick={() => setSort('newest')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${sort === 'newest' ? 'bg-[#3B82F6]/20 text-[#3B82F6]' : 'text-[#8B8FA8] hover:text-white'}`}
          >
            Najnoviji
          </button>
        </div>

        {/* HOOKS LIST */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 flex items-start gap-3 text-red-200 text-[13px]">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{loadError}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#151E30] rounded-[24px] border border-[rgba(255,255,255,0.06)] p-10 text-center">
            <Archive className="w-10 h-10 text-[#4A4A5A] mx-auto mb-3" />
            <p className="text-[#8B8FA8] text-[14px]">Još nema hookova u ovoj kategoriji.</p>
            <p className="text-[#4A4A5A] text-[12px] mt-1">Budi prvi koji dodaje!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(hook => {
              const isLiked = !!user && hook.likedBy.includes(user.uid);
              const tagColor = KATEGORIJA_COLORS[hook.kategorija] || '#8B8FA8';
              return (
                <div
                  key={hook.id}
                  className="bg-[#151E30] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-5 flex flex-col gap-3"
                >
                  {/* Hook text */}
                  <p className="font-heading font-[700] text-[17px] text-white leading-snug">
                    "{hook.hookText}"
                  </p>

                  {/* Tags */}
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
                      style={{ background: `${tagColor}20`, color: tagColor }}
                    >
                      {hook.kategorija}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] uppercase tracking-wide">
                      {hook.nisa}
                    </span>
                  </div>

                  {/* Explanation */}
                  {hook.zastoRadi && (
                    <p className="text-[13px] text-[#8B8FA8] leading-relaxed">
                      <span className="text-[#4A4A5A] font-mono text-[10px] uppercase tracking-widest mr-2">Zašto radi:</span>
                      {hook.zastoRadi}
                    </p>
                  )}

                  {/* Author + actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.04)]">
                    <span className="text-[12px] text-[#4A4A5A]">od @{hook.authorName}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLike(hook)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                          isLiked
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-red-500/10 hover:text-red-400'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                        {hook.likeCount || 0}
                      </button>
                      <button
                        onClick={() => handleCopy(hook.id, hook.hookText)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#8B8FA8] rounded-full text-[12px] font-bold transition-colors"
                      >
                        {copied === hook.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied === hook.id ? 'OK' : 'Kopiraj'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
