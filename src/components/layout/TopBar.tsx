import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Eye } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../contexts/AuthContext';
import { calculateLevel } from '../../lib/xp';

export default function TopBar() {
  const { profile, isActualAdmin, adminMode, toggleAdminRole } = useAuth();
  const xp    = profile?.xp    ?? 0;
  const level = profile?.level ?? calculateLevel(xp);
  const xpFormatted = xp.toLocaleString('hr-HR');

  return (
    <div
      className="sticky top-0 z-50 relative flex items-center justify-between px-[18px] border-b border-[rgba(255,255,255,0.06)]"
      style={{
        background: '#0E1420',
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
        paddingBottom: '14px',
      }}
    >
      {/* ── Ambient backdrop glow wrapper ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-20 flex justify-center"
        >
          <div
            style={{
              width: 340,
              height: 220,
              borderRadius: '50%',
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(59,130,246,.15) 0%, transparent 70%)',
            }}
          />
        </div>
      </div>

      {/* ── Left: wordmark ── */}
      <Link to="/feed" className="relative z-10 flex items-center gap-[11px]">
        {/* Wordmark */}
        <div className="flex flex-col" style={{ gap: 2, lineHeight: 1.05 }}>
          <span
            className="font-heading font-black text-white uppercase"
            style={{
              fontSize: 16,
              letterSpacing: '.02em',
              textShadow: '0 0 18px rgba(255,255,255,.35), 0 0 40px rgba(59,130,246,.12)',
            }}
          >
            CREATOR
          </span>
          <span
            className="font-mono font-bold text-[#3B82F6] uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: '.32em',
              textShadow: '0 0 12px rgba(59,130,246,.80), 0 0 28px rgba(59,130,246,.45)',
            }}
          >
            AKADEMIJA
          </span>
        </div>
      </Link>

      {/* ── Right: Admin Switcher + XP pill + bell ── */}
      <div className="relative z-10 flex items-center gap-[8px] sm:gap-[10px]">

        {/* Admin / Student Role Switcher Toggle */}
        {isActualAdmin && (
          <button
            type="button"
            onClick={toggleAdminRole}
            title={adminMode 
              ? "Trenutno ste u Admin modu. Kliknite za prebacivanje na prikaz običnog korisnika (studenta)." 
              : "Trenutno ste u prikazu studenta. Kliknite za povratak na Admin mod."}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-md ${
              adminMode
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400'
                : 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400 animate-pulse ring-1 ring-emerald-500/30'
            }`}
          >
            {adminMode ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden xs:inline">Admin</span>
                <span className="text-[8.5px] px-1 py-0.2 rounded font-mono bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  ON
                </span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-bold">Student</span>
                <span className="hidden sm:inline text-[8.5px] px-1 py-0.2 rounded font-mono bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Vrati Admin
                </span>
              </>
            )}
          </button>
        )}

        {/* LVL / XP pill */}
        <Link to="/profile">
          <div
            className="flex items-center gap-[7px]"
            style={{
              padding: '5px 11px 5px 7px',
              borderRadius: 999,
              border: '1.3px solid rgba(59,130,246,.45)',
              background: 'rgba(59,130,246,.05)',
              boxShadow: `
                0 0 12px rgba(59,130,246,.12),
                inset 0 1px 0 rgba(255,255,255,.04)
              `,
            }}
          >
            {/* Bolt circle */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(59,130,246,.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap className="w-[12px] h-[12px] text-[#3B82F6] fill-[#3B82F6]" />
            </div>

            {/* LVL + XP stacked */}
            <div className="flex flex-col" style={{ lineHeight: 1, gap: 2 }}>
              <span
                className="font-mono font-bold text-[#3B82F6] whitespace-nowrap"
                style={{ fontSize: 11, letterSpacing: '.04em' }}
              >
                LVL {level}
              </span>
              <span
                className="font-mono font-bold whitespace-nowrap"
                style={{ fontSize: 8.5, letterSpacing: '.04em', color: 'rgba(59,130,246,.55)' }}
              >
                {xpFormatted} XP
              </span>
            </div>
          </div>
        </Link>

        {/* Bell — uses existing NotificationBell for real notifications */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,.08)',
            background: 'rgba(255,255,255,.03)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}
