import { useState } from 'react';
import { Flame, Music, Search, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const TRENDS = [
  { id: 1, type: "audio", name: "Ismael Hadžić - Hook Master Beats", creator: "ismael.hadzic", usage: 42100, reach: "1.4M", trend: "high" },
  { id: 2, type: "audio", name: "Cyberpunk Synthwave - Loop", creator: "neon_sound", usage: 18400, reach: "680K", trend: "medium" },
  { id: 3, type: "format", name: "Zeleni Zaslon (Green Screen) reakcija na tuđi viralni video", creator: "Tutorijal u Lekciji 4", usage: 89000, reach: "3.2M", trend: "high" },
  { id: 4, type: "hashtag", name: "#CreatorAkademija", creator: "Zajednički Tag", usage: 5300, reach: "890K", trend: "high" },
  { id: 5, type: "format", name: "Tekst iznad glave s brzim rezovima (Text-over-head cut)", creator: "Montažerski trik", usage: 31200, reach: "1.1M", trend: "medium" },
];

export default function TrendTracker() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'audio' | 'format' | 'hashtag'>('all');

  const filteredTrends = TRENDS.filter(t => filter === 'all' || t.type === filter);

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
          TREND TRACKER
        </h1>
      </div>

      <div className="px-[16px] mt-6">
        <p className="font-sans font-[400] text-[14px] text-[#8B8FA8] mb-6">
          Pregledaj i filtriraj najpopularnije zvukove, formate i hashtagove.
        </p>

        <div className="bg-[#111116] rounded-[24px] border border-[rgba(255,255,255,0.06)] p-[20px] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-bl-[16px] font-heading font-[800] text-[10px] tracking-widest uppercase flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live
          </div>

          <div className="flex items-center gap-[12px] mb-[16px]">
            <div className="w-[48px] h-[48px] rounded-full bg-[rgba(245,165,0,0.1)] text-[#F5A500] flex items-center justify-center shrink-0">
              <Flame className="w-[24px] h-[24px]" />
            </div>
            <h2 className="font-heading font-[700] text-[18px] text-[#FFFFFF]">Trend Tracker</h2>
          </div>

          {/* FILTERS */}
          <div className="flex gap-[8px] overflow-x-auto pb-[16px] hide-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-[16px] py-[8px] rounded-full font-heading font-[700] text-[12px] uppercase tracking-widest whitespace-nowrap transition-colors",
                filter === 'all' ? "bg-[#FFFFFF] text-[#0A0A0F]" : "bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.1)]"
              )}
            >
              Sve
            </button>
            <button
              onClick={() => setFilter('audio')}
              className={cn(
                "px-[16px] py-[8px] rounded-full font-heading font-[700] text-[12px] uppercase tracking-widest whitespace-nowrap transition-colors",
                filter === 'audio' ? "bg-[#FFFFFF] text-[#0A0A0F]" : "bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.1)]"
              )}
            >
              Zvukovi
            </button>
            <button
              onClick={() => setFilter('format')}
              className={cn(
                "px-[16px] py-[8px] rounded-full font-heading font-[700] text-[12px] uppercase tracking-widest whitespace-nowrap transition-colors",
                filter === 'format' ? "bg-[#FFFFFF] text-[#0A0A0F]" : "bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.1)]"
              )}
            >
              Formati
            </button>
            <button
              onClick={() => setFilter('hashtag')}
              className={cn(
                "px-[16px] py-[8px] rounded-full font-heading font-[700] text-[12px] uppercase tracking-widest whitespace-nowrap transition-colors",
                filter === 'hashtag' ? "bg-[#FFFFFF] text-[#0A0A0F]" : "bg-[rgba(255,255,255,0.05)] text-[#8B8FA8] hover:bg-[rgba(255,255,255,0.1)]"
              )}
            >
              Hashtags
            </button>
          </div>

          {/* TRENDS LIST */}
          <div className="flex flex-col gap-[12px]">
            {filteredTrends.map(trend => (
              <div key={trend.id} className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.04)] rounded-[16px] p-[16px] flex flex-col gap-[12px]">
                <div className="flex items-start justify-between gap-[12px]">
                  <div className="flex items-center gap-[12px]">
                    <div className="w-[32px] h-[32px] rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
                      {trend.type === 'audio' ? <Music className="w-[16px] h-[16px] text-[#8B8FA8]" /> : 
                       trend.type === 'hashtag' ? <span className="font-heading font-bold text-[#8B8FA8] text-[16px]">#</span> :
                       <Search className="w-[16px] h-[16px] text-[#8B8FA8]" />}
                    </div>
                    <div>
                      <h4 className="font-sans font-[700] text-[14px] text-[#FFFFFF] line-clamp-1">{trend.name}</h4>
                      <p className="font-sans text-[12px] text-[#8B8FA8]">{trend.creator}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-[8px] py-[4px] rounded-[6px] font-mono text-[10px] font-[700] uppercase tracking-widest shrink-0",
                    trend.trend === 'high' ? "bg-emerald-500/10 text-emerald-400" : "bg-[#F5A500]/10 text-[#F5A500]"
                  )}>
                    {trend.trend === 'high' ? '🔥 HOT' : '📈 RASTE'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[8px] pt-[12px] border-t border-[rgba(255,255,255,0.04)]">
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-[#4A4A5A] uppercase tracking-widest">Korištenja</span>
                    <span className="font-sans font-[700] text-[14px] text-[#FFFFFF]">{trend.usage.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-[#4A4A5A] uppercase tracking-widest">Avg. Reach</span>
                    <span className="font-sans font-[700] text-[14px] text-[#FFFFFF]">{trend.reach}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
