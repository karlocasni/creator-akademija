import {
  ArrowRight, CheckCircle2, Play, Sparkles, Instagram, Youtube, Facebook, Clock, Infinity as InfinityIcon,
  Lock, ChevronDown, Users, Trophy, Wand2, CalendarDays, MessageSquareText, Loader2
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { COURSE_LESSONS } from '../data/courseLessons';

const INTRO_VIDEO = '/media/intro.mp4';
const INTRO_POSTER = '/media/intro-poster.jpg';

const SOCIALS = {
  tiktok: 'https://www.tiktok.com/@creator_akademija',
  instagram: 'https://www.instagram.com/creator_akademija',
  youtube: 'https://www.youtube.com/@ismael_iso',
  facebook: 'https://www.facebook.com/p/ismael_iiso-100069105896801/',
};

const BRANDS = [
  { name: "L'Oréal", file: 'loreal.svg', h: 'h-4 md:h-5' },
  { name: 'Xiaomi', file: 'xiaomi.svg', h: 'h-10 md:h-12' },
  { name: 'Grey Goose', file: 'grey-goose.svg', h: 'h-11 md:h-14' },
  { name: 'Philips', file: 'philips.svg', h: 'h-4 md:h-5' },
  { name: 'Petrol', file: 'petrol.svg', h: 'h-7 md:h-8' },
  { name: 'CeraVe', file: 'cerave.svg', h: 'h-6 md:h-7' },
  { name: 'carVertical', file: 'carvertical.svg', h: 'h-4 md:h-5' },
  { name: 'Garnier', file: 'garnier.svg', h: 'h-4 md:h-5' },
];

const STATS = [
  { platform: 'TikTok', value: '1.1M', icon: 'tiktok' as const, href: SOCIALS.tiktok },
  { platform: 'Instagram', value: '257K', icon: 'instagram' as const, href: SOCIALS.instagram },
  { platform: 'YouTube', value: '33K', icon: 'youtube' as const, href: SOCIALS.youtube },
];

const FAQ = [
  {
    q: 'Što je Creator Akademija?',
    a: 'Online tečaj i zajednica za sve koji žele rasti na društvenim mrežama. Ismael Hadžić kroz video lekcije dijeli kako algoritam razmišlja, kako odabrati nišu, snimati, objavljivati i na kraju zarađivati od sadržaja – sve iz vlastitog iskustva s milijunskim pregledima i suradnjama s globalnim brendovima.',
  },
  {
    q: 'Koliko dugo imam pristup sadržaju?',
    a: 'Zauvijek. Plaćaš jednom i sve lekcije ostaju tvoje, uključujući buduće nadogradnje tečaja. Lekcije se otključavaju postupno – nova svaki dan – kako bi svaku stigao primijeniti prije sljedeće.',
  },
  {
    q: 'Koje su vrste plaćanja?',
    a: 'Tečaj se plaća jednokratno – 89€, bez pretplate i skrivenih troškova. Plaćanje se obavlja online prilikom registracije, a pristup dobivaš odmah nakon uplate.',
  },
  {
    q: 'Trebam li skupu opremu?',
    a: 'Ne. Sve što ti treba je mobitel. Cijela poanta je naučiti raditi sadržaj koji se dijeli i pamti – bez skupih kamera ili agencija.',
  },
  {
    q: 'Je li tečaj za mene ako tek počinjem?',
    a: 'Da. Tečaj je za sve razine – krećemo od toga tko su influenceri i kako odabrati svoj smjer, pa sve do objavljivanja, algoritma i suradnji s brendovima.',
  },
];

const PLATFORM_EXTRAS = [
  { icon: Users, text: 'Zajednica kreatora i feed za razmjenu ideja' },
  { icon: MessageSquareText, text: 'Predaj svoj video i dobij ocjenu mentora' },
  { icon: Wand2, text: 'Alati: Viral Hook generator, ideje za videe, trendovi' },
  { icon: Trophy, text: 'Izazovi i Creator XP ljestvica' },
  { icon: CalendarDays, text: 'Kalendar predavanja i događaja uživo' },
];

function parseDuration(d: string) {
  if (!d) return 0;
  const [m, s] = d.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}

const TOTAL_MINUTES = Math.round(COURSE_LESSONS.reduce((sum, l) => sum + parseDuration(l.duration), 0) / 60);
const HAS_UPCOMING = COURSE_LESSONS.some(l => l.comingSoon);
const RUNTIME_LABEL = `${TOTAL_MINUTES}${HAS_UPCOMING ? '+' : ''} min`;

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function PlatformIcon({ name, className }: { name: 'tiktok' | 'instagram' | 'youtube'; className?: string }) {
  if (name === 'tiktok') return <TikTokIcon className={className} />;
  if (name === 'instagram') return <Instagram className={className} />;
  return <Youtube className={className} />;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase text-primary tracking-[0.2em] mb-4">
      <span className="w-6 h-px bg-primary" />
      {children}
    </span>
  );
}

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: 'easeOut' },
};

function IntroVideo() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full rounded-[1.75rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-[0_30px_120px_-20px_rgba(59,130,246,0.35)]">
      {playing ? (
        <video
          src={INTRO_VIDEO}
          poster={INTRO_POSTER}
          controls
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 w-full h-full"
          aria-label="Pokreni uvodni video"
        >
          <img src={INTRO_POSTER} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary text-white shadow-[0_0_60px_rgba(59,130,246,0.7)] transition-transform duration-300 group-hover:scale-110">
              <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping" />
              <Play className="relative w-8 h-8 md:w-10 md:h-10 fill-current ml-1" />
            </span>
          </div>
          <div className="absolute left-5 bottom-5 md:left-8 md:bottom-7 text-left">
            <span className="block text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-primary">Uvodna poruka</span>
            <span className="block text-sm md:text-lg font-bold text-white">Ismael Hadžić · 1 min</span>
          </div>
        </button>
      )}
    </div>
  );
}

function DiscordWaitlist() {
  const [form, setForm] = useState({ discordName: '', fullName: '', email: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // Same shape the Firestore rule requires (name@domain.tld)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setStatus('error');
      return;
    }
    setStatus('sending');
    try {
      await addDoc(collection(db, 'discordWaitlist'), {
        discordName: form.discordName.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      });
      setStatus('done');
    } catch (err) {
      console.error('[Landing] Waitlist signup failed:', err);
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-8">
        <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-primary" />
        </div>
        <p className="text-lg font-bold text-white">Na listi si!</p>
        <p className="text-sm text-white/60 max-w-xs">Javit ćemo ti se prvi kad otvorimo Discord za buduće kreatore.</p>
      </div>
    );
  }

  const input = 'w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-primary transition-colors';
  return (
    <form onSubmit={submit} className="space-y-3">
      <input className={input} placeholder="Discord ime" value={form.discordName} maxLength={80} required
        onChange={e => setForm({ ...form, discordName: e.target.value })} />
      <input className={input} placeholder="Ime i prezime" value={form.fullName} maxLength={120} required autoComplete="name"
        onChange={e => setForm({ ...form, fullName: e.target.value })} />
      <input className={input} type="email" placeholder="Email" value={form.email} maxLength={200} required autoComplete="email"
        onChange={e => setForm({ ...form, email: e.target.value })} />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
      >
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <DiscordIcon className="w-5 h-5" />}
        Prijavi se
      </button>
      <p className="text-[11px] text-white/40 text-center leading-relaxed">
        Podatke koristimo samo da te obavijestimo o otvaranju Discorda.{' '}
        <Link to="/privatnost" className="underline underline-offset-2 hover:text-white/70">Pravila privatnosti</Link>
      </p>
      {status === 'error' && (
        <p className="text-xs text-red-400 text-center">Prijava nije uspjela. Provjeri podatke i pokušaj ponovno.</p>
      )}
    </form>
  );
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-2xl border transition-colors ${open ? 'border-primary/30 bg-primary/[0.04]' : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'}`}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-left px-5 py-5 md:px-7">
        <span className="font-bold text-white text-sm md:text-base">{q}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-primary transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 md:px-7 md:pb-6 text-sm text-white/65 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Landing() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [openFaq, setOpenFaq] = useState(0);

  const { authNotice } = useAuth();

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  // A forced sign-out (expired access, unverified email…) reopens the login form with the reason
  useEffect(() => {
    if (authNotice) openAuth('login');
  }, [authNotice]);

  return (
    <div className="relative bg-background text-white overflow-x-hidden font-sans selection:bg-primary selection:text-white min-h-screen">
      <div className="fixed inset-0 bg-noise z-[100] pointer-events-none opacity-5" />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode={authMode} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-[60] px-4 md:px-10 bg-background/75 backdrop-blur-xl border-b border-white/5"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center h-16 md:h-20">
          <a href="#top" className="font-extrabold text-base sm:text-lg md:text-2xl tracking-tighter uppercase text-white flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
            CREATOR <span className="text-primary font-marker normal-case tracking-normal text-lg sm:text-xl md:text-3xl">Akademija</span>
          </a>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-white/60">
            <a href="#tecaj" className="hover:text-white transition-colors">Tečaj</a>
            <a href="#lekcije" className="hover:text-white transition-colors">Lekcije</a>
            <a href="#discord" className="hover:text-white transition-colors">Discord</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-1.5 md:gap-3">
            <button
              onClick={() => openAuth('login')}
              className="px-2.5 md:px-5 min-h-[44px] text-xs md:text-sm font-black text-white hover:text-primary transition-colors tracking-wider uppercase whitespace-nowrap"
            >
              <span className="sm:hidden">Prijava</span>
              <span className="hidden sm:inline">Prijavi se</span>
            </button>
            <button
              onClick={() => openAuth('register')}
              className="px-4 md:px-6 min-h-[40px] md:min-h-[44px] bg-primary text-white rounded-full font-black text-xs md:text-sm hover:bg-[#2563EB] transition-colors tracking-wider uppercase shadow-lg shadow-primary/25 whitespace-nowrap"
            >
              <span className="sm:hidden">Započni</span>
              <span className="hidden sm:inline">Započni tečaj</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section id="top" className="relative pt-28 md:pt-36 pb-16 md:pb-24 px-4 md:px-10">
        <div className="absolute top-20 left-1/4 w-[520px] h-[520px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-40 right-0 w-[420px] h-[420px] bg-[#25F4EE]/[0.06] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-8 items-center">
          <div className="text-center lg:text-left z-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-[10px] md:text-xs font-black uppercase tracking-widest">By Ismael Hadžić</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-[3.25rem] leading-[0.95] sm:text-7xl xl:text-8xl font-extrabold tracking-tighter text-white mb-6"
            >
              Creator
              <span className="block font-marker font-normal tracking-normal text-primary text-[3.5rem] sm:text-7xl xl:text-[5.5rem] mt-1 drop-shadow-[0_0_30px_rgba(59,130,246,0.45)]">
                Akademija
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-xl md:text-2xl font-bold text-white leading-snug mb-3"
            >
              Svatko može snimiti video.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl font-semibold leading-snug mb-6 max-w-xl mx-auto lg:mx-0"
            >
              <span className="text-gradient">Ali samo oni koji razumiju algoritam i emociju mogu stvoriti prepoznatljiv brand na društvenim mrežama.</span>
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="space-y-3 text-sm md:text-base text-white/65 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-9"
            >
              <p>Creator Akademija ti pokazuje kako da postaneš upravo to – kreator kojeg ljudi vole gledati, dijeliti i pamtiti.</p>
              <p>Iza svakog uspješnog društvenog profila stoji strategija, znanje i upornost. Nauči upravljati njime u svoju korist, stvaraj sadržaj koji privlači pažnju te izgradi zajednicu koja raste iz dana u dan!</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <button
                onClick={() => openAuth('register')}
                className="group w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:bg-[#2563EB] active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(59,130,246,0.35)]"
              >
                Započni tečaj <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#discord"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 bg-[#5865F2]/15 border border-[#5865F2]/40 text-[#AAB2FF] hover:bg-[#5865F2]/25 transition-colors"
              >
                <DiscordIcon className="w-5 h-5" /> Discord – uskoro
              </a>
            </motion.div>
          </div>

          {/* Viral collage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto w-full max-w-[380px] sm:max-w-[420px] lg:max-w-[520px]"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <TikTokIcon className="absolute w-[95%] h-[95%] text-[#25F4EE]/[0.07] -translate-x-3 -translate-y-2" />
              <TikTokIcon className="absolute w-[95%] h-[95%] text-[#FE2C55]/[0.07] translate-x-3 translate-y-2" />
              <TikTokIcon className="absolute w-[95%] h-[95%] text-white/[0.04]" />
            </div>
            <div className="absolute inset-[15%] bg-primary/25 rounded-full blur-[90px] pointer-events-none" />
            <img
              src="/landing/hero-collage.webp"
              alt="Viralni videi s milijunima pregleda"
              width={689}
              height={937}
              className="relative w-full h-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
            />
          </motion.div>
        </div>
      </section>

      {/* ── Trusted by ─────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-14 border-y border-white/5 bg-white/[0.015]">
        <p className="text-center text-xs md:text-sm font-black uppercase tracking-[0.25em] text-white/45 mb-8">Trusted by</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="landing-marquee flex w-max items-center">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <div key={i} className="flex items-center justify-center px-8 md:px-14" aria-hidden={i >= BRANDS.length}>
                <img
                  src={`/landing/brands/${b.file}`}
                  alt={i < BRANDS.length ? b.name : ''}
                  className={`${b.h} w-auto opacity-55 hover:opacity-100 transition-opacity [filter:brightness(0)_invert(1)]`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Welcome + intro video ──────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-4 md:px-10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Dobrodošao u <br className="sm:hidden" />
              <span className="text-primary">Creator Akademiju!</span>
            </h2>
            <p className="text-base md:text-lg text-white/60 mt-4 max-w-2xl mx-auto">
              Jesi spreman postati ekspert u kreiranju sadržaja za svoj društveni profil?
            </p>
          </motion.div>
          <motion.div {...fadeIn}>
            <IntroVideo />
          </motion.div>
        </div>
      </section>

      {/* ── Što točno dobiješ ──────────────────────────────────────────────── */}
      <section id="tecaj" className="relative py-20 md:py-28 px-4 md:px-10 bg-white/[0.015] border-y border-white/5 scroll-mt-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
          <motion.div {...fadeIn}>
            <SectionLabel>Tečaj</SectionLabel>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.05] mb-4">
              Što točno dobiješ?
            </h2>
            <p className="text-lg md:text-2xl font-bold text-primary mb-8">
              Sve tajne i načine uspjeha kao na pladnju posluženo!
            </p>
            <div className="space-y-4 text-sm md:text-base text-white/65 leading-relaxed">
              <p>Naučit ćeš što algoritmi stvarno žele, kako napraviti sadržaj koji se dijeli, komentira i pamti – i to bez skupih kamera ili agencija.</p>
              <p>Dobit ćeš konkretne strategije i primjere koji su meni i mojim klijentima donijeli milijunske preglede i suradnje s globalnim brendovima poput <span className="text-white font-semibold">L’Oréala, Xiaomija i Grey Goosea</span>.</p>
              <p>Ovaj tečaj nije teorija, nego realno znanje iz prakse – što točno objaviti, kada, kako pričati u kameru i kako izgraditi zajednicu koja te stvarno voli, a ne samo prati.</p>
              <p>Ako želiš prestati nagađati i konačno razumjeti zašto neki kreatori eksplodiraju – a drugi stoje na mjestu, onda je ovo točno mjesto za tebe.</p>
            </div>
            <button
              onClick={() => openAuth('register')}
              className="group mt-9 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-wider inline-flex items-center gap-2 hover:bg-[#2563EB] transition-colors shadow-lg shadow-primary/25"
            >
              Idi na tečaj <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          <motion.div {...fadeIn} className="space-y-4">
            {STATS.map((s) => (
              <a
                key={s.platform}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-5 p-5 md:p-6 rounded-3xl glass border border-white/[0.07] hover:border-primary/40 transition-colors"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <PlatformIcon name={s.icon} className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <span className="block text-3xl md:text-5xl font-extrabold tracking-tight text-white">{s.value}</span>
                  <span className="block text-xs md:text-sm font-bold uppercase tracking-wider text-white/50">pratitelja · {s.platform}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </a>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Curriculum ─────────────────────────────────────────────────────── */}
      <section id="lekcije" className="py-20 md:py-28 px-4 md:px-10 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-12 md:mb-16">
            <SectionLabel>Sadržaj</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
              Postani influencer ili <span className="text-primary">unaprijedi svoj brand</span>
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-6 text-xs md:text-sm font-bold text-white/70">
              <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10">{COURSE_LESSONS.length} video lekcija</span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {RUNTIME_LABEL} sadržaja</span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10">Za sve razine</span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5"><InfinityIcon className="w-3.5 h-3.5" /> Pristup zauvijek</span>
            </div>
          </motion.div>

          <div className="space-y-3">
            {COURSE_LESSONS.map((l, idx) => (
              <motion.div
                key={l.id}
                {...fadeIn}
                transition={{ duration: 0.5, delay: Math.min(idx * 0.04, 0.2) }}
                className="group flex gap-4 md:gap-6 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-white/[0.025] border border-white/[0.07] hover:border-primary/30 hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-11 h-11 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-extrabold text-base md:text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="text-base md:text-lg font-bold text-white leading-snug">{l.title}</h3>
                    {l.comingSoon ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">Uskoro</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-mono text-white/45">
                        {idx === 0 ? <Play className="w-3 h-3 text-primary fill-current" /> : <Lock className="w-3 h-3" />}
                        {l.duration}
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-bold text-primary mt-0.5">{l.subtitle}</p>
                  <p className="text-xs md:text-sm text-white/55 leading-relaxed mt-2">{l.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.p {...fadeIn} className="text-center text-xs md:text-sm text-white/50 mt-8">
            Lekcije se otključavaju postupno – nova svaki dan – a uskoro stiže još sadržaja od vodećih kreatora s Balkana.
          </motion.p>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="cijena" className="relative py-20 md:py-28 px-4 md:px-10 bg-white/[0.015] border-y border-white/5 scroll-mt-20 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <motion.div {...fadeIn}>
            <SectionLabel>Pristup</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-5">
              Tečaj + cijela <span className="text-primary">Creator platforma</span>
            </h2>
            <p className="text-sm md:text-base text-white/60 leading-relaxed mb-8">
              Uz video lekcije dobivaš i pristup platformi na kojoj učiš zajedno s drugim kreatorima.
            </p>
            <div className="space-y-3">
              {PLATFORM_EXTRAS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3.5">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-white/80">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeIn}
            className="glass p-7 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-primary/25 shadow-[0_0_80px_rgba(59,130,246,0.15)]"
          >
            <span className="text-[11px] font-black uppercase text-primary tracking-widest">Doživotni pristup</span>
            <h3 className="text-xl md:text-2xl font-extrabold text-white mt-1">Postani influencer ili unaprijedi svoj brand</h3>
            <div className="flex items-baseline gap-2 my-7">
              <span className="text-6xl md:text-7xl font-extrabold text-white tracking-tight">89€</span>
              <span className="text-xs text-white/50 uppercase font-black tracking-widest">jednokratno</span>
            </div>
            <div className="space-y-3 mb-8">
              {[
                `${COURSE_LESSONS.length} video lekcija (${RUNTIME_LABEL})`,
                'Pristup zauvijek, bez pretplate',
                'Instruktor: Ismael Hadžić',
                'Sve buduće nadogradnje tečaja',
              ].map((txt) => (
                <div key={txt} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-white/80">{txt}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => openAuth('register')}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-[#2563EB] active:scale-[0.98] transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              Započni tečaj <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Discord ────────────────────────────────────────────────────────── */}
      <section id="discord" className="py-20 md:py-28 px-4 md:px-10 scroll-mt-20">
        <div className="max-w-6xl mx-auto rounded-[2rem] md:rounded-[3rem] border border-[#5865F2]/25 bg-gradient-to-br from-[#5865F2]/[0.12] via-transparent to-primary/[0.06] p-6 md:p-14 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <motion.div {...fadeIn}>
            <span className="inline-block text-[11px] font-black uppercase tracking-[0.25em] text-[#AAB2FF] bg-[#5865F2]/20 border border-[#5865F2]/40 px-3 py-1 rounded-full mb-5">Uskoro</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-5">
              Budi dio <span className="text-[#8C95FF]">Discord zajednice</span>
            </h2>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-5">
              <span className="text-sm font-black uppercase tracking-wider text-white">Prvih 50 članova</span>
              <span className="text-white/40 line-through text-lg font-bold">50€</span>
              <span className="text-3xl font-extrabold text-white">40€<span className="text-sm text-white/50 font-bold"> / mjesečno</span></span>
            </div>
            <p className="text-sm md:text-base text-white/65 leading-relaxed max-w-md">
              Budi dio zajednice koja dijeli znanje, ideje i trikove za rast na društvenim mrežama. Poveži se, uči i napreduj zajedno s drugima.
            </p>
          </motion.div>

          <motion.div {...fadeIn} className="rounded-3xl bg-background/80 border border-white/10 p-6 md:p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 shrink-0 rounded-2xl bg-[#5865F2] flex items-center justify-center">
                <DiscordIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-white leading-tight">Pridruži se listi čekanja</p>
                <p className="text-xs text-white/50">Prvi saznaj kada otvaramo Discord za buduće kreatore.</p>
              </div>
            </div>
            <DiscordWaitlist />
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 md:py-28 px-4 md:px-10 bg-white/[0.015] border-t border-white/5 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-10 md:mb-14">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">Često postavljena pitanja</h2>
          </motion.div>
          <motion.div {...fadeIn} className="space-y-3">
            {FAQ.map((item, i) => (
              <FaqItem key={item.q} q={item.q} a={item.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-24 px-4 md:px-10">
        <motion.div {...fadeIn} className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-5">
            Ovdje počinje tvoja <span className="font-marker font-normal text-primary">Creator</span> karijera.
          </h2>
          <p className="text-sm md:text-base text-white/60 max-w-xl mx-auto mb-8">
            Prestani nagađati. Nauči kako algoritam misli, kako publika diše i kako brendovi pregovaraju.
          </p>
          <button
            onClick={() => openAuth('register')}
            className="group px-10 py-4 bg-primary text-white rounded-2xl font-black text-base inline-flex items-center gap-2 hover:bg-[#2563EB] transition-colors shadow-[0_0_40px_rgba(59,130,246,0.35)]"
          >
            Započni tečaj <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="py-12 px-4 md:px-10 border-t border-white/10 bg-black/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-extrabold text-xl tracking-tighter uppercase text-white flex items-center gap-2">
              CREATOR <span className="text-primary font-marker normal-case tracking-normal text-2xl">Akademija</span>
            </span>
            <a href={SOCIALS.youtube} target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-primary transition-colors">@ismael_iso</a>
          </div>
          <div className="flex items-center gap-3">
            {[
              { href: SOCIALS.facebook, label: 'Facebook', icon: <Facebook className="w-5 h-5" /> },
              { href: SOCIALS.tiktok, label: 'TikTok', icon: <TikTokIcon className="w-5 h-5" /> },
              { href: SOCIALS.instagram, label: 'Instagram', icon: <Instagram className="w-5 h-5" /> },
              { href: SOCIALS.youtube, label: 'YouTube', icon: <Youtube className="w-5 h-5" /> },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-primary hover:border-primary transition-colors">
                {s.icon}
              </a>
            ))}
          </div>
        </div>
        <p className="max-w-6xl mx-auto text-center md:text-left text-xs text-white/35 mt-10">
          © {new Date().getFullYear()} Creator Akademija · GRIZLI GANG d.o.o. Sva prava pridržana. ·{' '}
          <Link to="/privatnost" className="underline underline-offset-2 hover:text-white/70 transition-colors">Pravila privatnosti</Link>
        </p>
      </footer>
    </div>
  );
}
