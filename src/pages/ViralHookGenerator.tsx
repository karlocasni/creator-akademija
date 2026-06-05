import { useState, useEffect } from 'react';
import { Sparkles, Copy, RefreshCw, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { bottomNavEventTarget } from '../components/layout/BottomNav';

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

export default function ViralHookGenerator() {
  const { profile, updateLocalProfile } = useAuth();
  const navigate = useNavigate();
  
  // Slot machine states
  const [attention, setAttention] = useState("Klikni na gumb ispod...");
  const [problem, setProblem] = useState("kako kreirati viralni sadržaj...");
  const [action, setAction] = useState("i dominirati algoritmom!");
  const [isSpinning, setIsSpinning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentHooks, setRecentHooks] = useState<string[]>([]);
  const [xpAwarded, setXpAwarded] = useState(false);

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

  // Hide bottom nav while on this page
  useEffect(() => {
    bottomNavEventTarget.dispatchEvent(new Event('hide'));
    return () => {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    };
  }, []);

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

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden pb-[24px]">
      
      {/* TOP BAR */}
      <div className="pt-[24px] px-[16px] flex items-center gap-3">
        <button 
          onClick={() => navigate('/tools')}
          className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#8B8FA8] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading font-[800] text-[20px] text-[#FFFFFF] leading-[1.1] uppercase">
          VIRAL HOOK GENERATOR
        </h1>
      </div>

      <div className="px-[16px] mt-6">
        <p className="font-sans font-[400] text-[14px] text-[#8B8FA8] mb-6">
          Zavrti slot mašinu i dobij pobjedničku kombinaciju za prvih 3 sekunde videa.
        </p>

        <div className="bg-[#111116] rounded-[24px] border border-[rgba(255,255,255,0.06)] p-[20px] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#F5A500]/10 text-[#F5A500] px-4 py-1.5 rounded-bl-[16px] font-heading font-[800] text-[10px] tracking-widest uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Roll daje +20 XP
          </div>

          <div className="flex items-center gap-[12px] mb-[16px]">
            <div className="w-[48px] h-[48px] rounded-full bg-[rgba(245,165,0,0.1)] text-[#F5A500] flex items-center justify-center shrink-0">
              <RefreshCw className={cn("w-[24px] h-[24px]", isSpinning && "animate-spin")} />
            </div>
            <h2 className="font-heading font-[700] text-[18px] text-[#FFFFFF]">Viral Hook Generator</h2>
          </div>

          {/* SLOT MACHINE VISUAL SCREEN */}
          <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.04)] rounded-[16px] p-[16px] flex flex-col gap-[12px] relative">
            <div className="absolute inset-y-0 left-4 w-[1px] bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.05)] to-transparent"></div>
            <div className="absolute inset-y-0 right-4 w-[1px] bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.05)] to-transparent"></div>

            {/* Slot 1: Attention */}
            <div className={cn(
              "text-center py-[12px] px-[16px] rounded-[12px] border font-heading font-[800] text-[14px] uppercase tracking-tight transition-all duration-75",
              isSpinning ? "bg-[#F5A500]/5 text-[#F5A500] border-[#F5A500]/20 blur-[0.5px]" : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] text-[#FFFFFF]"
            )}>
              {attention}
            </div>

            {/* Slot 2: Problem */}
            <div className={cn(
              "text-center py-[12px] px-[16px] rounded-[12px] border font-sans font-[600] text-[14px] italic transition-all duration-75",
              isSpinning ? "bg-[#F5A500]/5 text-[#F5A500] border-[#F5A500]/20 blur-[0.5px]" : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] text-[#FFFFFF]/90"
            )}>
              {problem}
            </div>

            {/* Slot 3: Action */}
            <div className={cn(
              "text-center py-[12px] px-[16px] rounded-[12px] border font-sans text-[13px] transition-all duration-75",
              isSpinning ? "bg-[#F5A500]/5 text-[#F5A500] border-[#F5A500]/20 blur-[0.5px]" : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] text-[#8B8FA8]"
            )}>
              {action}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-[8px] mt-[16px]">
            <button
              onClick={rollSlots}
              disabled={isSpinning}
              className="flex-1 py-[14px] bg-[#F5A500] text-[#0A0A0F] font-heading font-[700] text-[15px] rounded-full uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSpinning ? 'GENERIRAM...' : 'GENERIŠI UDICU'}
            </button>

            <button
              onClick={copyToClipboard}
              disabled={isSpinning || attention === "Klikni na gumb ispod..."}
              className="w-[52px] h-[52px] shrink-0 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#FFFFFF] rounded-full transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {copied ? <Check className="w-[20px] h-[20px] text-emerald-400" /> : <Copy className="w-[20px] h-[20px]" />}
            </button>
          </div>

          {/* XP AWARD NOTIFICATION */}
          {xpAwarded && !isSpinning && (
            <div className="mt-[12px] text-center py-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-sans font-[700] text-[11px] uppercase tracking-widest animate-pulse">
              🎉 +20 Creator XP dodan!
            </div>
          )}

          {/* RECENT HOOKS */}
          {recentHooks.length > 0 && (
            <div className="mt-[20px] pt-[20px] border-t border-[rgba(255,255,255,0.04)] flex flex-col gap-[12px]">
              <h3 className="font-heading font-[800] text-[13px] uppercase text-[#8B8FA8] tracking-widest">Nedavne Udice</h3>
              <div className="flex flex-col gap-[8px]">
                {recentHooks.map((h, i) => (
                  <div key={i} className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.04)] rounded-[12px] p-[12px] flex justify-between items-start gap-[12px]">
                    <p className="font-sans text-[12px] text-[#FFFFFF]/80 leading-[1.5] italic">{h}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(h);
                        alert('Kopirano!');
                      }}
                      className="p-1.5 bg-[rgba(255,255,255,0.05)] rounded-md hover:bg-[rgba(255,255,255,0.1)] text-[#8B8FA8] transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
