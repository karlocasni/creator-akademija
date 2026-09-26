import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageSquare,
  Share2,
  MoreHorizontal,
  Heart,
  Pin,
} from 'lucide-react';
import {
  updateDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  setDoc,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  onSnapshot,
  writeBatch,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileCache } from '../../contexts/ProfileCacheContext';
import { FirestorePost } from '../../types/post';
import { cn } from '../../lib/utils';
import CommentSection from './CommentSection';
import { createNotification } from '../../lib/notifications';
import { deleteMediaByUrl } from '../../lib/media';
import { toast, confirmDialog } from '../../lib/dialog';

// ─── Mentions ────────────────────────────────────────────────────────────────

const MENTION_CHARS = '[\\p{L}\\p{N}._-]';
const MENTION_SPLIT = new RegExp(`(@${MENTION_CHARS}+)`, 'gu');
const MENTION_WHOLE = new RegExp(`^@${MENTION_CHARS}+$`, 'u');

function renderWithMentions(content: string): React.ReactNode {
  return content.split(MENTION_SPLIT).map((part, i) => {
    if (!MENTION_WHOLE.test(part)) return part;
    const name = part.slice(1).replace(/[._-]+$/, '');
    const tail = part.slice(1 + name.length);
    return (
      <span key={i}>
        <Link to={`/profile/u/${encodeURIComponent(name)}`} className="text-primary font-bold hover:underline">
          @{name}
        </Link>
        {tail}
      </span>
    );
  });
}

export function formatRelativeTime(timestamp: Timestamp | null | undefined): string {
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

export const dicebear = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || 'Kreator')}`;

// ─── Likes: one shared listener per post, however many cards show it ─────────

interface LikeState { count: number; uids: Set<string> }
interface LikeEntry {
  refs: number;
  state: LikeState | null;
  listeners: Set<(s: LikeState) => void>;
  unsub: () => void;
}
const likeRegistry = new Map<string, LikeEntry>();

function subscribeLikes(postId: string, cb: (s: LikeState) => void): () => void {
  let entry = likeRegistry.get(postId);
  if (!entry) {
    const created: LikeEntry = { refs: 0, state: null, listeners: new Set(), unsub: () => {} };
    created.unsub = onSnapshot(
      collection(db, 'posts', postId, 'likes'),
      (snap) => {
        created.state = { count: snap.size, uids: new Set(snap.docs.map((d) => d.id)) };
        created.listeners.forEach((l) => l(created.state!));
      },
      (err) => console.warn('[PostCard] Likes snapshot error:', err.code),
    );
    likeRegistry.set(postId, created);
    entry = created;
  }
  entry.refs++;
  entry.listeners.add(cb);
  if (entry.state) cb(entry.state);
  const current = entry;
  return () => {
    current.listeners.delete(cb);
    current.refs--;
    if (current.refs <= 0) {
      current.unsub();
      likeRegistry.delete(postId);
    }
  };
}

export function usePostLikes(postId: string, uid?: string | null) {
  const [state, setState] = useState<LikeState | null>(() => likeRegistry.get(postId)?.state ?? null);
  useEffect(() => subscribeLikes(postId, setState), [postId]);
  return { likeCount: state?.count ?? 0, isLiked: !!uid && !!state?.uids.has(uid) };
}

/** Posts whose author was already notified about a like in this session. */
const likeNotified = new Set<string>();

/**
 * Adds/removes the caller's like. Never awards XP to the author (the rules
 * forbid writing other users' profiles). The author is notified once per
 * post+liker: the notification id is deterministic, so a re-like can't create
 * a second one (the rules reject it as an update by a non-recipient).
 */
export async function togglePostLike(opts: {
  postId: string;
  authorId: string;
  uid: string;
  liked: boolean;
  senderName: string;
  senderAvatar: string;
}) {
  const { postId, authorId, uid, liked, senderName, senderAvatar } = opts;
  const likeRef = doc(db, 'posts', postId, 'likes', uid);
  if (liked) {
    await deleteDoc(likeRef);
    return;
  }
  await setDoc(likeRef, { userId: uid, createdAt: serverTimestamp() });
  if (uid !== authorId && !likeNotified.has(postId)) {
    likeNotified.add(postId);
    createNotification(
      {
        recipientId: authorId,
        senderId: uid,
        senderName,
        senderAvatar,
        type: 'like',
        message: `${senderName} je reagirao na tvoju objavu`,
        postId,
      },
      `like_${postId}_${uid}`,
    ).catch(() => { /* already notified earlier */ });
  }
}

// ─── Direct messages ─────────────────────────────────────────────────────────

interface ChatPerson { uid: string; name: string; avatar: string }

/**
 * Returns the DM id for two users, creating the chat only if it doesn't exist
 * yet — an existing conversation (and its lastMessage) is never overwritten.
 */
export async function openDirectChat(me: ChatPerson, other: ChatPerson): Promise<string> {
  const chatId = [me.uid, other.uid].sort().join('_');
  const ref = doc(db, 'chats', chatId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    try {
      await setDoc(ref, {
        participants: [me.uid, other.uid],
        participantNames: { [me.uid]: me.name, [other.uid]: other.name },
        participantAvatars: { [me.uid]: me.avatar, [other.uid]: other.avatar },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: '',
      });
    } catch (err) {
      // The other user may have created it a moment ago
      const again = await getDoc(ref).catch(() => null);
      if (!again?.exists()) throw err;
    }
  }
  return chatId;
}

// ─── Deleting ────────────────────────────────────────────────────────────────

async function deleteRefs(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    try {
      await batch.commit();
    } catch (err) {
      console.warn('[PostCard] Could not delete post sub-documents:', err);
    }
  }
}

/**
 * Deletes the post, then (best effort) its media files and the likes/comments
 * the caller is allowed to delete: admins everything, staff all comments,
 * authors only their own like/comments (see firestore.rules).
 */
async function deletePostEverywhere(
  post: FirestorePost,
  opts: { uid: string; isAdmin: boolean; isStaff: boolean },
) {
  await deleteDoc(doc(db, 'posts', post.id));

  const cleanup: Promise<unknown>[] = [
    deleteMediaByUrl(post.imageUrl),
    deleteMediaByUrl(post.videoUrl),
  ];

  const likesCol = collection(db, 'posts', post.id, 'likes');
  const commentsCol = collection(db, 'posts', post.id, 'comments');
  cleanup.push((async () => {
    try {
      const likeRefs = opts.isAdmin
        ? (await getDocs(likesCol)).docs.map((d) => d.ref)
        : [doc(likesCol, opts.uid)];
      const commentRefs = (await getDocs(
        opts.isStaff ? commentsCol : query(commentsCol, where('authorId', '==', opts.uid)),
      )).docs.map((d) => d.ref);
      await deleteRefs([...likeRefs, ...commentRefs]);
    } catch (err) {
      console.warn('[PostCard] Sub-collection cleanup failed:', err);
    }
  })());

  await Promise.all(cleanup);
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: FirestorePost;
  /** Author's level when known (hidden otherwise). */
  authorLevel?: number;
}

export default function PostCard({ post, authorLevel }: PostCardProps) {
  const { user, profile, isActualAdmin } = useAuth();
  const { getProfile } = useProfileCache();
  const [showComments, setShowComments] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { likeCount, isLiked } = usePostLikes(post.id, user?.uid);

  const cachedProfile = getProfile(post.authorId);
  const currentAvatar = cachedProfile?.avatar_url || post.authorAvatar;
  const currentName = cachedProfile?.username || post.authorName || 'Kreator';
  const dicebearUrl = dicebear(currentName);

  const myName = profile?.username || 'Kreator';
  const myAvatar = profile?.avatar_url || dicebear(myName);
  const isAuthor = user?.uid === post.authorId;
  const canModerate = !!profile?.isAdmin;

  const handleShare = async () => {
    const shareData = {
      title: 'Creator Akademija objava',
      text: post.content,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast('Link kopiran u međuspremnik!', 'success');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.warn('Error sharing:', err);
    }
  };

  const handleDelete = async () => {
    setShowOptions(false);
    if (!user) return;
    const ok = await confirmDialog('Jesi li siguran da želiš obrisati ovu objavu?', {
      confirmLabel: 'Obriši',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deletePostEverywhere(post, {
        uid: user.uid,
        isAdmin: isActualAdmin,
        isStaff: isActualAdmin || !!profile?.isCreator,
      });
      toast('Objava obrisana.', 'success');
    } catch (err) {
      console.error('Delete failed:', err);
      toast('Greška pri brisanju objave.', 'error');
      setDeleting(false);
    }
  };

  const handleTogglePin = async () => {
    setShowOptions(false);
    if (!canModerate) return;
    try {
      if (post.pinned) {
        await updateDoc(doc(db, 'posts', post.id), { pinned: false });
        toast('Objava otkvačena.', 'success');
        return;
      }
      const snap = await getDocs(query(collection(db, 'posts'), where('pinned', '==', true), limit(10)));
      if (snap.size >= 5) {
        toast('Već je prikvačeno 5 objava. Otkvači jednu prije nego prikvačiš novu.', 'info');
        return;
      }
      await updateDoc(doc(db, 'posts', post.id), { pinned: true });
      toast('Objava prikvačena.', 'success');
    } catch (err) {
      console.error('Pin toggle failed:', err);
      toast('Prikvačivanje nije uspjelo.', 'error');
    }
  };

  const toggleLike = async () => {
    if (!user || likeLoading) return;
    setLikeLoading(true);
    try {
      await togglePostLike({
        postId: post.id,
        authorId: post.authorId,
        uid: user.uid,
        liked: isLiked,
        senderName: myName,
        senderAvatar: myAvatar,
      });
    } catch (err) {
      console.error('Failed to toggle like:', err);
      toast('Reakcija nije spremljena.', 'error');
    } finally {
      setLikeLoading(false);
    }
  };

  const profilePath = isAuthor ? '/profile' : `/profile/${post.authorId}`;

  return (
    <article
      className={cn(
        'bg-[#151E30] border border-[rgba(255,255,255,0.06)] rounded-[20px] overflow-hidden post-card flex flex-col',
        deleting && 'opacity-50 grayscale pointer-events-none',
        cachedProfile?.isAdmin && 'admin-post'
      )}
    >
      <div className="p-4">
        {/* POST HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={profilePath} className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={currentAvatar || dicebearUrl}
                className="w-full h-full object-cover"
                alt={currentName}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = dicebearUrl;
                }}
              />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-[6px]">
                <Link
                  to={profilePath}
                  className="font-heading font-[700] text-[15px] text-[#FFFFFF] hover:text-[#3B82F6] transition-colors leading-tight"
                >
                  {currentName}
                </Link>
                {post.pinned && (
                  <span
                    className="inline-flex items-center gap-[2px] bg-[#3B82F6]/20 text-[#3B82F6] text-[10px] px-[6px] py-[2px] rounded font-bold"
                    title="Prikvačeno"
                  >
                    <Pin size={10} />
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-[#4A4A5A] uppercase">
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authorLevel != null && (
              <div className="lvl-badge text-[11px]">LVL {authorLevel}</div>
            )}

            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                aria-label="Opcije objave"
                className="text-[#4A4A5A] hover:text-[#FFFFFF] transition-colors p-[4px]"
              >
                <MoreHorizontal className="w-[20px] h-[20px]" />
              </button>

              {showOptions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[#1D2A44] border border-[rgba(255,255,255,0.06)] rounded-[16px] p-2 z-20 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    {canModerate && (
                      <button
                        onClick={handleTogglePin}
                        className="w-full text-left px-4 py-2 text-sm text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-xl transition-colors font-bold flex items-center gap-2"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        {post.pinned ? 'Otkvači objavu' : 'Prikvači objavu'}
                      </button>
                    )}
                    {isAuthor || canModerate ? (
                      <>
                        <button
                          onClick={handleDelete}
                          className="w-full text-left px-4 py-2 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 rounded-xl transition-colors font-bold"
                        >
                          Obriši objavu {canModerate && !isAuthor && '(Admin)'}
                        </button>
                        {!isAuthor && (
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.05)] rounded-xl transition-colors mt-1"
                            onClick={() => setShowOptions(false)}
                          >
                            Prijavi objavu
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.05)] rounded-xl transition-colors"
                        onClick={() => setShowOptions(false)}
                      >
                        Prijavi objavu
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* POST CONTENT */}
        {(post.title || post.content) && (
          <div className="font-sans text-[15px] leading-[1.6] text-white/90">
            {post.title && (
              <h2 className="font-heading font-[700] text-[16px] uppercase mb-[4px] text-[#FFFFFF]">
                {renderWithMentions(post.title)}
              </h2>
            )}
            {post.content && (
              <p className="whitespace-pre-wrap break-words">
                {renderWithMentions(post.content)}
              </p>
            )}
          </div>
        )}

        {/* MEDIA */}
        {post.imageUrl && (
          <div className="mt-4">
            <img
              src={post.imageUrl}
              className="w-full max-h-[480px] rounded-[12px] object-contain bg-[#0E1420]"
              loading="lazy"
              decoding="async"
              alt={post.title || `Slika koju je objavio/la ${currentName}`}
            />
          </div>
        )}
        {post.videoUrl && (
          // Fixed-ratio box: no layout shift while the video metadata loads
          <div
            className="mt-4 relative w-full rounded-[12px] overflow-hidden bg-[#0E1420]"
            style={{ aspectRatio: '4 / 5', maxHeight: 480 }}
          >
            <video
              src={`${post.videoUrl}#t=0.001`}
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: 'contain' }}
              controls
              playsInline
              preload="metadata"
              aria-label={post.title || `Video koji je objavio/la ${currentName}`}
            />
          </div>
        )}
      </div>

      {/* POST ACTIONS */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLike}
            disabled={!user || likeLoading}
            aria-pressed={isLiked}
            aria-label={isLiked ? 'Makni reakciju' : 'Reagiraj'}
            className={cn(
              'flex items-center gap-1.5 transition-colors duration-200 cursor-pointer disabled:opacity-50',
              isLiked ? 'text-[#3B82F6]' : 'text-[#8B8FA8] hover:text-[#3B82F6]'
            )}
          >
            <Heart className={cn('w-4 h-4 transition-transform duration-200', isLiked && 'fill-current scale-110')} />
            <span className="font-mono text-[12px]">{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments((prev) => !prev)}
            aria-label="Komentari"
            className={cn(
              'flex items-center gap-1.5 transition-colors duration-200 cursor-pointer',
              showComments ? 'text-[#3B82F6]' : 'text-[#8B8FA8] hover:text-[#3B82F6]'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="font-mono text-[12px]">{Math.max(0, post.commentsCount ?? 0)}</span>
          </button>

        </div>

        <button
          onClick={handleShare}
          aria-label="Podijeli"
          className="text-[#8B8FA8] hover:text-[#3B82F6] transition-colors duration-200 cursor-pointer"
        >
          <Share2 className="w-[18px] h-[18px]" />
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            {/* Drawer Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 bg-[#151E30] border-t border-white/10 rounded-t-[30px] z-[201] p-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl flex flex-col max-h-[80vh] md:max-h-[600px] md:max-w-md md:mx-auto md:rounded-2xl md:bottom-12 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:border"
            >
              {/* Drag Indicator Bar */}
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4 cursor-pointer hover:bg-white/20 transition-colors" onClick={() => setShowComments(false)} />

              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5 text-left">
                <span className="font-heading font-black text-xs uppercase tracking-widest text-[#8B8FA8]">Komentari ({Math.max(0, post.commentsCount ?? 0)})</span>
                <button
                  onClick={() => setShowComments(false)}
                  aria-label="Zatvori komentare"
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Comment Section */}
              <div className="flex-1 overflow-hidden">
                <CommentSection postId={post.id} postAuthorId={post.authorId} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </article>
  );
}
