import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Bell, Send, RefreshCw, AlertCircle, Trophy, ChevronDown, ChevronRight, Play } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
  DocumentSnapshot,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FirestorePost } from '../types/post';
import PostCard from '../components/feed/PostCard';
import CommentSection from '../components/feed/CommentSection';
import CreatePost from '../components/feed/CreatePost';
import SkeletonCard from '../components/ui/SkeletonCard';
import CommunityTabs from '../components/layout/CommunityTabs';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

const PAGE_SIZE = 10;

function formatRelativeTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate();
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Upravo';
    if (diffMins < 60) return `Prije ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      const label = diffHours === 1 ? 'sat' : diffHours < 5 ? 'sata' : 'sati';
      return `Prije ${diffHours} ${label}`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `Prije ${diffDays} ${diffDays === 1 ? 'dan' : 'dana'}`;
  } catch {
    return '';
  }
}

interface InstagramPostCardProps {
  post: FirestorePost;
  onBack: () => void;
}

function InstagramPostCard({ post, onBack }: InstagramPostCardProps) {
  const { user, profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!videoRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  const handleVideoTap = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const likes: string[] = Array.isArray(post.likes) ? post.likes : [];
  const isLiked = likes.includes(user?.uid ?? '');

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || likeLoading) return;
    setLikeLoading(true);
    const adding = !isLiked;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: adding ? arrayUnion(user.uid) : arrayRemove(user.uid),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Projekt90 Reels',
          text: post.content,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Kopirano u međuspremnik!');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const initDM = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !profile || user.uid === post.authorId) return;
    const chatId = [user.uid, post.authorId].sort().join('_');
    const myAvatar = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`;
    await setDoc(doc(db, 'chats', chatId), {
      participants: [user.uid, post.authorId],
      participantNames: { [user.uid]: profile.username, [post.authorId]: post.authorName },
      participantAvatars: { [user.uid]: myAvatar, [post.authorId]: post.authorAvatar },
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: '',
    }, { merge: true });
    navigate(`/messages/${chatId}`);
  };

  const avatarUrl = post.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorName}`;

  return (
    <div className="relative h-full w-full snap-start shrink-0 flex flex-col justify-end bg-black overflow-hidden select-none">
      {/* 1. Fullscreen Media Content */}
      <div className="absolute inset-0 z-0 flex items-center justify-center" onClick={handleVideoTap}>
        {post.videoUrl ? (
          <video
            ref={videoRef}
            src={post.videoUrl}
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          /* Text-only premium fallback gradient */
          <div className="w-full h-full bg-gradient-to-tr from-[#140D2B] via-[#0A0A0F] to-[#250C1B] flex items-center justify-center p-8">
            <p className="text-xl font-heading font-[800] text-center text-white/95 leading-relaxed tracking-wide max-w-xs uppercase">
              {post.title ? `${post.title}\n\n` : ''}{post.content}
            </p>
          </div>
        )}
      </div>

      {/* Dark gradient overlay behind text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none z-10" />

      {/* Controls: Mute/Volume floating button if video */}
      {post.videoUrl && (
        <button
          onClick={toggleMute}
          className="absolute top-20 right-4 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white/80"
        >
          <span className="material-symbols-outlined text-sm">
            {isMuted ? 'volume_off' : 'volume_up'}
          </span>
        </button>
      )}

      {/* 2. Overlaid Post Details (Left Side Bottom) */}
      <div className="absolute left-4 bottom-[calc(30px+env(safe-area-inset-bottom))] z-20 max-w-[70%] text-left flex flex-col gap-2 pointer-events-auto">
        <Link to={`/profile/${post.authorId}`} className="flex items-center gap-2 group">
          <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full border border-white/20" />
          <span className="font-heading font-black text-sm text-white hover:text-primary transition-colors">{post.authorName}</span>
          <span className="text-[9px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full font-mono uppercase">LVL 1</span>
        </Link>

        {post.videoUrl || post.imageUrl ? (
          <div className="text-white/90">
            {post.title && <h3 className="font-heading font-bold text-sm uppercase mb-1">{post.title}</h3>}
            <p className="text-xs font-sans line-clamp-3 leading-relaxed">{post.content}</p>
          </div>
        ) : null}

        <span className="font-mono text-[9px] text-white/40 uppercase">
          {formatRelativeTime(post.createdAt)}
        </span>
      </div>

      {/* 3. Floating Sidebar Actions (Right Side) */}
      <div className="absolute right-4 bottom-[calc(50px+env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-5 pointer-events-auto">
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={toggleLike}
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-transform active:scale-90 ${
              isLiked 
                ? 'bg-primary/20 border-primary text-primary' 
                : 'bg-black/40 border-white/10 text-white/90'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              local_fire_department
            </span>
          </button>
          <span className="text-[10px] font-bold text-white/80 font-mono leading-none">{likes.length}</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-xl">comment</span>
          </button>
          <span className="text-[10px] font-bold text-white/80 font-mono leading-none">{post.commentsCount ?? 0}</span>
        </div>

        {/* DM */}
        {user?.uid !== post.authorId && (
          <button
            onClick={initDM}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 active:scale-90 transition-transform"
            title="Pošalji poruku"
          >
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-xl">share</span>
        </button>
      </div>

      {/* Comment Drawer Sheet Overlay */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 bg-[#111116] border-t border-white/10 rounded-t-[30px] z-[201] p-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl flex flex-col h-[75vh]"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowComments(false)} />
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <span className="font-heading font-black text-xs uppercase tracking-widest text-[#8B8FA8]">Komentari ({post.commentsCount ?? 0})</span>
                <button
                  onClick={() => setShowComments(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <CommentSection postId={post.id} postAuthorId={post.authorId} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}



export default function Feed() {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<'standard' | 'instagram'>('standard');
  const [isSearchOpen, setIsSearchOpen] = useState(searchParams.get('search') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'challenges'));
    const unsub = onSnapshot(q, (snap) => {
      setChallenges(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn('[Feed] Challenges fetch error, using mock:', err);
      import('../lib/firebase-mock').then(({ SEED_CHALLENGES }) => {
        setChallenges(SEED_CHALLENGES);
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'profiles'), orderBy('xp', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setActiveMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn('[Feed] Profiles fetch error, using mock:', err);
      import('../lib/firebase-mock').then(({ SEED_PROFILES }) => {
        setActiveMembers(Object.values(SEED_PROFILES));
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (searchParams.get('search') === 'true') {
      setIsSearchOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    // Listen to upcoming events
    const q = query(collection(db, 'events'));
    const unsub = onSnapshot(q, (snap) => {
      const allEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const now = new Date();
      now.setHours(0, 0, 0, 0); // start of today
      const upcoming = allEvents.filter((e: any) => new Date(e.date) >= now);
      upcoming.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setUpcomingEvents(upcoming.slice(0, 3)); // show top 3 upcoming
    }, (err) => {
      console.warn('[Feed] Events fetch error, using mock:', err);
      import('../lib/firebase-mock').then(({ SEED_EVENTS }) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const upcoming = SEED_EVENTS.filter((e: any) => new Date(e.date) >= now);
        upcoming.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setUpcomingEvents(upcoming.slice(0, 3));
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Listen to profiles to extract creators
    const q = query(collection(db, 'profiles'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = all.filter((p: any) => p.isCreator === true);
      setCreators(filtered);
    }, (err) => {
      console.warn('[Feed] Creators fetch error, using mock:', err);
      import('../lib/firebase-mock').then(({ SEED_PROFILES }) => {
        const all = Object.values(SEED_PROFILES);
        const filtered = all.filter((p: any) => p.isCreator === true);
        setCreators(filtered);
      });
    });
    return unsub;
  }, []);

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
      console.warn('Feed snapshot error, using mock posts fallback:', err.code, err.message);
      import('../lib/firebase-mock').then(({ SEED_POSTS }) => {
        setPosts(SEED_POSTS as any[]);
        setLoading(false);
        setError(null);
      }).catch((mockErr) => {
        console.error('Fallback mock posts import failed:', mockErr);
        setError('Greška pri učitavanju feed-a. Pokušaj ponovo.');
        setLoading(false);
      });
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

  const matchedCreators = searchQuery.trim() ? creators.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    return c.username.toLowerCase().includes(q) || 
           (c.mainTopic && c.mainTopic.toLowerCase().includes(q)) ||
           (c.bio && c.bio.toLowerCase().includes(q));
  }) : [];

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden">
      {/* Fullscreen Instagram Feed for Mobile overlay */}
      {feedMode === 'instagram' && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col md:hidden animate-in fade-in duration-200">
          {/* Header overlay */}
          <div className="absolute top-0 inset-x-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center pt-[calc(env(safe-area-inset-top)+10px)]">
            <div className="flex flex-col">
              <span className="font-heading font-black text-white text-sm uppercase tracking-wider">REELS FEED</span>
              <span className="text-[9px] text-[#F5A500] uppercase font-mono tracking-widest mt-0.5">CREATOR AKADEMIJA</span>
            </div>
            <button
              onClick={() => setFeedMode('standard')}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-xs uppercase tracking-wider transition-colors border border-white/10 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">grid_view</span> Standardni Feed
            </button>
          </div>

          {/* Posts Container */}
          <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hidden bg-black">
            {sortedPosts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <p className="text-muted-foreground text-sm">Nema dostupnih video objava.</p>
              </div>
            ) : (
              sortedPosts.map((post) => (
                <InstagramPostCard key={post.id} post={post} onBack={() => setFeedMode('standard')} />
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. SUB-NAVIGATION TABS */}
      <CommunityTabs />

      {/* Search Input & Feed Mode Toggle */}
      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B8FA8]" />
          <input
            type="text"
            placeholder="Pretraži objave, mentore ili teme..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111116]/80 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:border-[#F5A500] focus:outline-none transition-colors text-white placeholder:text-[#8B8FA8]/50 shadow-xl"
          />
        </div>
        <button
          type="button"
          onClick={() => setFeedMode(prev => prev === 'standard' ? 'instagram' : 'standard')}
          className="md:hidden px-4 bg-[#111116]/80 border border-white/5 rounded-2xl flex items-center justify-center text-[#8B8FA8] hover:text-[#F5A500] hover:border-[#F5A500]/50 transition-all shadow-xl shrink-0"
          title="Instagram Fullscreen Mode"
        >
          <span className="material-symbols-outlined">
            {feedMode === 'standard' ? 'splitscreen' : 'grid_view'}
          </span>
        </button>
      </div>

      {/* Matched Creators section */}
      {matchedCreators.length > 0 && (
        <section className="px-4 mb-6 text-left">
          <h2 className="mb-3 text-[11px] uppercase font-mono tracking-[0.1em] text-[#8B8FA8]" style={{ fontVariant: 'small-caps' }}>
            Pronađeni Mentori i Kreatori ({matchedCreators.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchedCreators.map((creator) => {
              const avatarSrc = creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.username}`;
              return (
                <Link 
                  to={`/creator/${creator.id}`} 
                  key={creator.id}
                  className="bg-[#111116] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-[#F5A500]/50 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full p-0.5 active-avatar shrink-0">
                    <img 
                      src={avatarSrc} 
                      alt={creator.username} 
                      className="w-full h-full rounded-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-heading font-bold text-sm text-white group-hover:text-[#F5A500] transition-colors truncate">
                      {creator.username}
                    </h3>
                    {creator.mainTopic && (
                      <span className="text-[10px] font-bold text-[#F5A500] uppercase tracking-wider block mt-0.5">
                        {creator.mainTopic}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#F5A500] transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. ACTIVE MEMBERS ROW */}
      <section className="py-2 mb-2 text-left">
        <h2 className="px-4 mb-4 text-[11px] uppercase font-mono tracking-[0.1em] text-[#8B8FA8]" style={{ fontVariant: 'small-caps' }}>
          Aktivni Danas
        </h2>
        <div className="flex gap-3 overflow-x-auto px-4 hide-scrollbar">
          {activeMembers.map((member) => {
            const avatarSrc = member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
            return (
              <Link to={`/profile/${member.id}`} key={member.id} className="flex flex-col items-center min-w-[60px] max-w-[60px]">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-[2px] active-avatar">
                    <img 
                      src={avatarSrc} 
                      alt={member.username} 
                      className="w-full h-full rounded-full object-cover" 
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
                      }}
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0A0A0F] rounded-full"></div>
                </div>
                <span className="mt-2 text-[11px] font-medium text-[#8B8FA8] truncate w-full text-center font-body">
                  {member.username}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Nadolazeća Predavanja widget */}
      {upcomingEvents.length > 0 && !searchQuery && (
        <section className="px-4 mb-6 text-left">
          <h2 className="mb-3 text-[11px] uppercase font-mono tracking-[0.1em] text-[#8B8FA8]" style={{ fontVariant: 'small-caps' }}>
            Nadolazeća Predavanja i Live Q&A
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hidden">
            {upcomingEvents.map((event) => (
              <div 
                key={event.id}
                onClick={() => navigate(`/calendar?eventId=${event.id}`)}
                className="bg-[#111116] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-[#F5A500]/50 transition-all cursor-pointer group min-w-[260px] max-w-[260px] relative overflow-hidden"
              >
                {event.bgImage && (
                  <>
                    <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: `url(${event.bgImage})` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111116] to-transparent pointer-events-none" />
                  </>
                )}
                <div className="relative z-10 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn(
                      "text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                      event.type === 'live_qa' ? 'bg-[#F5A500]/20 text-[#F5A500]' : 
                      event.type === 'guest_lecture' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                    )}>
                      {event.type === 'live_qa' ? 'Live Q&A' : event.type === 'guest_lecture' ? 'Gost' : 'Accountability'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{event.duration}</span>
                  </div>
                  <h3 className="font-heading font-bold text-sm text-white group-hover:text-[#F5A500] transition-colors leading-snug truncate">
                    {event.title}
                  </h3>
                  <p className="text-[11px] text-[#8B8FA8] mt-1 line-clamp-2 leading-normal">
                    {event.description}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-2 relative z-10 text-left">
                  <span className="text-[10px] font-bold text-[#F5A500]">
                    {new Date(event.date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}h
                  </span>
                  <span className="text-[9px] text-[#8B8FA8] truncate font-medium max-w-[100px]">
                    by {event.speaker.split(' ')[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <CreatePost />

      {challenges.filter(c => c.active).map(c => {
        const daysLeft = c.deadline
          ? Math.max(0, Math.ceil((new Date(c.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : (c.daysRemaining ?? 0);
        return (
          <div key={c.id} className="mx-[16px] mb-[18px] relative rounded-[18px] p-[16px] pl-[20px] overflow-hidden cursor-pointer"
            onClick={() => window.location.href = '/challenge'}
            style={{
              background: 'linear-gradient(110deg, rgba(245,165,0,0.12), rgba(245,165,0,0.02) 60%), #111116',
              border: '1px solid rgba(245,165,0,0.22)',
            }}
          >
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[18px]"
              style={{ background: '#F5A500', boxShadow: '0 0 14px rgba(245,165,0,0.6)' }} />
            <div className="flex gap-[14px] items-start">
              <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245,165,0,0.15)' }}>
                <Trophy className="w-5 h-5 text-[#F5A500]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-mono font-bold text-[9.5px] tracking-[0.2em] uppercase text-[#F5A500] block">Challenge Tjedna</span>
                <h3 className="font-heading font-bold text-[16.5px] text-white leading-[1.15] mt-[5px] mb-[3px]">{c.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[12px] text-[#8B8FA8]">
                    {daysLeft > 0 ? `${daysLeft} dana do kraja` : 'Završava danas!'}
                  </p>
                  <span className="text-[11px] font-mono font-bold text-[#F5A500] bg-[#F5A500]/10 px-3 py-1 rounded-full">
                    +{c.xpReward || 50} XP →
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-col gap-[12px] px-[16px]">
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
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:text-white border border-[rgba(255,255,255,0.1)] hover:border-white/20 rounded-2xl transition-all disabled:opacity-50"
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
  );
}
