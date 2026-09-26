import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { FirestoreNotification } from '../types/notification';

type NotificationInput = Omit<FirestoreNotification, 'id' | 'read' | 'createdAt'>;

const MAX_MESSAGE = 500;

/** Mentions: letters incl. Croatian (č ć đ š ž), digits, dots, underscores, dashes. */
export const MENTION_REGEX = /@([\p{L}\p{N}._-]+)/gu;

/**
 * Creates one notification. senderId is always the signed-in user (the rules
 * require it) and recipientId must be a real uid — broadcasts go through
 * sendBroadcastNotification. Pass `docId` to make the write idempotent: a
 * second attempt with the same id is rejected by the rules (it would be an
 * update by a non-recipient), so the recipient is never notified twice.
 */
export async function createNotification(data: NotificationInput, docId?: string): Promise<void> {
  const senderId = auth.currentUser?.uid;
  if (!senderId) throw new Error('Not signed in');
  if (!data.recipientId || data.recipientId === 'all') {
    throw new Error('createNotification needs a single recipient; use sendBroadcastNotification');
  }
  const ref = docId
    ? doc(db, 'notifications', docId)
    : doc(collection(db, 'notifications'));
  await setDoc(ref, {
    ...data,
    senderId,
    message: (data.message || '').slice(0, MAX_MESSAGE),
    link: data.link ?? null,
    postId: data.postId ?? null,
    read: false,
    createdAt: serverTimestamp(),
  });
}

async function findUserByUsername(username: string): Promise<string | null> {
  const q = query(
    collection(db, 'profiles'),
    where('username', '==', username),
    limit(1),
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

/** Usernames mentioned in a text (without the @), de-duplicated. */
export function extractMentions(content: string): string[] {
  const names = Array.from(content.matchAll(MENTION_REGEX), (m) => m[1]);
  return [...new Set(names)];
}

export async function createMentionNotifications(
  content: string,
  senderId: string,
  senderName: string,
  senderAvatar: string,
  postId: string | null,
): Promise<void> {
  const unique = extractMentions(content).slice(0, 10);
  if (unique.length === 0) return;
  await Promise.all(
    unique.map(async (username) => {
      try {
        let uid = await findUserByUsername(username);
        // "@ana." at the end of a sentence
        const trimmed = username.replace(/[._-]+$/, '');
        if (!uid && trimmed && trimmed !== username) uid = await findUserByUsername(trimmed);
        if (uid && uid !== senderId) {
          await createNotification({
            recipientId: uid,
            senderId,
            senderName,
            senderAvatar,
            type: 'mention',
            message: `${senderName} te označio u objavi`,
            postId,
          });
        }
      } catch (err) {
        console.warn('Failed to create mention notification:', err);
      }
    }),
  );
}

/**
 * Admin-only fan-out: one notification per profile (the rules forbid a shared
 * recipientId 'all' document). Failures are logged, never thrown, so the
 * calling admin action is not interrupted.
 */
export async function sendBroadcastNotification(data: {
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: FirestoreNotification['type'];
  message: string;
  link?: string;
  postId?: string | null;
}): Promise<void> {
  const senderId = auth.currentUser?.uid;
  if (!senderId) return;

  let profilesSnap;
  try {
    profilesSnap = await getDocs(collection(db, 'profiles'));
  } catch (err) {
    console.warn('sendBroadcastNotification: could not list profiles:', err);
    return;
  }
  const recipients = profilesSnap.docs.map((d) => d.id).filter((id) => id !== senderId);

  const CONCURRENCY = 20;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const chunk = recipients.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map((recipientId) =>
        createNotification({
          recipientId,
          senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          type: data.type,
          message: data.message,
          link: data.link || null,
          postId: data.postId || null,
        }),
      ),
    );
    failed += results.filter((r) => r.status === 'rejected').length;
  }
  if (failed > 0) console.warn(`sendBroadcastNotification: ${failed}/${recipients.length} failed`);
}
