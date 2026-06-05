import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreNotification } from '../../types/notification';
import { Timestamp } from 'firebase/firestore';

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

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    // No orderBy here — avoids a composite index requirement.
    // Notifications are sorted client-side after fetch.
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      limit(20),
    );

    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreNotification));
          docs.sort((a, b) => {
            const at = a.createdAt?.toMillis?.() ?? 0;
            const bt = b.createdAt?.toMillis?.() ?? 0;
            return bt - at;
          });
          setNotifications(docs);
        },
        (err) => {
          // Non-critical — silently suppress so it doesn't affect Feed or other listeners
          console.warn('Notifications snapshot error:', err.code);
        },
      );
    } catch (err) {
      console.warn('Failed to subscribe to notifications:', err);
    }
    return () => unsub?.();
  }, [user]);

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

  const hasUnread = notifications.some((n) => !n.read);

  const markAllRead = async () => {
    if (!user) return;
    if (notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit().catch((err) => console.warn('deleteAll notifications failed:', err));
    setNotifications([]);
  };

  const handleNotificationClick = async (n: FirestoreNotification) => {
    if (!n.read) {
      updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => {});
    }
    setOpen(false);
    if (n.postId) {
      navigate('/feed');
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Obavijesti"
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
            <div className="rounded-2xl overflow-hidden" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.9)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="font-black text-xs uppercase tracking-widest text-white/50">Obavijesti</span>
                <div className="flex items-center gap-3">
                  {notifications.length > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary font-bold hover:underline">
                      Obriši sve
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full bg-[#F5A500]/10 border border-[#F5A500]/30 text-[#F5A500] flex items-center justify-center text-xs font-bold">✕</button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">Nema novih obavijesti</p>
                ) : (
                  notifications.map((n) => {
                    const avatarSrc = n.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.senderName}`;
                    return (
                      <button key={n.id} onClick={() => handleNotificationClick(n)} className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${!n.read ? 'bg-white/5' : ''}`}>
                        <img src={avatarSrc} alt={n.senderName} className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0 object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.senderName}`; }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/90 leading-snug">{n.message}</p>
                          {n.senderName && <span className="text-xs text-white/40 mt-0.5 block">Od: {n.senderName}</span>}
                          <span className="text-xs text-white/40 mt-0.5 block">{formatRelative(n.createdAt)}</span>
                        </div>
                        {!n.read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          {/* Mobile backdrop */}
          <div className="md:hidden fixed inset-0 z-[199] bg-black/40" onClick={() => setOpen(false)} />

          {/* Desktop: right-aligned dropdown */}
          <div className="hidden md:block absolute right-0 top-full mt-2 w-80 rounded-2xl z-[60] overflow-hidden" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="font-black text-xs uppercase tracking-widest text-muted-foreground">Obavijesti</span>
              {notifications.length > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary font-bold hover:underline">Označi sve kao pročitano</button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', padding: '16px', textAlign: 'center' }}>Nema novih obavijesti</p>
              ) : (
                notifications.map((n) => {
                  const avatarSrc = n.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.senderName}`;
                  return (
                    <button key={n.id} onClick={() => handleNotificationClick(n)} className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${!n.read ? 'bg-white/5' : ''}`}>
                      <img src={avatarSrc} alt={n.senderName} className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0 object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.senderName}`; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground/90 leading-snug">{n.message}</p>
                        {n.senderName && <span className="text-xs text-muted-foreground mt-0.5 block">Od: {n.senderName}</span>}
                        <span className="text-xs text-muted-foreground mt-0.5 block">{formatRelative(n.createdAt)}</span>
                      </div>
                      {!n.read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
