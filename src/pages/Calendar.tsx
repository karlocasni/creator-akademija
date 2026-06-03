import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Video, User, Check, AlertCircle, X, Sparkles, ChevronLeft, ChevronRight, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { bottomNavEventTarget } from '../components/layout/BottomNav';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: 'live_qa' | 'guest_lecture' | 'accountability';
  date: string;
  duration: string;
  zoomLink: string;
  speaker: string;
  bgImage?: string;
}

export default function Calendar() {
  const { profile, updateLocalProfile } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [rsvpList, setRsvpList] = useState<string[]>([]);
  const [justRsvpd, setJustRsvpd] = useState(false);

  // Admin Create Event Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'live_qa',
    duration: '60 min',
    zoomLink: 'https://zoom.us/j/123456789', // mock default
  });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Calendar Grid State
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Read events from mock Firestore
    const unsubscribe = onSnapshot(collection(db, 'events'), (snap) => {
      const dbEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
      setEvents(dbEvents);
    });
    
    // Load RSVPs from localStorage
    const saved = localStorage.getItem('creator_mock_rsvps');
    if (saved) {
      setRsvpList(JSON.parse(saved));
    }
    
    return unsubscribe;
  }, []);

  const handleRsvp = (eventId: string) => {
    if (rsvpList.includes(eventId)) return;
    
    const newList = [...rsvpList, eventId];
    setRsvpList(newList);
    localStorage.setItem('creator_mock_rsvps', JSON.stringify(newList));
    setJustRsvpd(true);
    
    // Award XP!
    if (profile) {
      updateLocalProfile({ xp: profile.xp + 50 });
    }
    
    setTimeout(() => {
      setJustRsvpd(false);
    }, 4000);
  };

  useEffect(() => {
    if (selectedEvent || showAddModal) {
      bottomNavEventTarget.dispatchEvent(new Event('hide'));
    } else {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    }
    return () => {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    };
  }, [selectedEvent, showAddModal]);

  const handleSaveEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.speaker) return;
    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        description: newEvent.description || '',
      });
      setShowAddModal(false);
      setNewEvent({
        type: 'live_qa',
        duration: '60 min',
        zoomLink: 'https://zoom.us/j/123456789',
      });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const storageRef = ref(storage, `events/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);

    setUploadProgress(0);
    task.on(
      'state_changed',
      (snapshot) => {
        setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (err) => {
        console.error("Upload error:", err);
        setUploadProgress(null);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setNewEvent({ ...newEvent, bgImage: url });
        setUploadProgress(null);
      }
    );
  };

  // Calendar Grid Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    // Convert Sunday (0) to 7, so Monday is 1, etc.
    return day === 0 ? 7 : day;
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  // Create array of blanks for padding, and numbers for the days
  const blanks = Array.from({ length: firstDay - 1 }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'];

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const day = d.getDate();
    const month = monthNames[d.getMonth()];
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return {
      formatted: `${day}. ${month} u ${hours}:${minutes}h`,
      day,
      month: month.substring(0, 3)
    };
  };

  // helper to get events for a specific day in the current viewed month
  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  const getEventBg = () => {
    if (!selectedEvent) return null;
    return selectedEvent.bgImage || null;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-full overflow-hidden pb-[24px]">
      {/* BACKGROUND LAYER */}
      <div className="fixed inset-0 z-[-3] bg-[#0A0A0F]" />

      {/* HEADER */}
      <div className="pt-[24px] px-[16px] flex items-center justify-between">
        <h1 className="font-heading font-[800] text-[28px] text-[#FFFFFF] leading-[1.1] mb-[4px] uppercase flex items-center gap-2">
          <span>RASPORED</span>
          <span className="text-[#F5A500] font-marker font-normal tracking-normal mt-1">DOGAĐANJA</span>
        </h1>
        {profile?.isAdmin && !selectedEvent && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-[40px] h-[40px] rounded-full bg-[#F5A500] text-[#0A0A0F] flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(245,165,0,0.4)]"
          >
            <Plus className="w-[20px] h-[20px]" />
          </button>
        )}
      </div>

      {/* CALENDAR GRID */}
      <div className="px-[16px] mt-[24px]">
        <div className="flex items-center justify-between mb-[16px] px-[8px]">
          <button onClick={prevMonth} className="p-2 text-[#8B8FA8] hover:text-white transition-colors bg-[rgba(255,255,255,0.05)] rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-heading font-[800] text-[18px] uppercase tracking-wider text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} className="p-2 text-[#8B8FA8] hover:text-white transition-colors bg-[rgba(255,255,255,0.05)] rounded-full">
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
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);
            const isSelected = selectedEvent && new Date(selectedEvent.date).getDate() === day;

            return (
              <div 
                key={day} 
                className="flex flex-col items-center justify-start h-[48px] cursor-pointer"
                onClick={() => {
                  if (dayEvents.length > 0) setSelectedEvent(dayEvents[0]);
                  else setSelectedEvent(null);
                }}
              >
                <div className={cn(
                  "w-[32px] h-[32px] flex items-center justify-center rounded-full font-heading font-[700] text-[16px] transition-all",
                  today && !isSelected ? "border-[2px] border-[#F5A500] text-[#F5A500]" : "text-white",
                  isSelected ? "bg-[#F5A500] text-[#0A0A0F]" : "hover:bg-[rgba(255,255,255,0.1)]"
                )}>
                  {day}
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex gap-[2px] mt-[4px]">
                    {dayEvents.map((e, i) => (
                      <div 
                        key={i} 
                        className="w-[4px] h-[4px] rounded-full"
                        style={{ 
                          backgroundColor: e.type === 'live_qa' ? '#F5A500' : e.type === 'guest_lecture' ? '#8B5CF6' : '#22C55E' 
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM SHEET FOR SELECTED EVENT */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[40]"
              onClick={() => setSelectedEvent(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[50] bg-[#111116] border-t border-[rgba(255,255,255,0.06)] rounded-t-[32px] p-[24px] pb-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {selectedEvent.bgImage && (
                <>
                  <div 
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-[0.3]" 
                    style={{ backgroundImage: `url(${selectedEvent.bgImage})` }} 
                  />
                  <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#111116] via-[#111116]/80 to-transparent" />
                  <div className="absolute inset-0 z-0 bg-black/40" />
                </>
              )}
              
              <div className="relative z-10">
                <div className="w-[40px] h-[4px] bg-[rgba(255,255,255,0.2)] rounded-full mx-auto mb-[24px]" />
              
              <div className="flex justify-between items-start mb-[16px]">
                <span className={cn("inline-block text-[10px] font-mono font-[700] uppercase tracking-widest px-[12px] py-[6px] rounded-full", 
                  selectedEvent.type === 'live_qa' ? 'bg-[#F5A500]/20 text-[#F5A500]' : 
                  selectedEvent.type === 'guest_lecture' ? 'bg-indigo-500/20 text-indigo-400' : 
                  'bg-emerald-500/20 text-emerald-400'
                )}>
                  {selectedEvent.type === 'live_qa' ? 'Live Q&A' : selectedEvent.type === 'guest_lecture' ? 'Gost' : 'Accountability'}
                </span>
                
                <div className="flex items-center gap-2">
                  {profile?.isAdmin && (
                    <button 
                      onClick={async () => {
                        if (window.confirm("Jesi siguran da želiš obrisati ovaj događaj?")) {
                          await deleteDoc(doc(db, 'events', selectedEvent.id));
                          setSelectedEvent(null);
                        }
                      }}
                      className="p-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/30 rounded-full transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setSelectedEvent(null)} className="p-2 text-[#8B8FA8] hover:text-white bg-[rgba(255,255,255,0.05)] rounded-full">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h2 className="font-heading font-[800] text-[32px] mb-[16px] uppercase text-[#FFFFFF] leading-[1.1] tracking-[-0.02em]">
                {selectedEvent.title}
              </h2>
              
              <p className="font-sans text-[14px] text-[#8B8FA8] leading-relaxed mb-[24px] line-clamp-3">
                {selectedEvent.description}
              </p>

              <div className="flex gap-[16px] mb-[24px]">
                <div className="flex items-center gap-[12px]">
                  <div className="w-[40px] h-[40px] rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                    <Clock className="w-[18px] h-[18px] text-[#F5A500]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono font-[700] text-[10px] text-[#8B8FA8] uppercase tracking-widest">Vrijeme</span>
                    <span className="font-sans font-[700] text-[14px] text-[#FFFFFF]">
                      {formatDate(selectedEvent.date).formatted.split(' u ')[1]} ({selectedEvent.duration})
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-[12px]">
                  <div className="w-[40px] h-[40px] rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                    <User className="w-[18px] h-[18px] text-[#F5A500]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono font-[700] text-[10px] text-[#8B8FA8] uppercase tracking-widest">Host</span>
                    <span className="font-sans font-[700] text-[14px] text-[#FFFFFF]">{selectedEvent.speaker}</span>
                  </div>
                </div>
              </div>

              {rsvpList.includes(selectedEvent.id) ? (
                <a
                  href={selectedEvent.zoomLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-heading font-[800] text-[14px] uppercase tracking-widest flex items-center justify-center gap-[8px]"
                >
                  <Check className="w-[18px] h-[18px]" /> PRIJAVLJEN (ZOOM LINK)
                </a>
              ) : (
                <button
                  onClick={() => handleRsvp(selectedEvent.id)}
                  className="w-full py-[16px] bg-[#F5A500] text-[#0A0A0F] rounded-full font-heading font-[800] text-[14px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform shadow-[0_0_20px_rgba(245,165,0,0.3)]"
                >
                  REZERVIRAJ MJESTO (+50 XP)
                </button>
              )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ADMIN ADD MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-[16px]">
            <div className="absolute inset-0 bg-[#0A0A0F]/90 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#111116] p-[24px] rounded-[24px] border border-[rgba(255,255,255,0.06)] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="font-heading font-[800] text-[24px] text-white uppercase mb-[24px]">Dodaj Događaj</h2>
              
              <div className="flex flex-col gap-[16px]">
                <div>
                  <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block">Naslov</label>
                  <input type="text" className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-[12px] text-white" value={newEvent.title || ''} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Naslov događaja" />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block">Tip</label>
                  <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-[12px] text-white" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                    <option value="live_qa">Live Q&A</option>
                    <option value="guest_lecture">Gost Predavač</option>
                    <option value="accountability">Accountability</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block">Datum</label>
                    <input type="date" className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-[12px] text-white" 
                      onChange={e => {
                        const dateVal = e.target.value; // YYYY-MM-DD
                        if (!dateVal) return;
                        const current = newEvent.date ? new Date(newEvent.date) : new Date();
                        const timeStr = current.toISOString().split('T')[1];
                        setNewEvent({...newEvent, date: `${dateVal}T${timeStr}`});
                      }} 
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block">Vrijeme (HH:MM)</label>
                    <input type="time" className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-[12px] text-white" 
                      onChange={e => {
                        const timeVal = e.target.value; // HH:mm
                        if (!timeVal) return;
                        const current = newEvent.date ? new Date(newEvent.date) : new Date();
                        const dateStr = current.toISOString().split('T')[0];
                        setNewEvent({...newEvent, date: `${dateStr}T${timeVal}:00.000Z`});
                      }} 
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block">Trajanje</label>
                  <input type="text" className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-[12px] text-white" value={newEvent.duration || ''} onChange={e => setNewEvent({...newEvent, duration: e.target.value})} placeholder="npr. 60 min" />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block">Host / Predavač</label>
                  <input type="text" className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-[12px] text-white" value={newEvent.speaker || ''} onChange={e => setNewEvent({...newEvent, speaker: e.target.value})} placeholder="Ime hosta" />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block">Pozadinska Slika (Opcionalno)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    id="event-image-upload"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {newEvent.bgImage ? (
                    <div className="relative w-full h-[160px] rounded-xl overflow-hidden group">
                      <img src={newEvent.bgImage} className="w-full h-full object-cover" alt="Preview" />
                      <label 
                        htmlFor="event-image-upload"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        <span className="text-white font-bold text-sm bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">Promijeni sliku</span>
                      </label>
                    </div>
                  ) : (
                    <label 
                      htmlFor="event-image-upload"
                      className="w-full h-[160px] bg-[rgba(255,255,255,0.02)] border-2 border-dashed border-[rgba(255,255,255,0.1)] rounded-[16px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] transition-all"
                    >
                      <ImageIcon className="w-8 h-8 text-[#8B8FA8]" />
                      <span className="text-sm font-bold text-[#8B8FA8]">
                        {uploadProgress !== null ? `Učitavanje... ${uploadProgress}%` : 'Dodaj sliku'}
                      </span>
                    </label>
                  )}
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#8B8FA8] uppercase tracking-widest mb-[8px] block">Opis</label>
                  <textarea className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] p-[12px] text-white min-h-[100px]" value={newEvent.description || ''} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="Detalji događaja..." />
                </div>

                <div className="flex gap-[12px] mt-[16px]">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-[12px] rounded-[12px] font-heading font-[700] uppercase text-[#8B8FA8] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors">Otkaži</button>
                  <button onClick={handleSaveEvent} className="flex-1 py-[12px] rounded-[12px] font-heading font-[700] uppercase text-[#0A0A0F] bg-[#F5A500] hover:bg-[#ffb31a] transition-colors">Spremi</button>
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
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className="fixed top-[100px] left-1/2 z-[100] bg-emerald-500 text-[#0A0A0F] px-[20px] py-[12px] rounded-full shadow-[0_4px_24px_rgba(16,185,129,0.4)] font-heading font-[800] text-[13px] flex items-center gap-[8px] whitespace-nowrap"
          >
            <Sparkles className="w-[16px] h-[16px]" />
            <span>Uspješno! +50 XP</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
