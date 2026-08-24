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

export async function sendBroadcastNotification(data: {
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: FirestoreNotification['type'];
  message: string;
  link?: string;
  postId?: string | null;
}): Promise<void> {
  try {
    const profilesSnap = await getDocs(collection(db, 'profiles'));
    const promises: Promise<any>[] = [];
    if (!profilesSnap.empty) {
      profilesSnap.forEach((pDoc) => {
        promises.push(
          addDoc(collection(db, 'notifications'), {
            recipientId: pDoc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            type: data.type,
            message: data.message,
            link: data.link || null,
            postId: data.postId || null,
            read: false,
            createdAt: serverTimestamp(),
          })
        );
      });
    }

    // Also write a general broadcast entry with recipientId 'all'
    promises.push(
      addDoc(collection(db, 'notifications'), {
        recipientId: 'all',
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        type: data.type,
        message: data.message,
        link: data.link || null,
        postId: data.postId || null,
        read: false,
        createdAt: serverTimestamp(),
      })
    );

    await Promise.all(promises);
  } catch (err) {
    console.warn('sendBroadcastNotification error:', err);
    await addDoc(collection(db, 'notifications'), {
      recipientId: 'all',
      senderId: data.senderId,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      type: data.type,
      message: data.message,
      link: data.link || null,
      postId: data.postId || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

