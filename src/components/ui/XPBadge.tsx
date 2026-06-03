import { calculateLevel } from '../../lib/xp';

interface XPBadgeProps {
  xp: number;
  compact?: boolean;
}

export default function XPBadge({ xp, compact = false }: XPBadgeProps) {
  const level = calculateLevel(xp);
  return (
    <span className="badge-level inline-flex items-center justify-center">
      {compact ? `LVL ${level}` : `LVL ${level} · ${xp} XP`}
    </span>
  );
}
