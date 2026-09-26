import { doc, increment, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

export const XP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500] as const;

/** Rules allow a user's own xp to grow by at most this much per write. */
export const MAX_XP_PER_WRITE = 500;

export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 10);
}

/**
 * Adds XP to the signed-in user's own profile (the rules reject writes to
 * other users' profiles for non-admins). Runs in a transaction so the stored
 * level is always derived from the real new XP value, even with parallel awards.
 */
export async function awardXP(uid: string, delta: number): Promise<void> {
  const amount = Math.min(MAX_XP_PER_WRITE, Math.max(0, Math.round(delta)));
  if (!uid || amount === 0) return;
  const ref = doc(db, 'profiles', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = Number(snap.data().xp) || 0;
    tx.update(ref, {
      xp: increment(amount),
      level: calculateLevel(current + amount),
    });
  });
}
