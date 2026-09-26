import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreNotification } from '../../types/notification';
import { toast } from '../../lib/dialog';

const SHOWN = 30;

function formatRelative(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  try {
    const diffMs = Date.now() - ts.toDate().getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Upravo';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  } catch {
    return '';
  }
}

const fallbackAvatar = (name?: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Kreator')}`;

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      return;
    }
    // Only the caller's own notifications (the rules reject anything else).
    // No orderBy: equality + orderBy on another field needs a composite index,
    // and a limit without ordering would return an arbitrary subset — so the
    // caller's set is read and sorted client-side (newest SHOWN are displayed).
    const q = query(collection(db, 'notifications'), where('recipientId', '==', uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) } as FirestoreNotification),
        );
        docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setNotifications(docs);
      },
      (err) => {
        // Non-critical — don't break the page
        console.warn('Notifications snapshot error:', err.code);
      },
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visible = notifications.slice(0, SHOWN);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;

  const markAllRead = async () => {
    if (!uid || marking) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    setMarking(true);
    try {
      for (let i = 0; i < unread.length; i += 400) {
        const batch = writeBatch(db);
        unread.slice(i, i + 400).forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
        await batch.commit();
      }
    } catch (err) {
      console.warn('Mark all read failed:', err);
      toast('Obavijesti se nisu mogle označiti kao pročitane.', 'error');
    } finally {
      setMarking(false);
    }
  };

  const handleNotificationClick = async (n: FirestoreNotification) => {
    if (!n.read) {
      updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => {});
    }
    setOpen(false);
    if (n.link) {
      navigate(n.link);
    } else if (n.type === 'challenge_winner' || n.type === 'new_challenge') {
      navigate('/challenge');
    } else if (n.postId) {
      navigate('/feed');
    }
  };

  if (!user) return null;

  const renderItem = (n: FirestoreNotification, textClass: string, metaClass: string) => (
    <button
      key={n.id}
      onClick={() => handleNotificationClick(n)}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${!n.read ? 'bg-white/5' : ''}`}
    >
      <img
        src={n.senderAvatar || fallbackAvatar(n.senderName)}
        alt={n.senderName || ''}
        loading="lazy"
        decoding="async"
        className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0 object-cover"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackAvatar(n.senderName); }}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${textClass}`}>{n.message}</p>
        {n.senderName && <span className={`text-xs mt-0.5 block ${metaClass}`}>Od: {n.senderName}</span>}
        <span className={`text-xs mt-0.5 block ${metaClass}`}>{formatRelative(n.createdAt)}</span>
      </div>
      {!n.read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
    </button>
  );

  const markAllButton = hasUnread && (
    <button
      onClick={markAllRead}
      disabled={marking}
      className="text-xs text-primary font-bold hover:underline disabled:opacity-50"
    >
      Označi sve kao pročitano
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        aria-label={hasUnread ? `Obavijesti (${unreadCount} nepročitanih)` : 'Obavijesti'}
      >
        <Bell className="w-5 h-5" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <>
          {/* Mobile: full-width fixed panel */}
          <div className="md:hidden fixed left-0 right-0 top-0 z-[200] pt-[calc(env(safe-area-inset-top)+64px)] px-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: '#151E30', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.9)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="font-black text-xs uppercase tracking-widest text-white/50">Obavijesti</span>
                <div className="flex items-center gap-3">
                  {markAllButton}
                  <button onClick={() => setOpen(false)} aria-label="Zatvori" className="w-7 h-7 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center text-xs font-bold">✕</button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {visible.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">Nema novih obavijesti</p>
                ) : (
                  visible.map((n) => renderItem(n, 'text-white/90', 'text-white/40'))
                )}
              </div>
            </div>
          </div>
          {/* Mobile backdrop */}
          <div className="md:hidden fixed inset-0 z-[199] bg-black/40" onClick={() => setOpen(false)} />

          {/* Desktop: right-aligned dropdown */}
          <div className="hidden md:block absolute right-0 top-full mt-2 w-80 rounded-2xl z-[60] overflow-hidden" style={{ background: '#151E30', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="font-black text-xs uppercase tracking-widest text-muted-foreground">Obavijesti</span>
              {markAllButton}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {visible.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', padding: '16px', textAlign: 'center' }}>Nema novih obavijesti</p>
              ) : (
                visible.map((n) => renderItem(n, 'text-foreground/90', 'text-muted-foreground'))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
