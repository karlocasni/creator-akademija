import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { FirestoreNotification } from '../types/notification';

type NotificationInput = Omit<FirestoreNotification, 'id' | 'read' | 'createdAt'>;

export async function createNotification(data: NotificationInput): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    ...data,
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

export async function createMentionNotifications(
  content: string,
  senderId: string,
  senderName: string,
  senderAvatar: string,
  postId: string | null,
): Promise<void> {
  const raw = content.match(/@(\w+)/g);
  if (!raw) return;
  const unique = [...new Set(raw.map((m) => m.slice(1)))];
  await Promise.all(
    unique.map(async (username) => {
      try {
        const uid = await findUserByUsername(username);
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
