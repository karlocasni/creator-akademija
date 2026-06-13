import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Video, User as UserIcon, Calendar, BookOpen, Sparkles, AlertCircle, ChevronRight, Compass } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types/post';
import { cn } from '../lib/utils';
import { calculateLevel } from '../lib/xp';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: 'live_qa' | 'guest_lecture' | 'accountability';
  date: string;
  duration: string;
  zoomLink: string;
  speaker: string;
  creatorId?: string;
  bgImage?: string;
}

interface Lecture {
  id: string;
  title: string;
  description: string;
  daysToUnlock: number;
  thumbnail: string;
  duration: string;
  category: string;
  youtubeId?: string;
  creatorId?: string;
}

export default function CreatorPage() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loadingCreator, setLoadingCreator] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [activeTab, setActiveTab] = useState<'predavanja' | 'tecajevi'>('predavanja');

  useEffect(() => {
    if (!creatorId) return;

    setLoadingCreator(true);
    // Fetch creator profile
    const profileRef = doc(db, 'profiles', creatorId);
    getDoc(profileRef).then((snap) => {
      if (snap.exists()) {
        setCreator(snap.data() as UserProfile);
      }
      setLoadingCreator(false);
    }).catch((err) => {
      console.error('Error fetching creator:', err);
      setLoadingCreator(false);
    });

    // Listen to events and filter for this creator
    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent));
      const filtered = allEvents.filter(e => e.creatorId === creatorId);
      
      // Sort by date ascending (soonest first)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const upcoming = filtered.filter(e => new Date(e.date) >= now);
      upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setEvents(upcoming);
    });

    // Listen to courses and filter for this creator
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const allCourses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lecture));
      const filtered = allCourses.filter(l => l.creatorId === creatorId);
      setLectures(filtered);
    });

    return () => {
      unsubEvents();
      unsubCourses();
    };
  }, [creatorId]);

  if (loadingCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0A0A0F] text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-white uppercase mb-2">Mentor nije pronađen</h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">Traženi profil ne postoji ili više nije označen kao mentor u sustavu.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors text-white">
          POVRATAK
        </button>
      </div>
    );
  }

  const avatarSrc = creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.username}`;
  const level = calculateLevel(creator.xp || 0);

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }) + 'h';
  };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto pb-28">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#8B8FA8] hover:text-[#F5A500] transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Povratak</span>
      </button>

      {/* Hero Header */}
      <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-gradient-to-br from-[#181824] via-[#111116] to-[#0A0A0F] p-8 md:p-10 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5A500]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
          
          {/* Avatar & Level Badge */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1 active-avatar">
              <img 
                src={avatarSrc} 
                alt={creator.username} 
                className="w-full h-full rounded-full object-cover" 
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#F5A500] text-black font-mono font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
              LVL {level}
            </div>
          </div>

          {/* Info Details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
                {creator.username}
              </h1>
              <span className="px-3 py-1 bg-[#F5A500]/10 border border-[#F5A500]/30 text-[#F5A500] rounded-full font-mono font-bold text-[10px] uppercase tracking-widest">
                Mentor
              </span>
            </div>

            {/* Main Topic Glow Badge */}
            {creator.mainTopic && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(245,165,0,0.08)] border border-[rgba(245,165,0,0.25)] rounded-full text-[#F5A500]">
                <Sparkles className="w-4 h-4" />
                <span className="font-heading font-bold text-xs uppercase tracking-wider">
                  Glavna Tema: {creator.mainTopic}
                </span>
              </div>
            )}

            {creator.bio && (
              <p className="text-[#8B8FA8] text-sm md:text-base leading-relaxed max-w-2xl">
                {creator.bio}
              </p>
            )}

            {/* Social Links */}
            {(creator.instagram || creator.tiktok || creator.youtube) && (
              <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                {creator.instagram && (
                  <a 
                    href={`https://instagram.com/${creator.instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-[#F5A500]/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-[#F5A500]"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                )}
                {creator.tiktok && (
                  <a 
                    href={`https://tiktok.com/@${creator.tiktok.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-[#F5A500]/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-[#F5A500]"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96-.5 3.9-1.5 5.56-1.14 1.83-3.1 3.12-5.26 3.4-2.18.29-4.52-.22-6.29-1.57-1.74-1.35-2.87-3.37-3.08-5.59-.2-2.22.42-4.51 1.82-6.25 1.34-1.63 3.33-2.67 5.43-2.84.4-.04.81-.04 1.21-.02v3.9c-.39-.02-.79-.04-1.18-.01-1.07.08-2.11.53-2.89 1.3-.77.78-1.22 1.83-1.26 2.92-.04 1.09.34 2.16 1.03 3.02.7.85 1.71 1.37 2.8 1.48 1.09.11 2.21-.21 3.09-.86.88-.65 1.42-1.61 1.56-2.69.14-1.07-.11-2.18-.7-3.09V.02h3.04z"/></svg>
                  </a>
                )}
                {creator.youtube && (
                  <a 
                    href={creator.youtube.startsWith('http') ? creator.youtube : `https://youtube.com/@${creator.youtube.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-[#F5A500]/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-[#F5A500]"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Tabs Selection */}
      <div className="flex gap-2 p-1 bg-[#111116] rounded-2xl border border-white/5 mb-8">
        <button
          onClick={() => setActiveTab('predavanja')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
            activeTab === 'predavanja'
              ? 'bg-[#F5A500] text-black font-black'
              : 'text-[#8B8FA8] hover:text-white'
          )}
        >
          <Calendar className="w-4 h-4" />
          Nadolazeća Predavanja ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('tecajevi')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
            activeTab === 'tecajevi'
              ? 'bg-[#F5A500] text-black font-black'
              : 'text-[#8B8FA8] hover:text-white'
          )}
        >
          <BookOpen className="w-4 h-4" />
          Prethodne Lekcije ({lectures.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* Tab 1: Nadolazeća Predavanja */}
        {activeTab === 'predavanja' && (
          events.length === 0 ? (
            <div className="ursa-card p-12 text-center border border-white/5">
              <Calendar className="w-10 h-10 text-[#8B8FA8] mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-sm font-medium">Trenutno nema zakazanih budućih predavanja za ovog mentora.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((event) => (
                <div 
                  key={event.id}
                  className="ursa-card p-6 flex flex-col justify-between hover:border-[#F5A500]/50 transition-colors group relative overflow-hidden"
                >
                  {event.bgImage && (
                    <>
                      <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: `url(${event.bgImage})` }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111116] to-transparent pointer-events-none" />
                    </>
                  )}
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                      <span className={cn(
                        "text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                        event.type === 'live_qa' ? 'bg-[#F5A500]/20 text-[#F5A500]' : 
                        event.type === 'guest_lecture' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                      )}>
                        {event.type === 'live_qa' ? 'Live Q&A' : event.type === 'guest_lecture' ? 'Gost' : 'Accountability'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.duration}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-[#F5A500] transition-colors leading-tight mb-2 uppercase">
                      {event.title}
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed mb-6 line-clamp-3">
                      {event.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto relative z-10">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Datum i vrijeme</span>
                      <span className="text-xs font-bold text-white mt-0.5">{formatDate(event.date)}</span>
                    </div>
                    <Link 
                      to={`/calendar?eventId=${event.id}`}
                      className="px-4 py-2 bg-white/5 border border-white/10 text-white group-hover:bg-[#F5A500] group-hover:text-black hover:scale-105 rounded-xl font-heading font-bold text-[10px] uppercase tracking-wider transition-all"
                    >
                      REZERVIRAJ
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab 2: Prethodne Lekcije */}
        {activeTab === 'tecajevi' && (
          lectures.length === 0 ? (
            <div className="ursa-card p-12 text-center border border-white/5">
              <BookOpen className="w-10 h-10 text-[#8B8FA8] mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-sm font-medium">Mentor još nije postavio lekcije u bazu znanja.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lectures.map((lecture) => (
                <div 
                  key={lecture.id}
                  onClick={() => navigate('/lectures')}
                  className="bg-[#111116] rounded-3xl border border-white/5 p-4 flex items-center gap-4 hover:border-[#F5A500]/50 transition-all cursor-pointer group"
                >
                  <div className="relative w-24 h-[4.5rem] rounded-xl overflow-hidden shrink-0">
                    <img 
                      src={lecture.thumbnail} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      alt={lecture.title} 
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Compass className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <span className="tag-category bg-white/5 text-[#8B8FA8] text-[9px] px-2 py-0.5 rounded-full inline-block mb-1">
                      {lecture.category}
                    </span>
                    <h3 className="font-heading font-bold text-sm text-white truncate leading-snug group-hover:text-[#F5A500] transition-colors mb-1">
                      {lecture.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{lecture.duration}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:text-[#F5A500] transition-colors" />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
