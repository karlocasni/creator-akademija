import { calculateLevel } from '../../lib/xp';

interface XPBadgeProps {
  xp: number;
  compact?: boolean;
}

export default function XPBadge({ xp, compact = false }: XPBadgeProps) {
  const level = calculateLevel(xp);
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary font-black text-xs whitespace-nowrap">
      {compact ? `LVL ${level}` : `LVL ${level} · ${xp} XP`}
    </span>
  );
}
