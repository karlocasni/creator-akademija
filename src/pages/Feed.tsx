import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Bell, Send, RefreshCw, AlertCircle, Trophy, ChevronDown } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FirestorePost } from '../types/post';
import PostCard from '../components/feed/PostCard';
import CreatePost from '../components/feed/CreatePost';
import SkeletonCard from '../components/ui/SkeletonCard';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 10;

const SECONDARY_TABS = [
  { label: 'Creator Hub', path: '/feed' },
  { label: 'XP Rang Lista', path: '/leaderboard' },
  { label: 'Kolege Kreatori', path: '/members' },
];

export default function Feed() {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(searchParams.get('search') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [challenges, setChallenges] = useState<any[]>([]);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'challenges'));
    const unsub = onSnapshot(q, (snap) => {
      setChallenges(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (searchParams.get('search') === 'true') {
      setIsSearchOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Live listener for first page only
  const subscribe = useCallback(() => {
    setLoading(true);
    setError(null);
    lastDocRef.current = null;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as FirestorePost))
        .filter((post) => (post as any).status !== 'deleted');
      setPosts(fetched);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.warn('Feed snapshot error:', err.code, err.message);
      if (err.code === 'failed-precondition') {
        setError('Firestore indeks se još gradi. Pričekaj nekoliko minuta i pokušaj ponovo.');
      } else if (err.code === 'permission-denied') {
        setError('Nemaš dozvolu za čitanje objava. Provjeri Firebase pravila.');
      } else {
        setError('Greška pri učitavanju feed-a. Pokušaj ponovo.');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [subscribe]);

  const handleLoadMore = async () => {
    if (!lastDocRef.current || loadingMore || !currentUser) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      const more = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as FirestorePost))
        .filter((post) => (post as any).status !== 'deleted');
      setPosts(prev => [...prev, ...more]);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRetry = () => { subscribe(); };

  const filteredPosts = posts.filter((post) => {

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      
      // Handle @username search
      if (q.startsWith('@')) {
        const targetUser = q.slice(1);
        return post.authorName.toLowerCase().includes(targetUser);
      }
      
      // Handle text search (content or title)
      const contentMatch = post.content.toLowerCase().includes(q);
      const titleMatch = post.title?.toLowerCase().includes(q);
      return contentMatch || titleMatch;
    }

    return true;
  });

  // Pinned posts always float to the top
  const sortedPosts = [
    ...filteredPosts.filter(p => p.pinned),
    ...filteredPosts.filter(p => !p.pinned),
  ];

  return (
    <div className="flex flex-col">
      {/* Desktop-only secondary bar — only visible on /feed */}
      <header className="hidden md:flex items-center gap-4 px-6 py-3 glass sticky top-16 z-40">
        {!isSearchOpen ? (
          <>
            <h1 className="text-2xl font-black tracking-tighter flex-shrink-0">CREATOR HUB</h1>

            {/* Scrollable tabs */}
            <div className="flex-1 flex items-end gap-0 overflow-x-auto scrollbar-none">
              {SECONDARY_TABS.map((tab) => (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    'whitespace-nowrap px-4 py-1.5 text-sm border-b-2 transition-colors flex-shrink-0',
                    location.pathname === tab.path
                      ? 'text-white font-bold border-primary'
                      : 'text-white/50 hover:text-white border-transparent',
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
            <Search className="w-5 h-5 text-primary" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pretraži objave ili koristi @korisnik..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-muted-foreground/50 text-white"
            />
            <button 
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="text-xs font-bold text-muted-foreground hover:text-white transition-colors"
            >
              ZATVORI
            </button>
          </div>
        )}

        {/* Right icons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {!isSearchOpen && (
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-primary"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          <Bell className="w-5 h-5 text-muted-foreground" />
          <Link
            to="/messages"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-primary"
            title="Privatne poruke"
          >
            <Send className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <div className="py-4 md:py-6 space-y-4">
        <CreatePost />


        {challenges.filter(c => c.active).map(c => (
          <div key={c.id} className="ursa-card p-4 border-l-4 border-l-primary bg-primary/5 flex items-start gap-4">
            <div className="bg-primary/20 p-2 rounded-full mt-1">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">Aktivni Izazov</span>
              <h3 className="font-bold text-lg mb-1 leading-tight">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </div>
          </div>
        ))}

        <div className="space-y-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : error ? (
            <div className="glass rounded-3xl p-10 text-center border border-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 text-sm mb-4 font-medium">{error}</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-black rounded-full font-black text-sm hover:opacity-90 transition-opacity mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Pokušaj ponovo
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center border border-white/5">
              <p className="text-muted-foreground text-sm">Još nema objava. Budi prvi!</p>
            </div>
          ) : (
            <>
              {sortedPosts.map((post) => <PostCard key={post.id} post={post} />)}
              {hasMore && !searchQuery && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:text-white border border-white/10 hover:border-white/20 rounded-2xl transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {loadingMore ? 'Učitavanje...' : 'Učitaj više'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
