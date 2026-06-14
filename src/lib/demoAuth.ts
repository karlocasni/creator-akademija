// Creator Akademija - Local Demo Login
// Provides a self-contained admin demo session that bypasses Firebase entirely.
// Useful for demoing the app without real Firebase credentials.
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types/post';

export const DEMO_EMAIL = 'admin@akademija.com';
export const DEMO_PASSWORD = 'admin123';

const DEMO_STORAGE_KEY = 'creator_demo_session';
export const DEMO_AUTH_EVENT = 'demo-auth-changed';

const DEMO_UID = 'demo-admin-id';

// A minimal object shaped like a Firebase User, enough for the app's needs.
export const demoUser = {
  uid: DEMO_UID,
  email: DEMO_EMAIL,
  displayName: 'Admin (Demo)',
  emailVerified: true,
} as unknown as User;

export const demoProfile: UserProfile = {
  uid: DEMO_UID,
  username: 'Admin (Demo)',
  email: DEMO_EMAIL,
  status: 'active',
  avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${DEMO_UID}`,
  createdAt: new Date().toISOString(),
  xp: 9999,
  level: 20,
  isAdmin: true,
};

export const isDemoCredentials = (email: string, password: string): boolean =>
  email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

export const hasDemoSession = (): boolean => {
  try {
    return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setDemoSession = (): void => {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(DEMO_AUTH_EVENT));
};

export const clearDemoSession = (): void => {
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(DEMO_AUTH_EVENT));
};
