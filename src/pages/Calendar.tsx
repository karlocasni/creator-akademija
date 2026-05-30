import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Video, User, Check, AlertCircle, X, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: 'live_qa' | 'guest_lecture' | 'accountability';
  date: string;
  duration: string;
  zoomLink: string;
  speaker: string;
}

export default function Calendar() {
  const { profile, updateLocalProfile } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [rsvpList, setRsvpList] = useState<string[]>([]);
  const [justRsvpd, setJustRsvpd] = useState(false);

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

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const day = d.getDate();
    const months = ['Siječnja', 'Veljače', 'Ožujka', 'Travnja', 'Svibnja', 'Lipnja', 'Srpnja', 'Kolovoza', 'Rujna', 'Listopada', 'Studenog', 'Prosinca'];
    const month = months[d.getMonth()];
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return {
      formatted: `${day}. ${month} u ${hours}:${minutes}h`,
      day,
      month: month.substring(0, 3)
    };
  };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto pb-24">
      {/* HEADER */}
      <div className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-white mb-2">
            RASPORED <span className="text-primary font-permanent-marker normal-case tracking-normal">Događanja</span>
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest leading-relaxed max-w-md">
            Poveži se uživo, postavi pitanja Ismaelu i radi na svojoj odgovornosti.
          </p>
        </div>

        {/* STATS STRIP */}
        <div className="bg-white/5 border border-white/5 px-6 py-3 rounded-2xl flex gap-6 items-center text-center">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider block">Prijavljeno</span>
            <span className="text-xl font-black text-primary">{rsvpList.length} predavanja</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider block font-black text-emerald-400">Bodovi</span>
            <span className="text-xl font-black text-emerald-400">+{rsvpList.length * 50} XP</span>
          </div>
        </div>
      </div>

      {rsvpList.length === 0 && (
        <div className="mb-8 bg-primary/10 border border-primary/20 rounded-3xl p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Nisi se prijavio ni na jedno događanje!</h3>
            <p className="text-xs text-white/80 leading-relaxed mt-1">
              Prijavljivanjem na raspoređene Live Q&A i Accountability sastanke osiguravaš svoje mjesto te osvajaš <strong className="text-primary">+50 Creator XP</strong> za svaku prijavu. Odaberi događanje ispod i klikni "Rezerviraj Mjesto".
            </p>
          </div>
        </div>
      )}

      {/* RSVP XP SUCCESS FLOATER */}
      {justRsvpd && (
        <div className="fixed bottom-24 right-6 z-50 bg-emerald-500 text-black px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>Uspješno rezivirano! Osvojio si +50 XP! 🎉</span>
        </div>
      )}

      {/* EVENTS DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((e) => {
          const { formatted, day, month } = formatDate(e.date);
          const hasRsvpd = rsvpList.includes(e.id);
          
          return (
            <div
              key={e.id}
              onClick={() => setSelectedEvent(e)}
              className="ursa-card flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-[0_0_30px_rgba(246,168,69,0.15)] group transition-all"
            >
              {/* Event Top Badge */}
              <div className="relative p-6 pb-4 flex justify-between items-start">
                <div className="flex gap-2">
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                    e.type === 'live_qa' ? 'bg-primary/20 text-primary' : 
                    e.type === 'guest_lecture' ? 'bg-indigo-500/20 text-indigo-400' : 
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {e.type === 'live_qa' ? 'Live Q&A' : e.type === 'guest_lecture' ? 'Gost Predavač' : 'Accountability'}
                  </span>
                </div>
                
                {/* Date stamp box */}
                <div className="bg-white/5 border border-white/5 w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-base font-black text-white leading-none">{day}</span>
                  <span className="text-[9px] font-black uppercase text-primary tracking-wider mt-0.5">{month}</span>
                </div>
              </div>

              {/* Middle Title and info */}
              <div className="px-6 flex-1">
                <h3 className="font-black text-lg mb-2 text-white group-hover:text-primary transition-colors leading-snug uppercase">
                  {e.title}
                </h3>
                <p className="text-white/60 text-xs line-clamp-2 leading-relaxed whitespace-pre-wrap">{e.description}</p>
                
                <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4">
                  <span className="text-[11px] text-white/70 flex items-center gap-1.5 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {formatted} ({e.duration})
                  </span>
                  <span className="text-[11px] text-white/70 flex items-center gap-1.5 font-semibold">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Domaćin: {e.speaker}
                  </span>
                </div>
              </div>

              {/* Bottom booking row */}
              <div className="p-6 pt-4">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRsvp(e.id);
                  }}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    hasRsvpd
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-white/10 hover:bg-primary hover:text-black border border-white/5 text-white'
                  }`}
                >
                  {hasRsvpd ? (
                    <>
                      <Check className="w-4 h-4" /> Prijavljen
                    </>
                  ) : (
                    'Rezerviraj Mjesto'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EVENT DETAIL OVERLAY / DIALOG */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-lg glass p-8 rounded-[2.5rem] border-primary/20 animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Heading Badge */}
            <span className={`inline-block text-[9px] font-black uppercase px-3 py-1 rounded-full mb-4 ${
              selectedEvent.type === 'live_qa' ? 'bg-primary/20 text-primary' : 
              selectedEvent.type === 'guest_lecture' ? 'bg-indigo-500/20 text-indigo-400' : 
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {selectedEvent.type === 'live_qa' ? 'Live Q&A s Ismaelom' : selectedEvent.type === 'guest_lecture' ? 'Gostujući Predavač' : 'Accountability Meet'}
            </span>

            <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter text-white leading-tight">
              {selectedEvent.title}
            </h2>

            <p className="text-white/70 text-sm leading-relaxed mb-6 whitespace-pre-wrap">{selectedEvent.description}</p>

            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-4.5 h-4.5 text-primary" />
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Vrijeme i trajanje</span>
                  <span className="text-xs font-bold text-white">{formatDate(selectedEvent.date).formatted} ({selectedEvent.duration})</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <User className="w-4.5 h-4.5 text-primary" />
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Predavač / Host</span>
                  <span className="text-xs font-bold text-white">{selectedEvent.speaker}</span>
                </div>
              </div>
            </div>

            {/* RSVP / Zoom launch actions */}
            <div className="flex flex-col gap-3">
              {rsvpList.includes(selectedEvent.id) ? (
                <a
                  href={selectedEvent.zoomLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-4 bg-primary text-black rounded-xl font-black text-center text-sm uppercase tracking-wider hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Video className="w-5 h-5 stroke-[2.5px]" /> PRIDRUŽI SE NA ZOOM-U
                </a>
              ) : (
                <button
                  onClick={() => handleRsvp(selectedEvent.id)}
                  className="w-full py-4 bg-white/10 hover:bg-primary hover:text-black transition-colors rounded-xl font-black text-center text-sm uppercase tracking-wider border border-white/5"
                >
                  Rezerviraj Mjesto za Link
                </button>
              )}
              <span className="text-[10px] text-muted-foreground text-center block mt-1 uppercase tracking-widest">
                *Zoom link postaje aktivan nakon rezervacije mjesta.
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
