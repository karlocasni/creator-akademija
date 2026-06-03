import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types/post';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateLocalProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  updateLocalProfile: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to mock auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Sync profile from mock Firestore
        const profileRef = doc(db, 'profiles', firebaseUser.uid);
        const unsubProfile = onSnapshot(profileRef, (snap) => {
          const isUserAdmin = firebaseUser.email === 'ismael@akademija.com' || 
                              (firebaseUser.displayName || '').toLowerCase().includes('ismael') || 
                              (firebaseUser.displayName || '').toLowerCase().includes('kreator student');
                              
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile({ ...data, isAdmin: isUserAdmin });
          } else {
            // Seed a default active profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              username: firebaseUser.displayName || 'Kreator Student',
              email: firebaseUser.email || '',
              status: 'active',
              xp: 150,
              level: 1,
              createdAt: new Date().toISOString(),
              isAdmin: firebaseUser.email === 'ismael@akademija.com' || (firebaseUser.displayName || '').toLowerCase().includes('ismael') || (firebaseUser.displayName || '').toLowerCase().includes('kreator student')
            };
            setProfile(newProfile);
          }
          setLoading(false);
        });

        return () => {
          unsubProfile();
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const signOutUser = async () => {
    setUser(null);
    setProfile(null);
    await auth.signOut();
  };

  const updateLocalProfile = (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const current = { ...profile, ...updates };
    
    // Automatically calculate level based on XP (every 500 XP is 1 level)
    if (updates.xp !== undefined) {
      current.level = Math.max(1, Math.floor(current.xp / 500) + 1);
    }

    // Save to Firestore mockup
    setDoc(doc(db, 'profiles', user.uid), current, { merge: true });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut: signOutUser, updateLocalProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
