import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { UserProfile } from '../types/post';
import { saveAccountEmail } from '../lib/account';
import { calculateLevel } from '../lib/xp';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isActualAdmin: boolean;
  adminMode: boolean;
  toggleAdminRole: () => void;
  signOut: () => Promise<void>;
  updateLocalProfile: (updates: Partial<UserProfile>) => void;
  /** Message for the login form after a forced sign-out (expired access etc.). */
  authNotice: string | null;
  clearAuthNotice: () => void;
  /** While AuthModal runs a login/registration the session is not published to the app. */
  beginAuthFlow: () => void;
  endAuthFlow: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isActualAdmin: false,
  adminMode: true,
  toggleAdminRole: () => {},
  signOut: async () => {},
  updateLocalProfile: () => {},
  authNotice: null,
  clearAuthNotice: () => {},
  beginAuthFlow: () => {},
  endAuthFlow: () => {},
});

export const isAccessExpired = (accessUntil?: string | null) =>
  !!accessUntil && new Date(accessUntil).getTime() < Date.now();

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rawProfile, setRawProfile] = useState<UserProfile | null>(null);
  const [isActualAdmin, setIsActualAdmin] = useState<boolean>(false);
  const [adminMode, setAdminMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('creator_admin_mode') !== 'student';
    } catch {
      return true;
    }
  });
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const flowActive = useRef(false);
  const unsubProfile = useRef<(() => void) | null>(null);

  const toggleAdminRole = () => {
    setAdminMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('creator_admin_mode', next ? 'admin' : 'student');
      } catch { /* storage unavailable */ }
      return next;
    });
  };

  const resetSession = () => {
    unsubProfile.current?.();
    unsubProfile.current = null;
    setUser(null);
    setRawProfile(null);
    setIsActualAdmin(false);
  };

  // Publishes a Firebase user to the app only once their profile is loaded and
  // they are allowed in (verified email, or an account an admin activated).
  const handleUser = useCallback((firebaseUser: User | null) => {
    unsubProfile.current?.();
    unsubProfile.current = null;

    if (!firebaseUser) {
      resetSession();
      setLoading(false);
      return;
    }

    const forceSignOut = (notice: string) => {
      setAuthNotice(notice);
      resetSession();
      setLoading(false);
      firebaseSignOut(auth).catch(() => {});
    };

    const profileRef = doc(db, 'profiles', firebaseUser.uid);
    let stampedActivity = false;

    // Keeps the private email record in sync, also for accounts still waiting
    // for activation (they are signed out below, but admins need the email).
    saveAccountEmail(firebaseUser.uid, firebaseUser.email)
      .catch(err => console.warn('[AuthContext] Failed to save account email:', err));

    unsubProfile.current = onSnapshot(profileRef, (snap) => {
      if (!snap.exists()) {
        // Account without a profile: create a locked one — an admin activates
        // it from the Members page.
        const seed: UserProfile = {
          uid: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kreator',
          status: 'inactive',
          xp: 0,
          level: 1,
          createdAt: new Date().toISOString(),
        };
        setDoc(profileRef, seed).catch(err => {
          console.warn('[AuthContext] Failed to create profile:', err);
          forceSignOut('Profil se nije mogao kreirati. Pokušaj ponovno.');
        });
        return;
      }

      const data = snap.data() as UserProfile;
      const admin = data.isAdmin === true;

      if (!admin && isAccessExpired(data.accessUntil)) {
        forceSignOut('Tvoj pristup platformi je istekao. Javi nam se za produljenje.');
        return;
      }
      if (!admin && !firebaseUser.emailVerified && data.status !== 'active') {
        forceSignOut('Prvo potvrdi svoju email adresu (link smo ti poslali na mail).');
        return;
      }

      if (!stampedActivity) {
        stampedActivity = true;
        setDoc(profileRef, { lastActiveAt: serverTimestamp() }, { merge: true })
          .catch(err => console.warn('[AuthContext] Failed to update lastActiveAt:', err));
      }

      setIsActualAdmin(admin);
      setRawProfile({ ...data, uid: firebaseUser.uid });
      setUser(firebaseUser);
      setLoading(false);
    }, (error) => {
      console.warn('[AuthContext] Profile fetch error:', error);
      // Without a readable profile we cannot tell whether access is paid for.
      forceSignOut('Profil se nije mogao učitati. Provjeri internetsku vezu i pokušaj ponovno.');
    });
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (flowActive.current) return;
      handleUser(firebaseUser);
    });
    return () => {
      unsubscribeAuth();
      unsubProfile.current?.();
    };
  }, [handleUser]);

  const beginAuthFlow = useCallback(() => {
    flowActive.current = true;
    setAuthNotice(null);
  }, []);

  const endAuthFlow = useCallback(() => {
    flowActive.current = false;
    handleUser(auth.currentUser);
  }, [handleUser]);

  const signOutUser = async () => {
    resetSession();
    await firebaseSignOut(auth);
  };

  // Writes only the changed fields. Locked fields (status, isAdmin, accessUntil…)
  // are rejected by the Firestore rules for non-admins.
  const updateLocalProfile = (updates: Partial<UserProfile>) => {
    if (!user || !rawProfile) return;
    const patch: Record<string, unknown> = { ...updates };
    const local: Partial<UserProfile> = { ...updates };
    if (updates.xp !== undefined) {
      // Callers pass the new total; store it as an atomic increment so a stale
      // local value can never lower XP (the rules only allow it to grow ≤500).
      const current = rawProfile.xp || 0;
      const delta = Math.min(500, Math.max(0, Math.round(updates.xp - current)));
      if (delta === 0) {
        delete patch.xp;
        delete local.xp;
      } else {
        patch.xp = increment(delta);
        local.xp = current + delta;
        patch.level = local.level = calculateLevel(current + delta);
      }
    }
    if (Object.keys(patch).length === 0) return;
    setRawProfile(prev => (prev ? { ...prev, ...local } : prev));
    setDoc(doc(db, 'profiles', user.uid), patch, { merge: true })
      .catch(err => console.warn('[AuthContext] Profile update rejected:', err));
  };

  // Effective profile reflects current admin mode toggle
  const effectiveProfile: UserProfile | null = rawProfile ? {
    ...rawProfile,
    isAdmin: isActualAdmin ? adminMode : false,
    isCreator: isActualAdmin ? adminMode : Boolean(rawProfile.isCreator),
  } : null;

  return (
    <AuthContext.Provider value={{
      user,
      profile: effectiveProfile,
      loading,
      isActualAdmin,
      adminMode,
      toggleAdminRole,
      signOut: signOutUser,
      updateLocalProfile,
      authNotice,
      clearAuthNotice: () => setAuthNotice(null),
      beginAuthFlow,
      endAuthFlow,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
