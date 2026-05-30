import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export const XP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500] as const;

export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 10);
}

export async function awardXP(uid: string, delta: number, currentXP: number): Promise<void> {
  const newXP = currentXP + delta;
  await updateDoc(doc(db, 'profiles', uid), {
    xp: increment(delta),
    level: calculateLevel(newXP),
  });
}
