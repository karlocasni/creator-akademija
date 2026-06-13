import { initializeApp } from 'firebase/app';
import { getAuth, signOut as authSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Load config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder-messaging-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder-app-id"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Expose services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Keep compatibility with local mock signOut references if needed
export const signOut = async () => authSignOut(auth);
export const firebaseSignOut = signOut;
export const functions = {} as any;
export const analytics = {} as any;
