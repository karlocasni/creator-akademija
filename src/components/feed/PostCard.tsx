import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageSquare,
  Share2,
  MoreHorizontal,
  Flame,
  MessageCircle,
  Pin,
} from 'lucide-react';
import {
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileCache } from '../../contexts/ProfileCacheContext';
import { FirestorePost, UserProfile } from '../../types/post';
import { cn } from '../../lib/utils';
import CommentSection from './CommentSection';
import { awardXP } from '../../lib/xp';
import { createNotification } from '../../lib/notifications';
import XPBadge from '../ui/XPBadge';

function renderWithMentions(content: string): React.ReactNode {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part) ? (
      <Link
        key={i}
        to={`/profile/u/${part.slice(1)}`}
        className="text-primary font-bold hover:underline"
      >
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

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

interface PostCardProps {
  post: FirestorePost;
}

export default function PostCard({ post }: PostCardProps) {
  const { user, profile } = useAuth();
  const { getProfile } = useProfileCache();
  const navigate = useNavigate();

  const [showComments, setShowComments] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cachedProfile = getProfile(post.authorId);
  const currentAvatar = cachedProfile?.avatar_url || post.authorAvatar;
  const currentName = cachedProfile?.username || post.authorName;

  const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentName}`;

  const initDM = async () => {
    if (!user || !profile || user.uid === post.authorId) return;
    const chatId = [user.uid, post.authorId].sort().join('_');
    const myAvatar =
      profile.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username || 'user'}`;
    await setDoc(
      doc(db, 'chats', chatId),
      {
        participants: [user.uid, post.authorId],
        participantNames: {
          [user.uid]: profile.username || 'Projekt90 Član',
          [post.authorId]: currentName,
        },
        participantAvatars: {
          [user.uid]: myAvatar,
          [post.authorId]: currentAvatar,
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: '',
      },
      { merge: true },
    );
    navigate(`/messages/${chatId}`);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Projekt90 Objava',
      text: post.content,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link kopiran u međuspremnik!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Jesi li siguran da želiš obrisati ovu objavu?')) return;
    setDeleting(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), { status: 'deleted' });
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Greška pri brisanju.');
    } finally {
      setDeleting(false);
      setShowOptions(false);
    }
  };

  const handleTogglePin = async () => {
    setShowOptions(false);
    if (post.pinned) {
      // Unpin
      await updateDoc(doc(db, 'posts', post.id), { pinned: false });
      return;
    }
    // Check how many posts are pinned
    const q = query(collection(db, 'posts'), where('pinned', '==', true));
    const snap = await getDocs(q);
    const live = snap.docs.filter(d => d.data().status !== 'deleted');
    if (live.length >= 5) {
      alert('Već je prikvačeno 5 objava. Otkvači jednu prije nego prikvačiš novu.');
      return;
    }
    await updateDoc(doc(db, 'posts', post.id), { pinned: true });
  };

  const likes: string[] = Array.isArray(post.likes) ? post.likes : [];
  const isLiked = likes.includes(user?.uid ?? '');

  const toggleLike = async () => {
    if (!user || likeLoading) return;
    setLikeLoading(true);
    const adding = !isLiked;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: adding ? arrayUnion(user.uid) : arrayRemove(user.uid),
      });
      if (adding && user.uid !== post.authorId) {
        try {
          const authorSnap = await getDoc(doc(db, 'profiles', post.authorId));
          if (authorSnap.exists()) {
            const authorXP = (authorSnap.data() as UserProfile).xp ?? 0;
            await awardXP(post.authorId, 5, authorXP);
          }
        } catch (xpErr) {
          console.warn('Failed to award XP for like:', xpErr);
        }
        createNotification({
          recipientId: post.authorId,
          senderId: user.uid,
          senderName: profile?.username || 'Projekt90 Član',
          senderAvatar: profile?.avatar_url || dicebearUrl,
          type: 'like',
          message: `${profile?.username || 'Projekt90 Član'} je reagirao na tvoju objavu`,
          postId: post.id,
        }).catch((err) => console.warn('Like notification failed:', err));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const profilePath = user?.uid === post.authorId ? '/profile' : `/profile/${post.authorId}`;

  return (
    <article
      className={cn(
        'bg-[#111116] border border-[rgba(255,255,255,0.06)] rounded-[20px] overflow-hidden post-card flex flex-col',
        deleting && 'opacity-50 grayscale pointer-events-none'
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
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = dicebearUrl;
                }}
              />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-[6px]">
                <Link
                  to={profilePath}
                  className="font-heading font-[700] text-[15px] text-[#FFFFFF] hover:text-[#F5A500] transition-colors leading-tight"
                >
                  {currentName}
                </Link>
                {post.pinned && (
                  <span className="inline-flex items-center gap-[2px] bg-[#F5A500]/20 text-[#F5A500] text-[10px] px-[6px] py-[2px] rounded font-bold">
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
            <div className="lvl-badge text-[11px]">
              LVL {(cachedProfile as any)?.level ?? 1}
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="text-[#4A4A5A] hover:text-[#FFFFFF] transition-colors p-[4px]"
              >
                <MoreHorizontal className="w-[20px] h-[20px]" />
              </button>

              {showOptions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[#1A1A22] border border-[rgba(255,255,255,0.06)] rounded-[16px] p-2 z-20 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    {profile?.isAdmin && (
                      <button
                        onClick={handleTogglePin}
                        className="w-full text-left px-4 py-2 text-sm text-[#F5A500] hover:bg-[#F5A500]/10 rounded-xl transition-colors font-bold flex items-center gap-2"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        {post.pinned ? 'Otkvači objavu' : 'Prikvači objavu'}
                      </button>
                    )}
                    {user?.uid === post.authorId || profile?.isAdmin ? (
                      <>
                        <button
                          onClick={handleDelete}
                          className="w-full text-left px-4 py-2 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 rounded-xl transition-colors font-bold"
                        >
                          Obriši objavu {profile?.isAdmin && user?.uid !== post.authorId && '(Admin)'}
                        </button>
                        {user?.uid !== post.authorId && (
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
        <div className="font-sans text-[15px] leading-[1.6] text-white/90">
          {post.title && (
            <h2 className="font-heading font-[700] text-[16px] uppercase mb-[4px] text-[#FFFFFF]">
              {renderWithMentions(post.title)}
            </h2>
          )}
          <p className="whitespace-pre-wrap">
            {renderWithMentions(post.content)}
          </p>
        </div>

        {/* MEDIA */}
        {post.imageUrl && (
          <div className="mt-4">
            <img
              src={post.imageUrl}
              className="w-full max-h-[480px] rounded-[12px] object-contain bg-[#0A0A0F]"
              loading="lazy"
              alt="Post slika"
            />
          </div>
        )}
        {post.videoUrl && (
          <div className="mt-4">
            <video
              src={`${post.videoUrl}#t=0.001`}
              className="w-full max-h-[480px] rounded-[12px] bg-[#0A0A0F]"
              controls
              playsInline
              preload="metadata"
              style={{ objectFit: 'contain' }}
              onPlay={(e) => { (e.currentTarget as HTMLVideoElement).muted = false; }}
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
            className={cn(
              'flex items-center gap-1.5 transition-colors duration-200 cursor-pointer disabled:opacity-50',
              isLiked ? 'text-[#F5A500]' : 'text-[#8B8FA8] hover:text-[#F5A500]'
            )}
          >
            <span className="text-sm">🔥</span>
            <span className="font-mono text-[12px]">{likes.length}</span>
          </button>

          <button
            onClick={() => setShowComments((prev) => !prev)}
            className={cn(
              'flex items-center gap-1.5 transition-colors duration-200 cursor-pointer',
              showComments ? 'text-[#F5A500]' : 'text-[#8B8FA8] hover:text-[#F5A500]'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="font-mono text-[12px]">{post.commentsCount ?? 0}</span>
          </button>
        </div>

        <button
          onClick={handleShare}
          className="text-[#8B8FA8] hover:text-[#F5A500] transition-colors duration-200 cursor-pointer"
        >
          <Share2 className="w-[18px] h-[18px]" />
        </button>
      </div>

      {showComments && (
        <div className="px-[16px] pb-[16px]">
          <CommentSection postId={post.id} postAuthorId={post.authorId} />
        </div>
      )}
    </article>
  );
}
