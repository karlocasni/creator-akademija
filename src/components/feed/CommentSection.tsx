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
import { useMemberSearch } from '../../hooks/useMemberSearch';
import MentionDropdown from '../ui/MentionDropdown';

function getActiveMention(text: string, cursorPos: number): string | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@(\w*)$/);
  return match ? match[1] : null;
}

function replaceMention(text: string, cursorPos: number, username: string): string {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  const newBefore = before.replace(/@\w*$/, `@${username} `);
  return newBefore + after;
}

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
      },
      (error) => {
        console.warn('Comments snapshot error:', error.code);
        setLoadingComments(false);
      },
    );
    return unsubscribe;
  }, [postId]);

  const avatarUrl =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`;

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
    const newComment = replaceMention(comment, cursor, username);
    setComment(newComment);
    setActiveMention(null);
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!comment.trim() || !user || submitting) return;
    setSubmitting(true);
    const trimmed = comment.trim();
    setComment('');
    setActiveMention(null);

    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: user.uid,
        authorName: profile?.username || 'Projekt90 Član',
        authorAvatar: avatarUrl,
        content: trimmed,
        createdAt: serverTimestamp(),
      });

      updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(1),
      }).catch((err) => console.warn('Failed to update commentsCount:', err));

      if (profile) {
        awardXP(user.uid, 10, profile.xp ?? 0).catch((err) =>
          console.warn('XP award failed:', err),
        );

        const senderName = profile.username || 'Projekt90 Član';

        createMentionNotifications(
          trimmed,
          user.uid,
          senderName,
          avatarUrl,
          postId,
        ).catch((err) => console.warn('Mention notifications failed:', err));

        if (user.uid !== postAuthorId) {
          createNotification({
            recipientId: postAuthorId,
            senderId: user.uid,
            senderName,
            senderAvatar: avatarUrl,
            type: 'comment',
            message: `${senderName} je komentirao tvoju objavu`,
            postId,
          }).catch((err) => console.warn('Comment notification failed:', err));
        }
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      setComment(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Obrisati komentar?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(-1),
      });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const toggleCommentLike = async (commentId: string, likedBy: string[]) => {
    if (!user) return;
    const ref = doc(db, 'posts', postId, 'comments', commentId);
    const liked = likedBy.includes(user.uid);
    try {
      await updateDoc(ref, {
        likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likes: increment(liked ? -1 : 1),
      });
    } catch (err) {
      console.warn('Like failed:', err);
    }
  };

  return (
    <div className="pt-6 space-y-6">
      {/* Comment input */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 overflow-hidden">
          <img src={avatarUrl} alt="Me" className="w-full h-full rounded-full" />
        </div>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={comment}
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
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-4 pr-12 text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!comment.trim() || !user || submitting}
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

      {/* Mention dropdown */}
      {activeMention !== null && mentionResults.length > 0 && (
        <MentionDropdown
          users={mentionResults}
          onSelect={handleMentionSelect}
          position={mentionPos}
        />
      )}

      {/* Comment list */}
      <div className="space-y-4">
        {loadingComments ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Još nema komentara. Budi prvi!
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3 relative group">
              <Link to={user?.uid === c.authorId ? '/profile' : `/profile/${c.authorId}`}>
                <img
                  src={c.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.authorName}`}
                  className="w-8 h-8 rounded-full flex-shrink-0 hover:ring-2 ring-primary/50 transition-all"
                  alt=""
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.authorName}`;
                  }}
                />
              </Link>
              <div className="flex-1 bg-white/5 rounded-2xl px-4 py-3">
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
                        profile?.isAdmin ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      Obriši
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground/80">{renderWithMentions(c.content)}</p>
                {/* Comment like button */}
                <button
                  onClick={() => toggleCommentLike(c.id, (c as any).likedBy || [])}
                  disabled={!user}
                  className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      user && ((c as any).likedBy || []).includes(user.uid)
                        ? 'fill-red-400 text-red-400'
                        : ''
                    }`}
                  />
                  <span>{(c as any).likes || 0}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
