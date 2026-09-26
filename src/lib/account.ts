import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Emails live in accounts/{uid} (readable only by the owner and admins),
// never on the public profile that every member can read.
export function saveAccountEmail(uid: string, email: string | null | undefined) {
  if (!email) return Promise.resolve();
  return setDoc(
    doc(db, 'accounts', uid),
    { email: email.trim().toLowerCase(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}
