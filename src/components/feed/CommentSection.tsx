import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, Loader2, Heart } from 'lucide-react';
import {
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreComment } from '../../types/post';
import { awardXP } from '../../lib/xp';
import { createNotification, createMentionNotifications } from '../../lib/notifications';
import { toast, confirmDialog } from '../../lib/dialog';
import { useMemberSearch } from '../../hooks/useMemberSearch';
import MentionDropdown from '../ui/MentionDropdown';

const COMMENT_MAX = 2000;
/** Comments shorter than this don't earn XP (no "ok" / emoji farming). */
const COMMENT_XP_MIN_CHARS = 20;
const COMMENT_XP = 10;

const MENTION_CHARS = '[\\p{L}\\p{N}._-]';
const ACTIVE_MENTION = new RegExp(`@(${MENTION_CHARS}*)$`, 'u');
const MENTION_SPLIT = new RegExp(`(@${MENTION_CHARS}+)`, 'gu');
const MENTION_WHOLE = new RegExp(`^@${MENTION_CHARS}+$`, 'u');

function getActiveMention(text: string, cursorPos: number): string | null {
  const match = text.slice(0, cursorPos).match(ACTIVE_MENTION);
  return match ? match[1] : null;
}

function replaceMention(text: string, cursorPos: number, username: string): string {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  return before.replace(ACTIVE_MENTION, `@${username} `) + after;
}

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

interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
}

export default function CommentSection({ postId, postAuthorId }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<FirestoreComment[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeMention, setActiveMention] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const mentionResults = useMemberSearch(activeMention ?? '');

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc'),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setComments(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreComment)),
        );
        setLoadingComments(false);
        setLoadError(false);
      },
      (error) => {
        console.warn('Comments snapshot error:', error.code);
        setLoadingComments(false);
        setLoadError(true);
      },
    );
    return unsubscribe;
  }, [postId]);

  const myName = profile?.username || 'Kreator';
  const avatarUrl =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(myName)}`;

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setComment(val);
    const cursor = e.target.selectionStart ?? val.length;
    const mention = getActiveMention(val, cursor);
    if (mention !== null) {
      setActiveMention(mention);
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) {
        setMentionPos({ top: rect.top - 220, left: rect.left });
      }
    } else {
      setActiveMention(null);
    }
  };

  const handleMentionSelect = (username: string) => {
    const cursor = inputRef.current?.selectionStart ?? comment.length;
    setComment(replaceMention(comment, cursor, username));
    setActiveMention(null);
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!comment.trim() || !user || submitting) return;
    setSubmitting(true);
    const trimmed = comment.trim().slice(0, COMMENT_MAX);
    setComment('');
    setActiveMention(null);

    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: user.uid,
        authorName: myName,
        authorAvatar: avatarUrl,
        content: trimmed,
        createdAt: serverTimestamp(),
      });

      // Counter write must touch only commentsCount (rules: exactly ±1)
      updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) })
        .catch((err) => console.warn('Failed to update commentsCount:', err));

      if (trimmed.length >= COMMENT_XP_MIN_CHARS) {
        awardXP(user.uid, COMMENT_XP).catch((err) => console.warn('XP award failed:', err));
      }

      createMentionNotifications(trimmed, user.uid, myName, avatarUrl, postId)
        .catch((err) => console.warn('Mention notifications failed:', err));

      if (user.uid !== postAuthorId) {
        createNotification({
          recipientId: postAuthorId,
          senderId: user.uid,
          senderName: myName,
          senderAvatar: avatarUrl,
          type: 'comment',
          message: `${myName} je komentirao tvoju objavu`,
          postId,
        }).catch((err) => console.warn('Comment notification failed:', err));
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      setComment(trimmed);
      toast('Komentar nije objavljen. Pokušaj ponovno.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    const ok = await confirmDialog('Obrisati komentar?', { confirmLabel: 'Obriši', danger: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    } catch (err) {
      console.error('Delete failed:', err);
      toast('Brisanje komentara nije uspjelo.', 'error');
      return;
    }
    updateDoc(doc(db, 'posts', postId), { commentsCount: increment(-1) })
      .catch((err) => console.warn('Failed to update commentsCount:', err));
  };

  const toggleCommentLike = async (commentId: string, likedBy: string[]) => {
    if (!user || pendingLikes.has(commentId)) return;
    const ref = doc(db, 'posts', postId, 'comments', commentId);
    const liked = likedBy.includes(user.uid);
    setPendingLikes((prev) => new Set(prev).add(commentId));
    try {
      // Rules: only ['likedBy','likes'] may change and only by the caller's own uid
      await updateDoc(ref, {
        likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likes: increment(liked ? -1 : 1),
      });
    } catch (err) {
      console.warn('Like failed:', err);
      toast('Reakcija nije spremljena.', 'error');
    } finally {
      setPendingLikes((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh] md:max-h-[500px] text-left">
      {/* Comment list */}
      <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-4 min-h-[150px]">
        {loadingComments ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <p className="text-xs text-red-400 text-center py-8">
            Komentari se nisu mogli učitati.
          </p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Još nema komentara. Budi prvi!
          </p>
        ) : (
          comments.map((c) => {
            const likedBy = c.likedBy || [];
            const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.authorName || 'Kreator')}`;
            return (
              <div key={c.id} className="flex gap-3 relative group">
                <Link to={user?.uid === c.authorId ? '/profile' : `/profile/${c.authorId}`}>
                  <img
                    src={c.authorAvatar || fallbackAvatar}
                    className="w-8 h-8 rounded-full flex-shrink-0 hover:ring-2 ring-primary/50 transition-all object-cover"
                    alt={c.authorName}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
                    }}
                  />
                </Link>
                <div className="flex-1 bg-white/5 rounded-2xl px-4 py-3 min-w-0">
                  <div className="flex justify-between items-start">
                    <Link
                      to={user?.uid === c.authorId ? '/profile' : `/profile/${c.authorId}`}
                      className="font-bold text-sm block mb-1 hover:text-primary transition-colors"
                    >
                      {c.authorName}
                    </Link>
                    {(user?.uid === c.authorId || profile?.isAdmin) && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className={`text-xs text-red-400 transition-opacity ${
                          profile?.isAdmin ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                        }`}
                      >
                        Obriši
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">{renderWithMentions(c.content)}</p>
                  {/* Comment like button */}
                  <button
                    onClick={() => toggleCommentLike(c.id, likedBy)}
                    disabled={!user || pendingLikes.has(c.id)}
                    className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        user && likedBy.includes(user.uid) ? 'fill-red-400 text-red-400' : ''
                      }`}
                    />
                    <span>{Math.max(0, c.likes || 0)}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mention dropdown */}
      {activeMention !== null && mentionResults.length > 0 && (
        <MentionDropdown
          users={mentionResults}
          onSelect={handleMentionSelect}
          position={mentionPos}
        />
      )}

      {/* Comment input */}
      <div className="pt-4 border-t border-white/5 bg-[#111116] sticky bottom-0 z-10 flex gap-3">
        <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 overflow-hidden">
          <img src={avatarUrl} alt={myName} className="w-full h-full rounded-full" />
        </div>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={comment}
            maxLength={COMMENT_MAX}
            onChange={handleCommentChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setActiveMention(null);
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={user ? 'Napiši komentar...' : 'Prijavi se za komentar'}
            disabled={!user || submitting}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-4 pr-12 text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50 text-white"
          />
          <button
            onClick={handleSubmit}
            disabled={!comment.trim() || !user || submitting}
            aria-label="Pošalji komentar"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:scale-110 transition-transform disabled:opacity-30"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
