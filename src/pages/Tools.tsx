import { Sparkles, Flame, Zap, Lightbulb, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Tools() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden pb-[24px]">
      {/* PAGE HERO SECTION */}
      <div className="pt-[24px] px-[16px] flex flex-col">
        <h1 className="font-heading font-[800] text-[28px] text-[#FFFFFF] leading-[1.1] mb-[4px] uppercase flex items-center gap-2">
          <span>CREATOR</span>
          <span className="text-[#F5A500] font-marker font-normal tracking-normal mt-1">ALATI</span>
        </h1>
        <p className="font-sans font-[400] text-[14px] text-[#8B8FA8]">
          Tvoje tajno oružje za viralni sadržaj i trendove.
        </p>
      </div>

      {/* TOOLS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] p-[16px] mt-2">
        
        {/* CARD 1: VIRAL HOOK GENERATOR */}
        <div 
          onClick={() => navigate('/tools/hook-generator')}
          className="bg-[#111116] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-[24px] relative overflow-hidden cursor-pointer hover:border-[#F5A500]/30 transition-colors group"
        >
          <div className="absolute top-0 right-0 bg-[#F5A500]/10 text-[#F5A500] px-4 py-1.5 rounded-bl-[16px] font-heading font-[800] text-[10px] tracking-widest uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> +20 XP PO ROLLU
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="w-[56px] h-[56px] rounded-full bg-[rgba(245,165,0,0.1)] text-[#F5A500] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Zap className="w-[28px] h-[28px] fill-[#F5A500]/20" />
            </div>
            <div>
              <h2 className="font-heading font-[800] text-[22px] text-[#FFFFFF] leading-tight mb-2 uppercase">Viral Hook Generator</h2>
              <p className="font-sans text-[14px] text-[#8B8FA8]">Generiši udicu za prvih 3 sekunde videa.</p>
            </div>
          </div>
        </div>

        {/* CARD 2: TREND TRACKER */}
        <div 
          onClick={() => navigate('/tools/trend-tracker')}
          className="bg-[#111116] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-[24px] relative overflow-hidden cursor-pointer hover:border-[#F5A500]/30 transition-colors group"
        >
          <div className="absolute top-0 right-0 bg-[#F5A500]/10 text-[#F5A500] px-4 py-1.5 rounded-bl-[16px] font-heading font-[800] text-[10px] tracking-widest uppercase flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F5A500] animate-pulse" /> LIVE
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="w-[56px] h-[56px] rounded-full bg-[rgba(245,165,0,0.1)] text-[#F5A500] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Flame className="w-[28px] h-[28px] fill-[#F5A500]/20" />
            </div>
            <div>
              <h2 className="font-heading font-[800] text-[22px] text-[#FFFFFF] leading-tight mb-2 uppercase">Trend Tracker</h2>
              <p className="font-sans text-[14px] text-[#8B8FA8]">Trending zvukovi, formati i hashtagovi.</p>
            </div>
          </div>
        </div>

        {/* CARD 3: AI VIDEO IDEA GENERATOR */}
        <div 
          onClick={() => navigate('/tools/video-ideas')}
          className="bg-[#111116] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-[24px] relative overflow-hidden cursor-pointer hover:border-[#F5A500]/30 transition-colors group"
        >
          <div className="absolute top-0 right-0 bg-[#F5A500]/10 text-[#F5A500] px-4 py-1.5 rounded-bl-[16px] font-heading font-[800] text-[10px] tracking-widest uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> +30 XP
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="w-[56px] h-[56px] rounded-full bg-[rgba(245,165,0,0.1)] text-[#F5A500] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Lightbulb className="w-[28px] h-[28px] fill-[#F5A500]/20" />
            </div>
            <div>
              <h2 className="font-heading font-[800] text-[22px] text-[#FFFFFF] leading-tight mb-2 uppercase">Ideje za Video</h2>
              <p className="font-sans text-[14px] text-[#8B8FA8]">Opiši svoju nišu, AI generiša kompletnu video ideju.</p>
            </div>
          </div>
        </div>

        {/* CARD 4: HOOK VAULT */}
        <div 
          onClick={() => navigate('/tools/hook-vault')}
          className="bg-[#111116] rounded-[20px] border border-[rgba(255,255,255,0.06)] p-[24px] relative overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-colors group"
        >
          <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-bl-[16px] font-heading font-[800] text-[10px] tracking-widest uppercase flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Community
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="w-[56px] h-[56px] rounded-full bg-[rgba(34,197,94,0.1)] text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Archive className="w-[28px] h-[28px]" />
            </div>
            <div>
              <h2 className="font-heading font-[800] text-[22px] text-[#FFFFFF] leading-tight mb-2 uppercase">Hook Vault</h2>
              <p className="font-sans text-[14px] text-[#8B8FA8]">Najbolji hookovi koje zajednica koristi.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
