import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../contexts/AuthContext';
import { calculateLevel } from '../../lib/xp';

export default function TopBar() {
  const { profile } = useAuth();
  const xp    = profile?.xp    ?? 0;
  const level = profile?.level ?? calculateLevel(xp);
  const xpFormatted = xp.toLocaleString('hr-HR');

  return (
    <div
      className="sticky top-0 z-50 relative overflow-hidden flex items-center justify-between px-[18px] border-b border-[rgba(255,255,255,0.06)]"
      style={{
        background: '#0A0A0F',
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
        paddingBottom: '14px',
      }}
    >
      {/* ── Ambient backdrop glow ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-20 flex justify-center"
        style={{ zIndex: 0 }}
      >
        <div
          style={{
            width: 340,
            height: 220,
            borderRadius: '50%',
            background:
              'radial-gradient(50% 50% at 50% 50%, rgba(245,165,0,.15) 0%, transparent 70%)',
          }}
        />
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
              textShadow: '0 0 18px rgba(255,255,255,.35), 0 0 40px rgba(245,165,0,.12)',
            }}
          >
            CREATOR
          </span>
          <span
            className="font-mono font-bold text-[#F5A500] uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: '.32em',
              textShadow: '0 0 12px rgba(245,165,0,.80), 0 0 28px rgba(245,165,0,.45)',
            }}
          >
            AKADEMIJA
          </span>
        </div>
      </Link>

      {/* ── Right: XP pill + bell ── */}
      <div className="relative z-10 flex items-center gap-[10px]">

        {/* LVL / XP pill */}
        <Link to="/profile">
          <div
            className="flex items-center gap-[7px]"
            style={{
              padding: '5px 11px 5px 7px',
              borderRadius: 999,
              border: '1.3px solid rgba(245,165,0,.45)',
              background: 'rgba(245,165,0,.05)',
              boxShadow: `
                0 0 12px rgba(245,165,0,.12),
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
                background: 'rgba(245,165,0,.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap className="w-[12px] h-[12px] text-[#F5A500] fill-[#F5A500]" />
            </div>

            {/* LVL + XP stacked */}
            <div className="flex flex-col" style={{ lineHeight: 1, gap: 2 }}>
              <span
                className="font-mono font-bold text-[#F5A500] whitespace-nowrap"
                style={{ fontSize: 11, letterSpacing: '.04em' }}
              >
                LVL {level}
              </span>
              <span
                className="font-mono font-bold whitespace-nowrap"
                style={{ fontSize: 8.5, letterSpacing: '.04em', color: 'rgba(245,165,0,.55)' }}
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
