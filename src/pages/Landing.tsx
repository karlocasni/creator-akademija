import { 
  ArrowRight, CheckCircle2, Zap, Users, Play, Star, Sparkles, Instagram, Flame, Layers, Clock, ShieldCheck
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import AuthModal from '../components/auth/AuthModal';

export default function Landing() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const fadeIn = {
    initial: { opacity: 0, y: 25 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <div className="relative bg-background text-white overflow-x-hidden font-sans selection:bg-primary selection:text-black min-h-screen">
      {/* Global Grain/Noise Overlay */}
      <div className="fixed inset-0 bg-noise z-[100] pointer-events-none opacity-5" />
      
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        initialMode={authMode}
      />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-[60] py-4 px-6 md:px-12 flex justify-between items-center bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-lg md:text-2xl tracking-tighter uppercase text-white flex items-center gap-2">
            CREATOR <span className="text-primary font-permanent-marker normal-case tracking-normal text-xl md:text-3xl">Akademija</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => openAuth('login')}
            className="px-5 py-2 text-xs md:text-sm font-black text-white hover:text-primary transition-colors tracking-wider uppercase"
          >
            Prijava
          </button>
          <button 
            onClick={() => openAuth('register')}
            className="px-5 py-2.5 bg-primary text-black rounded-full font-black text-xs md:text-sm hover:scale-105 transition-transform tracking-wider uppercase shadow-md shadow-primary/20"
          >
            KRENI ODMAH
          </button>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden flex flex-col items-center">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-4xl text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary text-[10px] md:text-xs font-black uppercase tracking-widest">
              By Ismael Hadžić • Ekskluzivan Pristup
            </span>
          </motion.div>
          
          {/* Headline (Croatian - exact required copy) */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-2xl md:text-5xl font-extrabold tracking-tight leading-tight uppercase mb-6 text-white"
          >
            Svatko može snimiti video. <br />
            <span className="text-gradient">Ali samo oni koji razumiju algoritam i emociju mogu stvoriti prepoznatljiv brand na društvenim mrežama.</span>
          </motion.h1>
          
          {/* Subheadline (Croatian - exact required copy) */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base md:text-xl text-white/80 max-w-3xl mx-auto mb-8 font-medium leading-relaxed"
          >
            Creator Akademija ti pokazuje kako da postaneš upravo to – kreator kojeg ljudi vole gledati, dijeliti i pamtiti.
          </motion.p>

          {/* Body Paragraph (Croatian - exact required copy) */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-xs md:text-sm text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed bg-white/5 border border-white/5 rounded-3xl p-5 md:p-6 backdrop-blur-sm"
          >
            Dobrodošao u Creator Akademiju! Jesi spreman postati ekspert u kreiranju sadržaja za svoj društveni profil? Naučit ćeš što algoritmi stvarno žele, kako napraviti sadržaj koji se dijeli, komentira i pamti – i to bez skupih kamera ili agencija.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button 
              onClick={() => openAuth('register')}
              className="group w-full sm:w-auto px-8 py-4.5 bg-primary text-black rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(246,168,69,0.25)]"
            >
              UPADNI U AKADEMIJU <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="#vsl"
              className="w-full sm:w-auto px-8 py-4.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl font-bold text-center transition-colors"
            >
              POGLEDAJ VSL
            </a>
          </motion.div>
        </div>
      </section>

      {/* VSL (Video Sales Letter) SECTION */}
      <section id="vsl" className="py-16 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            {...fadeIn}
            className="text-center mb-8"
          >
            <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-2">Video Sales Letter (VSL)</span>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white leading-snug">
              KAKO GOSPODARITI ALGORITMOM U 2026.
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              Pogledaj uvodnu poruku Ismaela Hadžića i otkrij tajnu stvaranja videa koji privlače stotine tisuća pregleda.
            </p>
          </motion.div>

          <motion.div 
            {...fadeIn}
            className="relative aspect-video w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group"
          >
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-300">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-black shadow-lg">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
            </div>
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
              title="Creator Akademija VSL"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <motion.div 
          {...fadeIn}
          className="text-center mb-12"
        >
          <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-2">Social Proof & Rezultati</span>
          <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white">
            BROJKE GOVORE SAME ZA SEBE
          </h2>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { value: "1.1M", platform: "TikTok Pratitelja", label: "Najveća regionalna publika" },
            { value: "257,000", platform: "Instagram Pratitelja", label: "Visoki engagement & zajednica" },
            { value: "33,000", platform: "YouTube Pretplatnika", label: "Vjerni gledatelji dugog formata" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              {...fadeIn}
              className="ursa-card p-6 text-center border-l-4 border-l-primary flex flex-col justify-center"
            >
              <span className="text-3xl md:text-5xl font-black text-primary tracking-tight">{stat.value}</span>
              <span className="text-xs font-bold text-white uppercase tracking-wider mt-2 block">{stat.platform}</span>
              <span className="text-[10px] text-muted-foreground mt-1 block">{stat.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Trusted Brands Row */}
        <motion.div 
          {...fadeIn}
          className="bg-white/5 border border-white/5 rounded-3xl p-6 md:p-8 text-center"
        >
          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-6">
            POUZDANI PARTNERI I SVJETSKI BRANDOVI
          </span>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
            {['L’Oréal', 'Xiaomi', 'Grey Goose'].map((brand, idx) => (
              <span 
                key={idx} 
                className="text-xl md:text-2xl font-black uppercase text-white/50 tracking-wider hover:text-primary transition-colors cursor-default select-none"
              >
                {brand}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* VALUE STACK & DETAILS SECTION */}
      <section className="py-20 px-6 bg-white/[0.01] border-t border-white/5">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          
          {/* Details stack left */}
          <motion.div {...fadeIn} className="space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-2">Struktura Tečaja</span>
              <h2 className="text-2xl md:text-4xl font-black uppercase leading-tight text-white">
                SVE ŠTO DOBIVAŠ U <br /><span className="text-primary">CREATOR AKADEMIJI</span>
              </h2>
            </div>
            
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Creator Akademija je cjelokupan, strukturiran sistem dizajniran da te od apsolutne nule dovede do profesionalnog kreatora koji ostvaruje unosne sponzorske ugovore.
            </p>

            <div className="space-y-3.5">
              {[
                { label: "Lekcije na platformi", value: "9 premium modula" },
                { label: "Cijena pristupa", value: "Jednokratno 89€" },
                { label: "Ukupno trajanje", value: "1+ sat ekskluzivnog znanja" },
                { label: "Period pristupa", value: "Zauvijek (Lifetime)" },
                { label: "Privatni Discord", value: "Uskoro - Prvih 50 članova 40€ mjesečno" },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                  <span className="text-xs font-bold text-white/80">{item.label}</span>
                  <span className="text-xs font-black text-primary uppercase tracking-wider">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pricing Box Right */}
          <motion.div 
            {...fadeIn} 
            className="glass p-8 md:p-10 rounded-[2.5rem] border-primary/20 shadow-[0_0_60px_rgba(246,168,69,0.1)] relative sticky top-28"
          >
            <div className="absolute top-0 right-0 bg-primary text-black px-6 py-1.5 font-black rotate-45 translate-x-8 translate-y-5 text-[10px] tracking-widest uppercase">
              100% PREMIUM
            </div>

            <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">Doživotno Članstvo</span>
            <h3 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight">KREATOR AKADEMIJA</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-8">Pristupi bazi lekcija, alatima i globalnom chatu odmah.</p>

            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl md:text-6xl font-black text-white">89€</span>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">/ jednokratno</span>
            </div>

            <button 
              onClick={() => openAuth('register')}
              className="w-full py-4.5 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-primary/20 mb-6"
            >
              Kupi i Pristupi Odmah
            </button>

            <div className="space-y-3 pt-6 border-t border-white/5">
              {[
                "Instant otključavanje prvih 2 lekcija",
                "Creator XP gamificirani sustav napretka",
                "Viral Hook slot-machine generator",
                "Kalendar Live Q&A i predavanja uživo"
              ].map((txt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-[11px] font-bold text-white/70">{txt}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </section>

      {/* CURRICULUM PREVIEW */}
      <section className="py-20 px-6 max-w-4xl mx-auto">
        <motion.div {...fadeIn} className="text-center mb-16">
          <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-2">Program Tečaja</span>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white">
            NAŠ CURRICULUM OD 9 LEKCIJA
          </h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            Evo točnog rasporeda svih lekcija koje te čekaju u bazi znanja:
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "1. Dobrodošli u kreator akademiju (PRVO I PRVO! - 2 Min)",
            "2. Tko su influenceri uopće?",
            "3. Odabir niše (Odaberi svoj smjer - 4 Min)",
            "4. Kreiranje videa (Kako urediti video?)",
            "5. Objavljivanje sadržaja (Tajne objavljivanja)",
            "6. Količina objavljivanja (Koliko uploadati?)",
            "7. Interakcija s publikom (Poveži se s pratiteljima)",
            "8. Promjene algoritma (Kako preživjeti pad algoritma?)",
            "9. Suradnja s klijentima i partnerima (Kako zarađivati?)"
          ].map((title, idx) => (
            <motion.div 
              key={idx}
              {...fadeIn}
              className="bg-white/5 border border-white/5 rounded-2xl p-4.5 flex gap-3.5 items-center hover:bg-white/10 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">
                {idx + 1}
              </div>
              <span className="text-xs font-bold text-white/90 leading-snug">{title}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/10 text-center text-muted-foreground bg-black/20">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <span className="font-extrabold text-xl tracking-tighter uppercase text-white flex items-center gap-2">
            CREATOR <span className="text-primary font-permanent-marker normal-case tracking-normal text-2xl">Akademija</span>
          </span>
          <p className="text-xs max-w-sm leading-relaxed">
            Stani ispred kamere s punim samopouzdanjem. Razumi algoritme, emocije i stvori prepoznatljiv brand.
          </p>
          <div className="flex gap-4 mb-2">
            <span className="hover:text-primary transition-colors cursor-pointer"><Instagram className="w-5 h-5" /></span>
          </div>
          <div className="w-full h-[1px] bg-white/5 my-4" />
          <div className="text-[10px] space-y-1">
            <p>© 2026 by Creator Akademija. Sva prava pridržana.</p>
            <p className="opacity-40">Dizajnirao Ismael Hadžić & partners. Podrška 24/7.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
