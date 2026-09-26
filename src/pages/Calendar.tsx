import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, Video, User, Check, X, Sparkles, ChevronLeft, ChevronRight, Plus, Trash2, Image as ImageIcon, Lock, Pencil, Users, AlertCircle, ExternalLink } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, setDoc,
  serverTimestamp, deleteField, writeBatch,
} from 'firebase/firestore';
import type { UploadTask } from 'firebase/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { bottomNavEventTarget } from '../components/layout/BottomNav';
import { toast, confirmDialog } from '../lib/dialog';
import { prepareImage, uploadMedia, mediaPath, deleteMediaByUrl, uploadErrorMessage, safeUrl } from '../lib/media';
import type { UserProfile } from '../types/post';

type EventType = 'live_qa' | 'guest_lecture' | 'accountability';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  /** Start time as an ISO instant (UTC), built from the admin's local date + time. */
  date: string;
  duration: string;
  /** Google Meet (or other https) link for joining the session. */
  meetLink?: string;
  /** Legacy field from before Google Meet — only read as a fallback. */
  zoomLink?: string;
  speaker: string;
  bgImage?: string | null;
  creatorId?: string;
}

interface EventForm {
  title: string;
  description: string;
  type: EventType;
  duration: string;
  speaker: string;
  meetLink: string;
  bgImage: string;
  date: string; // YYYY-MM-DD (local)
  time: string; // HH:MM (local)
}

const EMPTY_FORM: EventForm = {
  title: '',
  description: '',
  type: 'live_qa',
  duration: '60 min',
  speaker: '',
  meetLink: '',
  bgImage: '',
  date: '',
  time: '',
};

// Profile key used only by this page (allowed by the profile rules)
type CalendarProfile = UserProfile & { rsvpXpEventIds?: string[] };

const MEET_RE = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(?:[/?#]|$)/i;
const RSVP_XP = 50;
// An event counts as finished this long after its start time
const EVENT_GRACE_MS = 3 * 60 * 60 * 1000;

const TYPE_LABEL: Record<EventType, string> = {
  live_qa: 'Live Q&A',
  guest_lecture: 'Gost',
  accountability: 'Accountability',
};
const TYPE_COLOR: Record<EventType, string> = {
  live_qa: '#3B82F6',
  guest_lecture: '#8B5CF6',
  accountability: '#22C55E',
};
const TYPE_BADGE: Record<EventType, string> = {
  live_qa: 'bg-[#3B82F6]/20 text-[#3B82F6]',
  guest_lecture: 'bg-indigo-500/20 text-indigo-400',
  accountability: 'bg-emerald-500/20 text-emerald-400',
};

const monthNames = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'];

const pad = (n: number) => String(n).padStart(2, '0');
const localDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTimeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const eventLink = (e: CalendarEvent) => safeUrl(e.meetLink || e.zoomLink);
const isMeetUrl = (url: string) => MEET_RE.test(url);
const isPastEvent = (e: CalendarEvent) => new Date(e.date).getTime() + EVENT_GRACE_MS < Date.now();
const eventTypeOf = (e: CalendarEvent): EventType => (e.type in TYPE_LABEL ? e.type : 'live_qa');

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('hr-HR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const cssUrl = (url?: string | null) => {
  const safe = safeUrl(url);
  return safe ? `url(${JSON.stringify(safe)})` : undefined;
};

/** Join button for the Google Meet (or legacy) link; "Link uskoro" while none is set. */
function JoinButton({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  const url = eventLink(event);
  if (!url) {
    return (
      <div
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-full border border-dashed border-white/15 text-[#8B8FA8] font-heading font-[800] uppercase tracking-widest',
          compact ? 'py-[10px] text-[11px]' : 'py-[14px] text-[13px]',
        )}
      >
        <Video className="w-4 h-4" /> Link uskoro
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className={cn(
        'w-full flex items-center justify-center gap-2 rounded-full bg-emerald-500 text-[#0A0A0F] font-heading font-[800] uppercase tracking-widest hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]',
        compact ? 'py-[10px] text-[11px]' : 'py-[16px] text-[14px]',
      )}
    >
      <Video className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
      {isMeetUrl(url) ? 'Pridruži se na Google Meet' : 'Pridruži se online'}
      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
    </a>
  );
}

export default function Calendar() {
  const [searchParams] = useSearchParams();
  const { user, profile, updateLocalProfile } = useAuth();
  const isStaff = !!(profile?.isAdmin || profile?.isCreator);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // RSVPs of the open event (live count + whether I'm on the list)
  const [rsvpState, setRsvpState] = useState<{ eventId: string; count: number | null; mine: boolean } | null>(null);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [justRsvpd, setJustRsvpd] = useState(false);

  // Staff create / edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const originalImageRef = useRef<string | null>(null);
  const pendingUploadsRef = useRef<string[]>([]);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const handledDeepLinkRef = useRef<string | null>(null);

  const selectedEvent = useMemo(
    () => (selectedEventId ? events.find(e => e.id === selectedEventId) || null : null),
    [events, selectedEventId],
  );

  // Events in real time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'events'),
      snap => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as CalendarEvent))
          .filter(e => !Number.isNaN(new Date(e.date).getTime()))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(list);
        setLoadError(null);
        setLoading(false);
      },
      err => {
        console.error('[Calendar] Events listener failed:', err);
        setLoadError(
          (err as { code?: string }).code === 'permission-denied'
            ? 'Raspored je dostupan samo aktivnim članovima.'
            : 'Raspored se nije mogao učitati. Provjeri vezu i osvježi stranicu.',
        );
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  // RSVPs of the selected event
  useEffect(() => {
    if (!selectedEventId || !user) {
      setRsvpState(null);
      return;
    }
    const eventId = selectedEventId;
    const uid = user.uid;
    const unsub = onSnapshot(
      collection(db, 'events', eventId, 'rsvps'),
      snap => setRsvpState({ eventId, count: snap.size, mine: snap.docs.some(d => d.id === uid) }),
      err => {
        console.warn('[Calendar] RSVP listener failed:', err);
        setRsvpState({ eventId, count: null, mine: false });
      },
    );
    return unsub;
  }, [selectedEventId, user?.uid]);

  // Open the event from ?eventId=… once it has loaded (only once per id)
  const deepLinkId = searchParams.get('eventId');
  useEffect(() => {
    if (!deepLinkId || handledDeepLinkRef.current === deepLinkId) return;
    const match = events.find(e => e.id === deepLinkId);
    if (!match) return;
    handledDeepLinkRef.current = deepLinkId;
    const d = new Date(match.date);
    setSelectedDay(d);
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedEventId(match.id);
  }, [deepLinkId, events]);

  useEffect(() => {
    if (selectedEvent || showForm) {
      bottomNavEventTarget.dispatchEvent(new Event('hide'));
    } else {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    }
    return () => {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    };
  }, [selectedEvent, showForm]);

  // ─── RSVP ──────────────────────────────────────────────────────────────────

  const handleRsvp = async (ev: CalendarEvent) => {
    if (!user || rsvpBusy) return;
    if (isPastEvent(ev)) {
      toast('Ovaj događaj je već završio.', 'info');
      return;
    }
    setRsvpBusy(true);
    try {
      const rsvpRef = doc(db, 'events', ev.id, 'rsvps', user.uid);
      const existing = await getDoc(rsvpRef);
      if (existing.exists()) {
        toast('Već imaš rezervirano mjesto za ovaj događaj.', 'info');
        return;
      }
      await setDoc(rsvpRef, {
        userId: user.uid,
        username: profile?.username || 'Kreator',
        createdAt: serverTimestamp(),
      });

      // XP only for the first RSVP to an event — cancelling and re-booking gives nothing
      const rewarded = (profile as CalendarProfile | null)?.rsvpXpEventIds || [];
      if (profile && !rewarded.includes(ev.id)) {
        updateLocalProfile({
          xp: (profile.xp || 0) + RSVP_XP,
          rsvpXpEventIds: [...rewarded, ev.id].slice(-200),
        } as Partial<UserProfile>);
        setJustRsvpd(true);
        setTimeout(() => setJustRsvpd(false), 4000);
      } else {
        toast('Mjesto je rezervirano.', 'success');
      }
    } catch (err) {
      console.error('[Calendar] RSVP failed:', err);
      toast('Rezervacija nije uspjela. Pokušaj ponovno.', 'error');
    } finally {
      setRsvpBusy(false);
    }
  };

  const handleCancelRsvp = async (ev: CalendarEvent) => {
    if (!user || rsvpBusy) return;
    const ok = await confirmDialog('Otkazati rezervaciju za ovaj događaj?', { confirmLabel: 'Otkaži rezervaciju', danger: true });
    if (!ok) return;
    setRsvpBusy(true);
    try {
      await deleteDoc(doc(db, 'events', ev.id, 'rsvps', user.uid));
      toast('Rezervacija je otkazana.', 'info');
    } catch (err) {
      console.error('[Calendar] RSVP cancel failed:', err);
      toast('Otkazivanje nije uspjelo. Pokušaj ponovno.', 'error');
    } finally {
      setRsvpBusy(false);
    }
  };

  // ─── Staff: create / edit / delete ─────────────────────────────────────────

  // Admins manage every event, creators only their own (rules allow any staff)
  const canManage = (ev: CalendarEvent) =>
    !!profile?.isAdmin || (!!profile?.isCreator && !!user && ev.creatorId === user.uid);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: localDateKey(selectedDay), speaker: profile?.username || '' });
    originalImageRef.current = null;
    pendingUploadsRef.current = [];
    setShowForm(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    const d = new Date(ev.date);
    setEditingId(ev.id);
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      type: eventTypeOf(ev),
      duration: ev.duration || '',
      speaker: ev.speaker || '',
      meetLink: ev.meetLink || ev.zoomLink || '',
      bgImage: ev.bgImage || '',
      date: localDateKey(d),
      time: localTimeKey(d),
    });
    originalImageRef.current = ev.bgImage || null;
    pendingUploadsRef.current = [];
    setSelectedEventId(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    uploadTaskRef.current?.cancel();
    // Images uploaded in this session but never saved
    pendingUploadsRef.current.forEach(url => { void deleteMediaByUrl(url); });
    pendingUploadsRef.current = [];
    setShowForm(false);
    setEditingId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadProgress(0);
    try {
      const blob = await prepareImage(file, 1600);
      const { promise, task } = uploadMedia(mediaPath('events', blob.type), blob, f => setUploadProgress(Math.round(f * 100)));
      uploadTaskRef.current = task;
      const url = await promise;
      pendingUploadsRef.current.push(url);
      setForm(p => ({ ...p, bgImage: url }));
    } catch (err) {
      if ((err as { code?: string })?.code !== 'storage/canceled') {
        console.error('[Calendar] Image upload failed:', err);
        toast(uploadErrorMessage(err), 'error');
      }
    } finally {
      uploadTaskRef.current = null;
      setUploadProgress(null);
    }
  };

  const meetInput = form.meetLink.trim();
  const meetInputUrl = meetInput ? safeUrl(meetInput) : null;
  const meetInputInvalid = !!meetInput && (!meetInputUrl || !meetInputUrl.startsWith('https://'));
  const meetInputNotMeet = !!meetInputUrl && !meetInputInvalid && !isMeetUrl(meetInputUrl);

  const handleSaveEvent = async () => {
    if (!user || !isStaff || saving) return;
    const title = form.title.trim();
    const speaker = form.speaker.trim();
    if (!title) return toast('Upiši naslov događaja.', 'error');
    if (!speaker) return toast('Upiši ime hosta / predavača.', 'error');
    if (!form.date || !form.time) return toast('Odaberi datum i vrijeme početka.', 'error');
    // Local (Croatian) wall-clock time → UTC instant
    const start = new Date(`${form.date}T${form.time}`);
    if (Number.isNaN(start.getTime())) return toast('Datum ili vrijeme nisu ispravni.', 'error');
    if (meetInputInvalid) return toast('Link za sastanak mora biti ispravan https:// link (npr. https://meet.google.com/abc-defg-hij).', 'error');
    if (uploadProgress !== null) return toast('Pričekaj da se slika učita.', 'info');

    setSaving(true);
    const data = {
      title,
      speaker,
      description: form.description.trim(),
      type: form.type,
      duration: form.duration.trim() || '60 min',
      date: start.toISOString(),
      meetLink: meetInputUrl || '',
    };
    const wasEditing = editingId;
    try {
      if (wasEditing) {
        await updateDoc(doc(db, 'events', wasEditing), {
          ...data,
          bgImage: form.bgImage || deleteField(),
          zoomLink: deleteField(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'events'), {
          ...data,
          ...(form.bgImage ? { bgImage: form.bgImage } : {}),
          creatorId: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      // Remove images that are no longer referenced (replaced or removed)
      const stale = [...pendingUploadsRef.current, ...(wasEditing && originalImageRef.current ? [originalImageRef.current] : [])]
        .filter(url => url && url !== form.bgImage);
      stale.forEach(url => { void deleteMediaByUrl(url); });
      pendingUploadsRef.current = [];

      toast(wasEditing ? 'Događaj je ažuriran.' : 'Događaj je dodan u raspored.', 'success');
      setSelectedDay(start);
      setCurrentDate(new Date(start.getFullYear(), start.getMonth(), 1));
      setShowForm(false);
      setEditingId(null);
      if (wasEditing) setSelectedEventId(wasEditing);
    } catch (err) {
      console.error('[Calendar] Saving event failed:', err);
      toast(
        (err as { code?: string })?.code === 'permission-denied'
          ? 'Nemaš ovlasti za uređivanje događaja.'
          : 'Spremanje nije uspjelo. Pokušaj ponovno.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (ev: CalendarEvent) => {
    const ok = await confirmDialog(`Obrisati događaj „${ev.title}”? Ovo se ne može poništiti.`, { confirmLabel: 'Obriši', danger: true });
    if (!ok) return;
    try {
      // Clear the RSVP subcollection so no orphaned docs stay behind
      try {
        const rsvps = await getDocs(collection(db, 'events', ev.id, 'rsvps'));
        for (let i = 0; i < rsvps.docs.length; i += 400) {
          const batch = writeBatch(db);
          rsvps.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) {
        console.warn('[Calendar] Could not remove RSVPs:', err);
      }
      await deleteDoc(doc(db, 'events', ev.id));
      setSelectedEventId(null);
      await deleteMediaByUrl(ev.bgImage);
      toast('Događaj je obrisan.', 'success');
    } catch (err) {
      console.error('[Calendar] Delete failed:', err);
      toast('Brisanje nije uspjelo. Pokušaj ponovno.', 'error');
    }
  };

  // ─── Calendar grid ─────────────────────────────────────────────────────────

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (() => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 7 : day; // Monday = 1 … Sunday = 7
  })();
  const blanks = Array.from({ length: firstWeekday - 1 }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    events.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const list = map.get(d.getDate()) || [];
        list.push(e);
        map.set(d.getDate(), list);
      }
    });
    return map;
  }, [events, year, month]);

  const dayEvents = useMemo(
    () => events.filter(e => sameDay(new Date(e.date), selectedDay)),
    [events, selectedDay],
  );
  const upcoming = useMemo(
    () => events.filter(e => !isPastEvent(e) && !dayEvents.includes(e)).slice(0, 5),
    [events, dayEvents],
  );

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // A day with one event opens it; a day with several lists them below the grid
  const handleDayClick = (day: number) => {
    setSelectedDay(new Date(year, month, day));
    const list = eventsByDay.get(day) || [];
    if (list.length === 1) setSelectedEventId(list[0].id);
  };

  const today = new Date();

  const renderEventCard = (ev: CalendarEvent) => {
    const type = eventTypeOf(ev);
    const past = isPastEvent(ev);
    return (
      <div
        key={ev.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedEventId(ev.id)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEventId(ev.id); } }}
        className={cn(
          'relative overflow-hidden bg-[#151E30] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-[16px] flex flex-col gap-[12px] cursor-pointer hover:border-[#3B82F6]/40 transition-colors text-left',
          past && 'opacity-60',
        )}
      >
        {ev.bgImage && (
          <>
            <div className="absolute inset-0 bg-cover bg-center opacity-[0.12] pointer-events-none" style={{ backgroundImage: cssUrl(ev.bgImage) }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#151E30] to-transparent pointer-events-none" />
          </>
        )}
        <div className="relative z-10 flex flex-col gap-[6px] min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('inline-block text-[9px] font-mono font-[700] uppercase tracking-widest px-[10px] py-[4px] rounded-full', TYPE_BADGE[type])}>
              {TYPE_LABEL[type]}
            </span>
            {past && <span className="text-[9px] font-mono uppercase tracking-widest text-[#8B8FA8]">Završeno</span>}
          </div>
          <h3 className="font-heading font-[800] text-[16px] text-white uppercase leading-tight line-clamp-2">{ev.title}</h3>
          <p className="font-sans text-[12px] text-[#8B8FA8] flex items-center gap-[6px] flex-wrap">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{formatWhen(ev.date)}</span>
            {ev.duration && <span>· {ev.duration}</span>}
          </p>
        </div>
        {!past && (
          <div className="relative z-10">
            <JoinButton event={ev} compact />
          </div>
        )}
      </div>
    );
  };

  const inputCls = 'w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-[12px] text-white focus:border-[#3B82F6] focus:outline-none';
  const labelCls = 'font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block';

  const sheetRsvp = selectedEvent && rsvpState?.eventId === selectedEvent.id ? rsvpState : null;
  const selectedRewarded = !!selectedEvent && ((profile as CalendarProfile | null)?.rsvpXpEventIds || []).includes(selectedEvent.id);

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-full overflow-hidden pb-[24px]">
      {/* BACKGROUND LAYER */}
      <div className="fixed inset-0 z-[-3] bg-[#0E1420]" />

      {/* HEADER */}
      <div className="pt-[24px] px-[16px] flex items-center justify-between">
        <h1 className="font-heading font-[800] text-[28px] text-[#FFFFFF] leading-[1.1] mb-[4px] uppercase flex items-center gap-2">
          <span>RASPORED</span>
          <span className="text-[#3B82F6] font-marker font-normal tracking-normal mt-1">DOGAĐANJA</span>
        </h1>
      </div>

      {/* STAFF FAB — admins and creators, hidden while a sheet is open */}
      {isStaff && !selectedEvent && !showForm && (
        <motion.button
          id="admin-add-event-fab"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={openCreate}
          aria-label="Dodaj događaj"
          className="fixed top-[72px] right-[16px] z-[60] w-[52px] h-[52px] rounded-full bg-[#3B82F6] text-white flex items-center justify-center"
          style={{
            boxShadow: '0 0 0 2px rgba(59,130,246,0.25), 0 0 20px rgba(59,130,246,0.55), 0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <Plus className="w-[22px] h-[22px]" strokeWidth={3} />
          <span
            className="absolute -bottom-[4px] -right-[4px] w-[18px] h-[18px] rounded-full bg-[#0E1420] border border-[#3B82F6]/60 flex items-center justify-center"
            aria-hidden
          >
            <Lock className="w-[9px] h-[9px] text-[#3B82F6]" strokeWidth={2.5} />
          </span>
        </motion.button>
      )}

      {/* CALENDAR GRID */}
      <div className="px-[16px] mt-[24px]">
        <div className="flex items-center justify-between mb-[16px] px-[8px]">
          <button onClick={prevMonth} aria-label="Prethodni mjesec" className="p-2 text-[#8B8FA8] hover:text-white transition-colors bg-[rgba(255,255,255,0.05)] rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-heading font-[800] text-[18px] uppercase tracking-wider text-white">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} aria-label="Sljedeći mjesec" className="p-2 text-[#8B8FA8] hover:text-white transition-colors bg-[rgba(255,255,255,0.05)] rounded-full">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-[16px] gap-x-[8px] text-center bg-[rgba(17,17,22,0.4)] backdrop-blur-md rounded-[24px] p-[16px] border border-[rgba(255,255,255,0.06)]">
          {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map(d => (
            <div key={d} className="font-mono text-[10px] text-[#8B8FA8] font-[700] uppercase tracking-widest mb-[8px]">{d}</div>
          ))}

          {blanks.map(b => (
            <div key={`blank-${b}`} className="h-[48px]" />
          ))}

          {days.map(day => {
            const cellDate = new Date(year, month, day);
            const cellEvents = eventsByDay.get(day) || [];
            const isToday = sameDay(cellDate, today);
            const isSelected = sameDay(cellDate, selectedDay);

            return (
              <button
                type="button"
                key={day}
                className="flex flex-col items-center justify-start h-[48px] cursor-pointer"
                onClick={() => handleDayClick(day)}
                aria-label={`${day}. ${monthNames[month]}${cellEvents.length ? `, događaja: ${cellEvents.length}` : ''}`}
              >
                <div className={cn(
                  'w-[32px] h-[32px] flex items-center justify-center rounded-full font-heading font-[700] text-[16px] transition-all',
                  isToday && !isSelected ? 'border-[2px] border-[#3B82F6] text-[#3B82F6]' : 'text-white',
                  isSelected ? 'bg-[#3B82F6] text-[#0E1420]' : 'hover:bg-[rgba(255,255,255,0.1)]'
                )}>
                  {day}
                </div>
                {cellEvents.length > 0 && (
                  <div className="flex gap-[2px] mt-[4px]">
                    {cellEvents.slice(0, 4).map(e => (
                      <div
                        key={e.id}
                        className="w-[4px] h-[4px] rounded-full"
                        style={{ backgroundColor: TYPE_COLOR[eventTypeOf(e)] }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* EVENT LISTS: selected day + upcoming */}
      <div className="px-[16px] mt-[24px] flex flex-col gap-[24px]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-[20px] flex items-start gap-3 text-red-200 text-[14px]">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{loadError}</span>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-[12px]">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8B8FA8]">
                {selectedDay.toLocaleDateString('hr-HR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              {dayEvents.length > 0 ? (
                dayEvents.map(renderEventCard)
              ) : (
                <p className="font-sans text-[13px] text-[#4A4A5A]">Nema događaja ovaj dan.</p>
              )}
            </section>

            {events.length === 0 ? (
              <div className="bg-[#151E30] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-[32px] text-center flex flex-col items-center gap-3">
                <CalendarIcon className="w-10 h-10 text-[#4A4A5A]" />
                <p className="font-heading font-[700] text-[15px] text-[#8B8FA8]">Još nema zakazanih događaja</p>
                <p className="font-sans text-[13px] text-[#4A4A5A]">
                  {isStaff ? 'Dodaj prvi događaj gumbom + u gornjem desnom kutu.' : 'Novi live pozivi i predavanja uskoro stižu ovdje.'}
                </p>
              </div>
            ) : upcoming.length > 0 && (
              <section className="flex flex-col gap-[12px]">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8B8FA8]">Nadolazeći događaji</h2>
                {upcoming.map(renderEventCard)}
              </section>
            )}
          </>
        )}
      </div>

      {/* BOTTOM SHEET FOR SELECTED EVENT */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[40] bg-black/40"
              onClick={() => setSelectedEventId(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[50] bg-[#151E30] border-t border-[rgba(255,255,255,0.06)] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
              style={{ maxHeight: '88vh' }}
            >
              {selectedEvent.bgImage && (
                <>
                  <div
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.3]"
                    style={{ backgroundImage: cssUrl(selectedEvent.bgImage) }}
                  />
                  <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#151E30] via-[#151E30]/80 to-transparent" />
                  <div className="absolute inset-0 z-0 bg-black/40" />
                </>
              )}

              <div className="relative z-10 overflow-y-auto p-[24px] pb-[40px]" style={{ maxHeight: '88vh' }}>
                <div className="w-[40px] h-[4px] bg-[rgba(255,255,255,0.2)] rounded-full mx-auto mb-[24px]" />

                <div className="flex justify-between items-start mb-[16px]">
                  <span className={cn('inline-block text-[10px] font-mono font-[700] uppercase tracking-widest px-[12px] py-[6px] rounded-full', TYPE_BADGE[eventTypeOf(selectedEvent)])}>
                    {TYPE_LABEL[eventTypeOf(selectedEvent)]}
                  </span>

                  <div className="flex items-center gap-2">
                    {canManage(selectedEvent) && (
                      <>
                        <button
                          onClick={() => openEdit(selectedEvent)}
                          aria-label="Uredi događaj"
                          className="p-2 text-[#3B82F6] hover:text-white bg-[#3B82F6]/10 hover:bg-[#3B82F6]/30 rounded-full transition-colors flex items-center justify-center"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(selectedEvent)}
                          aria-label="Obriši događaj"
                          className="p-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/30 rounded-full transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => setSelectedEventId(null)} aria-label="Zatvori" className="p-2 text-[#8B8FA8] hover:text-white bg-[rgba(255,255,255,0.05)] rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h2 className="font-heading font-[800] text-[32px] mb-[16px] uppercase text-[#FFFFFF] leading-[1.1] tracking-[-0.02em]">
                  {selectedEvent.title}
                </h2>

                {selectedEvent.description && (
                  <p className="font-sans text-[14px] text-[#8B8FA8] leading-relaxed mb-[24px] whitespace-pre-line">
                    {selectedEvent.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-[16px] mb-[24px]">
                  <div className="flex items-center gap-[12px]">
                    <div className="w-[40px] h-[40px] rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                      <Clock className="w-[18px] h-[18px] text-[#3B82F6]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono font-[700] text-[10px] text-[#8B8FA8] uppercase tracking-widest">Vrijeme</span>
                      <span className="font-sans font-[700] text-[14px] text-[#FFFFFF]">
                        {formatWhen(selectedEvent.date)}{selectedEvent.duration ? ` (${selectedEvent.duration})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-[12px]">
                    <div className="w-[40px] h-[40px] rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                      <User className="w-[18px] h-[18px] text-[#3B82F6]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono font-[700] text-[10px] text-[#8B8FA8] uppercase tracking-widest">Host</span>
                      {selectedEvent.creatorId ? (
                        <Link
                          to={`/creator/${selectedEvent.creatorId}`}
                          className="font-sans font-[700] text-[14px] text-[#3B82F6] hover:underline transition-all"
                        >
                          {selectedEvent.speaker}
                        </Link>
                      ) : (
                        <span className="font-sans font-[700] text-[14px] text-[#FFFFFF]">{selectedEvent.speaker}</span>
                      )}
                    </div>
                  </div>

                  {sheetRsvp && sheetRsvp.count !== null && (
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[40px] h-[40px] rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                        <Users className="w-[18px] h-[18px] text-[#3B82F6]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono font-[700] text-[10px] text-[#8B8FA8] uppercase tracking-widest">Prijavljeni</span>
                        <span className="font-sans font-[700] text-[14px] text-[#FFFFFF]">{sheetRsvp.count}</span>
                      </div>
                    </div>
                  )}
                </div>

                {isPastEvent(selectedEvent) ? (
                  <div className="w-full py-[16px] rounded-full border border-white/10 text-[#8B8FA8] font-heading font-[800] text-[13px] uppercase tracking-widest text-center">
                    Događaj je završio
                  </div>
                ) : (
                  <div className="flex flex-col gap-[12px]">
                    {/* Google Meet join */}
                    <JoinButton event={selectedEvent} />

                    {/* RSVP */}
                    {sheetRsvp?.mine ? (
                      <div className="flex gap-[8px]">
                        <div className="flex-1 py-[14px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-heading font-[800] text-[13px] uppercase tracking-widest flex items-center justify-center gap-[8px]">
                          <Check className="w-[18px] h-[18px]" /> Mjesto rezervirano
                        </div>
                        <button
                          onClick={() => handleCancelRsvp(selectedEvent)}
                          disabled={rsvpBusy}
                          className="px-[18px] py-[14px] rounded-full border border-red-500/30 bg-red-500/10 text-red-300 font-heading font-[800] text-[12px] uppercase tracking-widest hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          Otkaži
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRsvp(selectedEvent)}
                        disabled={rsvpBusy || !sheetRsvp}
                        className="w-full py-[16px] bg-[#3B82F6] text-white rounded-full font-heading font-[800] text-[14px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-60 disabled:hover:scale-100"
                      >
                        {rsvpBusy ? 'Rezerviram…' : selectedRewarded ? 'Rezerviraj mjesto' : `Rezerviraj mjesto (+${RSVP_XP} XP)`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* STAFF CREATE / EDIT MODAL */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-[#0E1420]/80 backdrop-blur-md" onClick={closeForm} />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full md:max-w-lg bg-[#151E30] rounded-t-[28px] md:rounded-[24px] border border-[rgba(255,255,255,0.06)] shadow-2xl flex flex-col"
              style={{ maxHeight: '92vh' }}
            >
              {/* Drag handle (mobile) */}
              <div className="w-[40px] h-[4px] bg-[rgba(255,255,255,0.2)] rounded-full mx-auto mt-[12px] mb-[4px] md:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between px-[24px] pt-[16px] pb-[16px] border-b border-[rgba(255,255,255,0.06)]">
                <h2 className="font-heading font-[800] text-[22px] text-white uppercase">{editingId ? 'Uredi Događaj' : 'Dodaj Događaj'}</h2>
                <button
                  onClick={closeForm}
                  aria-label="Zatvori"
                  className="w-[36px] h-[36px] rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center hover:bg-[#3B82F6]/20 transition-colors"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-[24px] py-[20px]">
                <div className="flex flex-col gap-[16px]">
                  <div>
                    <label className={labelCls} htmlFor="event-title">Naslov *</label>
                    <input id="event-title" type="text" className={inputCls} value={form.title} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, title: v })); }} placeholder="Naslov događaja" maxLength={120} />
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="event-type">Tip</label>
                    <select id="event-type" className={inputCls} value={form.type} onChange={e => { const v = e.target.value as EventType; setForm(p => ({ ...p, type: v })); }}>
                      <option value="live_qa">Live Q&A</option>
                      <option value="guest_lecture">Gost Predavač</option>
                      <option value="accountability">Accountability</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-[16px]">
                    <div>
                      <label className={labelCls} htmlFor="event-date">Datum *</label>
                      <input id="event-date" type="date" className={inputCls} value={form.date} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, date: v })); }} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="event-time">Vrijeme *</label>
                      <input id="event-time" type="time" className={inputCls} value={form.time} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, time: v })); }} />
                    </div>
                  </div>
                  <p className="-mt-[8px] font-sans text-[11px] text-[#4A4A5A]">Vrijeme upiši po lokalnom (hrvatskom) vremenu.</p>

                  <div>
                    <label className={labelCls} htmlFor="event-duration">Trajanje</label>
                    <input id="event-duration" type="text" className={inputCls} value={form.duration} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, duration: v })); }} placeholder="npr. 60 min" maxLength={40} />
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="event-speaker">Host / Predavač *</label>
                    <input id="event-speaker" type="text" className={inputCls} value={form.speaker} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, speaker: v })); }} placeholder="Ime hosta" maxLength={80} />
                  </div>

                  {/* GOOGLE MEET LINK */}
                  <div>
                    <div className="flex items-center justify-between mb-[8px]">
                      <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest" htmlFor="event-meet">Google Meet link</label>
                      <a
                        href="https://meet.google.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-[10px] py-[4px] rounded-full hover:bg-emerald-500/20 transition-colors"
                      >
                        <Video className="w-3 h-3" /> Kreiraj Meet
                      </a>
                    </div>
                    <input
                      id="event-meet"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      className={cn(inputCls, meetInputInvalid && 'border-red-500/60', meetInputNotMeet && 'border-amber-500/60')}
                      value={form.meetLink}
                      onChange={e => { const v = e.target.value; setForm(p => ({ ...p, meetLink: v })); }}
                      placeholder="https://meet.google.com/abc-defg-hij"
                    />
                    {meetInputInvalid ? (
                      <p className="mt-[6px] font-sans text-[11px] text-red-400">Link mora biti ispravan https:// link.</p>
                    ) : meetInputNotMeet ? (
                      <p className="mt-[6px] font-sans text-[11px] text-amber-400">Ovo ne izgleda kao Google Meet link (meet.google.com/abc-defg-hij). Svejedno će se spremiti.</p>
                    ) : (
                      <p className="mt-[6px] font-sans text-[11px] text-[#4A4A5A]">Opcionalno. Klikni „Kreiraj Meet”, kopiraj link sobe i zalijepi ga ovdje. Bez linka članovi vide „Link uskoro”.</p>
                    )}
                  </div>

                  <div>
                    <span className={labelCls}>Pozadinska Slika (Opcionalno)</span>
                    <input
                      type="file"
                      accept="image/*"
                      id="event-image-upload"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadProgress !== null}
                    />
                    {form.bgImage ? (
                      <div className="relative w-full h-[160px] rounded-xl overflow-hidden">
                        <img src={form.bgImage} className="w-full h-full object-cover" alt="Pregled" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
                          <label
                            htmlFor="event-image-upload"
                            className="text-white font-bold text-sm bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm cursor-pointer"
                          >
                            {uploadProgress !== null ? `Učitavanje… ${uploadProgress}%` : 'Promijeni sliku'}
                          </label>
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, bgImage: '' }))}
                            disabled={uploadProgress !== null}
                            className="text-red-200 font-bold text-sm bg-red-500/40 px-4 py-2 rounded-lg backdrop-blur-sm"
                          >
                            Ukloni
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="event-image-upload"
                        className="w-full h-[160px] bg-[rgba(255,255,255,0.02)] border-2 border-dashed border-[rgba(255,255,255,0.1)] rounded-[16px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] transition-all"
                      >
                        <ImageIcon className="w-8 h-8 text-[#8B8FA8]" />
                        <span className="text-sm font-bold text-[#8B8FA8]">
                          {uploadProgress !== null ? `Učitavanje… ${uploadProgress}%` : 'Dodaj sliku'}
                        </span>
                      </label>
                    )}
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="event-description">Opis</label>
                    <textarea id="event-description" className={cn(inputCls, 'min-h-[100px]')} value={form.description} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, description: v })); }} placeholder="Detalji događaja..." maxLength={3000} />
                  </div>

                  <div className="flex gap-[12px] mt-[8px] pb-[4px]">
                    <button
                      onClick={handleSaveEvent}
                      disabled={saving || uploadProgress !== null}
                      className="flex-1 py-[14px] rounded-[14px] font-heading font-[700] uppercase text-white bg-[#3B82F6] hover:bg-[#2563EB] transition-colors text-[15px] shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-60"
                    >
                      {saving ? 'Spremam…' : editingId ? 'Spremi promjene' : 'Spremi događaj'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RSVP XP SUCCESS FLOATER */}
      <AnimatePresence>
        {justRsvpd && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-[100px] left-1/2 z-[100] bg-emerald-500 text-[#0A0A0F] px-[20px] py-[12px] rounded-full shadow-[0_4px_24px_rgba(16,185,129,0.4)] font-heading font-[800] text-[13px] flex items-center gap-[8px] whitespace-nowrap"
          >
            <Sparkles className="w-[16px] h-[16px]" />
            <span>Mjesto rezervirano! +{RSVP_XP} XP</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
