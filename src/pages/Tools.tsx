import { useState, useEffect } from 'react';
import { Sparkles, Copy, Music, Flame, Search, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ATTENTIONS = [
  "Svi ti lažu o...",
  "Evo zašto tvoj...",
  "Ova 1 tajna...",
  "Prestani raditi...",
  "Svi su u šoku zbog...",
  "Ovo je jedina stvar koja...",
  "Izbaci ovo iz...",
  "Ako želiš 10k pratitelja..."
];

const PROBLEMS = [
  "kako privući preglede na društvenim mrežama.",
  "tvom lošem i dosadnom editiranju.",
  "novom tajanstvenom algoritmu.",
  "ovim skupim i glupim greškama.",
  "tvojim starim i zaboravljenim videima.",
  "gubitku pažnje u prve 3 sekunde.",
  "snimanju bez jasnog cilja i plana.",
  "tvojoj strašnoj tremi pred kamerom."
];

const ACTIONS = [
  "Učini ovo i pregledi će skočiti za 10x!",
  "Pogledaj ovaj video do kraja za točnu formulu.",
  "Evo točnog koraka koji ti treba odmah.",
  "Ovo mijenja apsolutno sve što znaš.",
  "Spremi ovaj video prije nego ga algoritmi obrišu.",
  "Zapiši ovaj trik jer ga nitko ne dijeli besplatno.",
  "Klikni i kreni primjenjivati ove sekunde.",
  "Ismael ti točno objašnjava kako u novoj lekciji."
];

const TRENDS = [
  { id: 1, type: "audio", name: "Ismael Hadžić - Hook Master Beats", creator: "ismael.hadzic", usage: 42100, reach: "1.4M", trend: "high" },
  { id: 2, type: "audio", name: "Cyberpunk Synthwave - Loop", creator: "neon_sound", usage: 18400, reach: "680K", trend: "medium" },
  { id: 3, type: "format", name: "Zeleni Zaslon (Green Screen) reakcija na tuđi viralni video", creator: "Tutorijal u Lekciji 4", usage: 89000, reach: "3.2M", trend: "high" },
  { id: 4, type: "hashtag", name: "#CreatorAkademija", creator: "Zajednički Tag", usage: 5300, reach: "890K", trend: "high" },
  { id: 5, type: "format", name: "Tekst iznad glave s brzim rezovima (Text-over-head cut)", creator: "Montažerski trik", usage: 31200, reach: "1.1M", trend: "medium" },
];

export default function Tools() {
  const { profile, updateLocalProfile } = useAuth();
  
  // Slot machine states
  const [attention, setAttention] = useState("Klikni na gumb ispod...");
  const [problem, setProblem] = useState("kako kreirati viralni sadržaj...");
  const [action, setAction] = useState("i dominirati algoritmom!");
  const [isSpinning, setIsSpinning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentHooks, setRecentHooks] = useState<string[]>([]);
  const [xpAwarded, setXpAwarded] = useState(false);

  // Filter trends
  const [filter, setFilter] = useState<'all' | 'audio' | 'format' | 'hashtag'>('all');

  const rollSlots = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setCopied(false);
    setXpAwarded(false);
    
    let ticks = 0;
    const interval = setInterval(() => {
      setAttention(ATTENTIONS[Math.floor(Math.random() * ATTENTIONS.length)]);
      setProblem(PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)]);
      setAction(ACTIONS[Math.floor(Math.random() * ACTIONS.length)]);
      ticks++;
      if (ticks >= 10) {
        clearInterval(interval);
        setIsSpinning(false);
        setXpAwarded(true);
        
        // Award XP!
        if (profile) {
          updateLocalProfile({ xp: profile.xp + 20 });
        }
      }
    }, 100);
  };

  // Add generated hook to recents once spinning stops
  useEffect(() => {
    if (!isSpinning && attention !== "Klikni na gumb ispod...") {
      const fullHook = `${attention} ${problem} ${action}`;
      setRecentHooks(prev => [fullHook, ...prev.slice(0, 4)]);
    }
  }, [isSpinning]);

  const copyToClipboard = () => {
    const fullHook = `${attention} ${problem} ${action}`;
    navigator.clipboard.writeText(fullHook);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTrends = TRENDS.filter(t => filter === 'all' || t.type === filter);

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto pb-24">
      {/* HEADER */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-white mb-2">
          CREATOR <span className="text-primary font-permanent-marker normal-case tracking-normal">Alati</span>
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest leading-relaxed">
          Tvoje tajno oružje za osmišljavanje viralnog sadržaja i praćenje trendova.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* VIRAL HOOK GENERATOR (SLOTS) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="ursa-card p-6 md:p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/10 text-primary px-4 py-1.5 rounded-bl-2xl font-black text-[10px] tracking-widest uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Roll daje +20 XP
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                Viral Hook <span className="text-primary">Generator</span>
              </h2>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mt-1">
                Uvodne 3 sekunde su najvažnije. Spinaj za privlačenje pažnje!
              </p>
            </div>

            {/* SLOT MACHINE VISUAL SCREEN */}
            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col gap-4 shadow-inner relative">
              <div className="absolute inset-y-0 left-4 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
              <div className="absolute inset-y-0 right-4 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

              {/* Slot 1: Attention */}
              <div className={`text-center py-3 px-4 rounded-xl border border-white/5 font-black text-sm md:text-base uppercase tracking-tight transition-all duration-75 ${isSpinning ? 'bg-primary/5 text-primary scale-98 border-primary/20 blur-[0.5px]' : 'bg-white/5 text-white'}`}>
                {attention}
              </div>

              {/* Slot 2: Problem */}
              <div className={`text-center py-3 px-4 rounded-xl border border-white/5 font-semibold text-sm md:text-base italic transition-all duration-75 ${isSpinning ? 'bg-primary/5 text-primary scale-98 border-primary/20 blur-[0.5px]' : 'bg-white/5 text-white/90'}`}>
                {problem}
              </div>

              {/* Slot 3: Action */}
              <div className={`text-center py-3 px-4 rounded-xl border border-white/5 text-xs md:text-sm transition-all duration-75 ${isSpinning ? 'bg-primary/5 text-primary scale-98 border-primary/20 blur-[0.5px]' : 'bg-white/5 text-muted-foreground'}`}>
                {action}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3">
              <button
                onClick={rollSlots}
                disabled={isSpinning}
                className="flex-1 py-4 bg-primary text-black font-black text-sm md:text-base rounded-2xl tracking-wider uppercase hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                {isSpinning ? 'GENERIRAM...' : 'GENERIŠI UDICU'}
              </button>

              <button
                onClick={copyToClipboard}
                disabled={isSpinning || attention === "Klikni na gumb ispod..."}
                className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Kopiraj udicu"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* XP AWARD NOTIFICATION MICRO-ANIMATION */}
            {xpAwarded && !isSpinning && (
              <div className="text-center py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold text-xs uppercase tracking-widest animate-pulse">
                🎉 +20 Creator XP je dodan u tvoj profil!
              </div>
            )}
          </div>

          {/* RECENT HOOKS */}
          {recentHooks.length > 0 && (
            <div className="ursa-card p-6 flex flex-col gap-4">
              <h3 className="font-black text-sm uppercase text-white tracking-widest">Nedavne Udice</h3>
              <div className="flex flex-col gap-3">
                {recentHooks.map((h, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-start gap-4 hover:bg-white/10 transition-colors group">
                    <p className="text-xs text-white/80 leading-relaxed italic">{h}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(h);
                        alert('Kopirano!');
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TREND TRACKER BOARD */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="ursa-card p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary animate-pulse" /> Trend <span className="text-primary">Tracker</span>
              </h2>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mt-1">
                Analiza trending formata, zvuka i hashtagova u realnom vremenu.
              </p>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-black/20 border border-white/5 rounded-xl">
              {['all', 'audio', 'format', 'hashtag'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors ${filter === f ? 'bg-primary text-black' : 'text-white/60 hover:text-white'}`}
                >
                  {f === 'all' ? 'Sve' : f === 'audio' ? 'Zvuk' : f === 'format' ? 'Format' : 'Tag'}
                </button>
              ))}
            </div>

            {/* TRENDS LIST */}
            <div className="flex flex-col gap-3">
              {filteredTrends.map((t) => (
                <div key={t.id} className="bg-white/5 hover:bg-white/10 transition-all border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                      {t.type === 'audio' ? <Music className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white leading-snug">{t.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Izvor: {t.creator}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary/20 text-primary">
                      {t.reach} doseg
                    </span>
                    <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-widest">{t.usage} videa</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 text-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1">PRO-TIP ZA MONTAŽU</span>
              <p className="text-xs text-white/80 leading-relaxed">
                Kombiniranjem viralnih audio zapisa u pozadini i hooka iz generatora s lijeve strane povećavaš šansu za plasiranje na For You Page za čak <strong className="text-primary">340%</strong>!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
