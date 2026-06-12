import { useState, useEffect } from 'react';
import { Lightbulb, ArrowLeft, Sparkles, Copy, Check, Bookmark, BookmarkCheck, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { bottomNavEventTarget } from '../components/layout/BottomNav';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const NIŠE = ['Lifestyle', 'Fitness', 'Edukacija', 'Humor', 'Gaming', 'Glazba', 'Hrana', 'Putovanja', 'Moda', 'Biznis', 'Motivacija'];
const CILJEVI = ['Viralni doseg', 'Novi pratitelji', 'Prodaja', 'Edukacija', 'Zabava'];
const PLATFORME = ['TikTok', 'Instagram Reels', 'YouTube Shorts'];

interface GeneratedIdea {
  hook: string;
  struktura: string[];
  caption: string;
  hashtagi: string[];
  zastoRadi: string;
}

// Simulated AI response engine — produces realistic Croatian structured output
function generateIdeaLocally(nisa: string, tema: string, publika: string, cilj: string, platforma: string): GeneratedIdea {
  const hooks: Record<string, string[]> = {
    'Viralni doseg': [
      `Ovo nitko od ${nisa.toLowerCase()} kreatora ne govori otvoreno...`,
      `Jedan trik koji je moju ${nisa.toLowerCase()} stranicu digao na 100k:`,
      `Grešaka u ${nisa.toLowerCase()} koje 99% ljudi radi svaki dan:`,
    ],
    'Novi pratitelji': [
      `Zašto me je 10.000 ljudi počelo pratiti u ${nisa.toLowerCase()} niši?`,
      `Ako nisi u ${nisa.toLowerCase()} zajednici — kasniš 2 godine:`,
      `Ovo me naučilo više o ${tema.toLowerCase() || nisa.toLowerCase()} nego 3 tečaja zajedno:`,
    ],
    'Prodaja': [
      `Kako zarađujem od ${nisa.toLowerCase()} bez milijun pratitelja:`,
      `Tajna prodaje kroz ${platforma} bez da izgledaš kao prodavač:`,
      `Ono što ${nisa.toLowerCase()} kreatori ne govore o zarade:`,
    ],
    'Edukacija': [
      `${tema || nisa} — sve što moraš znati u 60 sekundi:`,
      `Naučio sam ovo o ${tema.toLowerCase() || nisa.toLowerCase()} i promijenilo je sve:`,
      `Najvažnija lekcija o ${tema.toLowerCase() || nisa.toLowerCase()} koju nisam našao nigdje:`,
    ],
    'Zabava': [
      `POV: Ulaziš u ${nisa.toLowerCase()} zajednicu prvi put 😭`,
      `Kad ${publika.toLowerCase() || 'tvoja publika'} shvati da si u pravu o ${tema.toLowerCase() || nisa.toLowerCase()}:`,
      `Situacije koje razumiju samo ${nisa.toLowerCase()} kreatori:`,
    ],
  };

  const struktureTemplates = [
    [
      `Otvori s jakim vizualnim šokom ili izjavom`,
      `Predstavi problem koji tvoja publika (${publika || 'gledatelji'}) ima`,
      `Pokaži rješenje korak po korak — max 3 koraka`,
      `Dodaj socijalnu potvrdu (statistiku ili kratki rezultat)`,
      `Zatvori s jasnim pozivom na akciju i CTA za pratitelje`,
    ],
    [
      `Hook: postavi kontroverzan ili zanimljiv statement`,
      `Napravi kratki jump-cut montažu — drži gledatelje na ekranu`,
      `Ubaci text overlay s ključnom porukom za ${publika || 'publiku'}`,
      `Osobna priča ili dokaz iz iskustva — 10-15 sekundi`,
      `Outro: "Prati za više o ${tema || nisa}!"`,
    ],
    [
      `Počni s izravnim pitanjem prema ${publika || 'gledaocima'}`,
      `Lista 3 stvari koje nitko ne govori o ${tema || nisa}`,
      `Vizualni primjer ili screen recording — povećava retention`,
      `Twist ili iznenađenje u zadnjim 10 sekundi`,
      `Pitaj gledatelje: "Koje je tvoje iskustvo?" — boost komentara`,
    ],
  ];

  const captionTemplates = [
    `Jesi li ikad razmišljao o ${tema.toLowerCase() || nisa.toLowerCase()}? Evo što sam naučio. Podijeli s nekim kome treba! ⬇️`,
    `${nisa} kreatori — ovo je za vas. Spasi ovaj video za kad ti zatreba. 🔖\n\nPrati za dnevni sadržaj koji zapravo pomaže. ✅`,
    `Nitko ne govori o ovome u ${nisa.toLowerCase()} zajednici. Budi taj koji govori. 💪`,
  ];

  const hashtagiTemplates = [
    [`#${nisa.toLowerCase()}`, `#${tema.toLowerCase().replace(/\s+/g, '') || 'kreator'}`, '#creatorakademija', '#tiktokhrvatska', '#viral', '#sadrzaj', '#rast'],
    [`#kreator`, `#${nisa.toLowerCase()}savjeti`, '#balkancreator', '#contentcreator', '#shorts', '#reels', `#${cilj.toLowerCase().replace(/\s+/g, '')}`],
  ];

  const zastoRadiTemplates = [
    `Psihologija radoznalosti tjera gledatelje da ostanu do kraja. Kada najaviš tajnu ili kontroverzu u prvim 3 sekunde, moždana "itch" reakcija prisiljava nastavak gledanja. ${platforma} algoritam nagrađuje completion rate, pa ova formula direktno povećava distribuciju.`,
    `Publika koja se identificira s problemom (${publika || 'tvoja niša'}) odmah osjeća relevatnost sadržaja. Specifičnost niše smanjuje bounce rate i povećava follow rate jer gledatelji misle "ovo je napravljeno za mene".`,
    `FOMO (strah od propuštanja) je jedan od najjačih psiholoških okidača na kratkim videima. Framing oko "tajne" ili "greške" aktivira ovaj okidač i povećava share-ability — gledatelji šalju video prijateljima koji rade istu grešku.`,
  ];

  const randomHooks = hooks[cilj] || hooks['Viralni doseg'];
  return {
    hook: randomHooks[Math.floor(Math.random() * randomHooks.length)],
    struktura: struktureTemplates[Math.floor(Math.random() * struktureTemplates.length)],
    caption: captionTemplates[Math.floor(Math.random() * captionTemplates.length)],
    hashtagi: hashtagiTemplates[Math.floor(Math.random() * hashtagiTemplates.length)],
    zastoRadi: zastoRadiTemplates[Math.floor(Math.random() * zastoRadiTemplates.length)],
  };
}

export default function VideoIdeaGenerator() {
  const { profile, updateLocalProfile, user } = useAuth();
  const navigate = useNavigate();

  const [nisa, setNisa] = useState('Lifestyle');
  const [tema, setTema] = useState('');
  const [publika, setPublika] = useState('');
  const [cilj, setCilj] = useState('Viralni doseg');
  const [platforma, setPlatforma] = useState('TikTok');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedIdea | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);

  useEffect(() => {
    bottomNavEventTarget.dispatchEvent(new Event('hide'));
    return () => {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    };
  }, []);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setResult(null);
    setXpAwarded(false);
    setSaved(false);

    // Simulate AI thinking delay
    await new Promise(r => setTimeout(r, 1800));

    const idea = generateIdeaLocally(nisa, tema, publika, cilj, platforma);
    setResult(idea);
    setIsGenerating(false);
    setXpAwarded(true);

    if (profile) {
      updateLocalProfile({ xp: profile.xp + 30 });
    }
  };

  const formatFullText = (idea: GeneratedIdea) =>
    `**HOOK:** ${idea.hook}\n\n**STRUKTURA:**\n${idea.struktura.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**CAPTION:** ${idea.caption}\n\n**HASHTAGI:** ${idea.hashtagi.join(' ')}\n\n**ZAŠTO RADI:** ${idea.zastoRadi}`;

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(formatFullText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!result || !user) return;
    try {
      await addDoc(collection(db, 'videoIdeas'), {
        userId: user.uid,
        username: profile?.username || 'Korisnik',
        nisa,
        tema,
        publika,
        cilj,
        platforma,
        ...result,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const pillBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${
        active
          ? 'bg-[#F5A500] text-[#0A0A0F]'
          : 'bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden pb-[80px]">
      {/* TOP BAR */}
      <div className="pt-[24px] px-[16px] flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/tools')}
          className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[#8B8FA8] hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading font-[800] text-[20px] text-[#FFFFFF] leading-[1.1] uppercase">
            Ideje za Video
          </h1>
          <p className="font-sans text-[13px] text-[#8B8FA8]">AI generator kompletnih video ideja</p>
        </div>
        <div className="ml-auto bg-[#F5A500]/10 text-[#F5A500] px-3 py-1.5 rounded-full font-heading font-[800] text-[10px] tracking-widest uppercase flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3" /> +30 XP
        </div>
      </div>

      <div className="px-[16px] flex flex-col gap-5">
        {/* FORM CARD */}
        <div className="bg-[#111116] rounded-[24px] border border-[rgba(255,255,255,0.06)] p-[20px] flex flex-col gap-5">

          {/* Niša */}
          <div>
            <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#8B8FA8] block mb-2">Niša</label>
            <div className="relative">
              <select
                value={nisa}
                onChange={e => setNisa(e.target.value)}
                className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white appearance-none focus:border-[#F5A500] focus:outline-none transition-colors"
              >
                {NIŠE.map(n => <option key={n} value={n} className="bg-[#0A0A0F]">{n}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8FA8] pointer-events-none" />
            </div>
          </div>

          {/* Tema */}
          <div>
            <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#8B8FA8] block mb-2">Tema videa</label>
            <input
              value={tema}
              onChange={e => setTema(e.target.value)}
              placeholder="npr. jutarnja rutina..."
              className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#F5A500] focus:outline-none transition-colors"
            />
          </div>

          {/* Publika */}
          <div>
            <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#8B8FA8] block mb-2">Tvoja publika</label>
            <input
              value={publika}
              onChange={e => setPublika(e.target.value)}
              placeholder="npr. studenti 18-25..."
              className="w-full bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-[14px] py-3 px-4 text-[14px] text-white placeholder:text-[#4A4A5A] focus:border-[#F5A500] focus:outline-none transition-colors"
            />
          </div>

          {/* Cilj */}
          <div>
            <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#8B8FA8] block mb-3">Cilj</label>
            <div className="flex flex-wrap gap-2">
              {CILJEVI.map(c => pillBtn(c, cilj === c, () => setCilj(c)))}
            </div>
          </div>

          {/* Platforma */}
          <div>
            <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#8B8FA8] block mb-3">Platforma</label>
            <div className="flex gap-2">
              {PLATFORME.map(p => pillBtn(p, platforma === p, () => setPlatforma(p)))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-[#F5A500] text-[#0A0A0F] font-heading font-[800] text-[15px] rounded-full uppercase hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                AI GENERIRA IDEJU...
              </>
            ) : (
              <>
                <Lightbulb className="w-5 h-5" />
                GENERIŠI IDEJU
              </>
            )}
          </button>

          {xpAwarded && !isGenerating && (
            <div className="text-center py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono font-bold text-[11px] uppercase tracking-widest animate-pulse">
              🎉 +30 Creator XP dodan!
            </div>
          )}
        </div>

        {/* RESULT CARD */}
        {result && !isGenerating && (
          <div className="bg-[#111116] rounded-[24px] border border-[rgba(245,165,0,0.2)] p-[20px] flex flex-col gap-5"
            style={{ boxShadow: '0 0 30px rgba(245,165,0,0.05)' }}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-[800] text-[16px] text-white uppercase tracking-wide">Tvoja Idea</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-full text-[12px] font-bold text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Kopirano!' : 'Kopiraj sve'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-colors ${
                    saved
                      ? 'bg-[#F5A500]/20 text-[#F5A500] cursor-default'
                      : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white'
                  }`}
                >
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {saved ? 'Spremljeno!' : 'Spremi ideju'}
                </button>
              </div>
            </div>

            {/* Hook */}
            <ResultSection label="HOOK" color="#F5A500">
              <p className="font-heading font-[700] text-[17px] text-white leading-snug">"{result.hook}"</p>
            </ResultSection>

            {/* Struktura */}
            <ResultSection label="STRUKTURA" color="#F5A500">
              <ol className="flex flex-col gap-2">
                {result.struktura.map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="font-mono text-[#F5A500] font-bold text-[12px] mt-0.5 shrink-0">{i + 1}.</span>
                    <span className="font-sans text-[14px] text-white/85 leading-snug">{item}</span>
                  </li>
                ))}
              </ol>
            </ResultSection>

            {/* Caption */}
            <ResultSection label="CAPTION" color="#F5A500">
              <p className="font-sans text-[14px] text-white/85 leading-relaxed whitespace-pre-line">{result.caption}</p>
            </ResultSection>

            {/* Hashtagi */}
            <ResultSection label="HASHTAGI" color="#F5A500">
              <div className="flex flex-wrap gap-2">
                {result.hashtagi.map((h, i) => (
                  <span key={i} className="px-3 py-1 bg-[#F5A500]/10 text-[#F5A500] rounded-full font-mono text-[12px] font-bold">
                    {h}
                  </span>
                ))}
              </div>
            </ResultSection>

            {/* Zašto radi */}
            <ResultSection label="ZAŠTO RADI" color="#8B8FA8">
              <p className="font-sans text-[13px] text-[#8B8FA8] leading-relaxed">{result.zastoRadi}</p>
            </ResultSection>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultSection({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className="font-mono font-bold text-[10px] uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
