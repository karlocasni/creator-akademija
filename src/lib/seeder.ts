import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Auto-seeds standard courses, events, and creator profiles to real Firestore 
 * if they don't already exist. Bypasses checking if the configuration is placeholder.
 */
export async function seedRealFirebase() {
  try {
    // Check if configuration is just placeholder
    const isPlaceholder = !db.app.options.apiKey || db.app.options.apiKey === 'placeholder-api-key';
    if (isPlaceholder) {
      console.log('Firebase configuration is using placeholder values. Auto-seeding skipped.');
      return;
    }

    // 1. Seed courses if none exist
    const coursesSnap = await getDocs(collection(db, 'courses'));
    if (coursesSnap.empty) {
      console.log('[Seeder] Seeding courses into real Firestore...');
      const { SEED_COURSES } = await import('./firebase-mock');
      for (const course of SEED_COURSES) {
        await setDoc(doc(db, 'courses', course.id), course);
      }
    }

    // 2. Seed calendar events if none exist
    const eventsSnap = await getDocs(collection(db, 'events'));
    if (eventsSnap.empty) {
      console.log('[Seeder] Seeding events into real Firestore...');
      const { SEED_EVENTS } = await import('./firebase-mock');
      for (const event of SEED_EVENTS) {
        await setDoc(doc(db, 'events', event.id), event);
      }
    }

    // 3. Seed default admin/creator profiles (Ismael, Filip, Anamarija, etc.)
    const { SEED_PROFILES } = await import('./firebase-mock');
    for (const [uid, profile] of Object.entries(SEED_PROFILES as Record<string, any>)) {
      const profileRef = doc(db, 'profiles', uid);
      await setDoc(profileRef, profile as any, { merge: true });
    }

    console.log('[Seeder] Firebase database auto-seed checks completed successfully.');
  } catch (err) {
    console.warn('[Seeder] Firebase auto-seeding encountered an issue:', err);
  }
}
