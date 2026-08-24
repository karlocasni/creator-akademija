import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types/post';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isActualAdmin: boolean;
  adminMode: boolean;
  toggleAdminRole: () => void;
  signOut: () => Promise<void>;
  updateLocalProfile: (updates: Partial<UserProfile>) => void;
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
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rawProfile, setRawProfile] = useState<UserProfile | null>(null);
  const [isActualAdmin, setIsActualAdmin] = useState<boolean>(false);
  const [adminMode, setAdminMode] = useState<boolean>(() => {
    return localStorage.getItem('creator_admin_mode') !== 'student';
  });
  const [loading, setLoading] = useState(true);

  const toggleAdminRole = () => {
    setAdminMode((prev) => {
      const next = !prev;
      localStorage.setItem('creator_admin_mode', next ? 'admin' : 'student');
      return next;
    });
  };

  useEffect(() => {
    // Listen to mock auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Stamp the user as active right now so the active-members row is fresh
        setDoc(doc(db, 'profiles', firebaseUser.uid), { lastActiveAt: serverTimestamp() }, { merge: true })
          .catch(err => console.warn('[AuthContext] Failed to update lastActiveAt:', err));
        
        const profileRef = doc(db, 'profiles', firebaseUser.uid);
        const unsubProfile = onSnapshot(profileRef, (snap) => {
          const isUserAdmin = firebaseUser.email === 'ismael.hadzic17@gmail.com' || 
                              firebaseUser.email === 'brunovujcec6@gmail.com' || 
                              (firebaseUser.email || '').toLowerCase().includes('admin') ||
                              (firebaseUser.displayName || '').toLowerCase().includes('ismael') || 
                              (firebaseUser.displayName || '').toLowerCase().includes('kreator student') ||
                              (firebaseUser.displayName || '').toLowerCase().includes('admin');
          
          setIsActualAdmin(Boolean(isUserAdmin || snap.data()?.isAdmin));

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            
            // Expiration check
            if (data.accessUntil && new Date(data.accessUntil).getTime() < Date.now()) {
              alert('Vaš pristup platformi je istekao.');
              firebaseSignOut(auth);
              return;
            }

            setRawProfile({ ...data });
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
              isAdmin: isUserAdmin
            };
            setRawProfile(newProfile);
            setDoc(profileRef, newProfile, { merge: true }).catch(err => {
              console.warn('[AuthContext] Failed to write fallback profile:', err);
            });
          }
          setLoading(false);
        }, (error) => {
          console.warn('[AuthContext] Profile fetch error:', error);
          const isUserAdmin = firebaseUser.email === 'ismael.hadzic17@gmail.com' || 
                              firebaseUser.email === 'brunovujcec6@gmail.com' || 
                              (firebaseUser.email || '').toLowerCase().includes('admin') ||
                              (firebaseUser.displayName || '').toLowerCase().includes('admin');
          setIsActualAdmin(Boolean(isUserAdmin));
          const fallbackProfile: UserProfile = {
            uid: firebaseUser.uid,
            username: firebaseUser.displayName || 'Kreator Student',
            email: firebaseUser.email || '',
            status: 'active',
            xp: 150,
            level: 1,
            createdAt: new Date().toISOString(),
            isAdmin: isUserAdmin
          };
          setRawProfile(fallbackProfile);
          setLoading(false);
        });

        return () => {
          unsubProfile();
        };
      } else {
        setRawProfile(null);
        setIsActualAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const signOutUser = async () => {
    setUser(null);
    setRawProfile(null);
    setIsActualAdmin(false);
    await firebaseSignOut(auth);
  };

  const updateLocalProfile = (updates: Partial<UserProfile>) => {
    if (!user || !rawProfile) return;
    const current = { ...rawProfile, ...updates };
    
    // Automatically calculate level based on XP (every 500 XP is 1 level)
    if (updates.xp !== undefined) {
      current.level = Math.max(1, Math.floor(current.xp / 500) + 1);
    }

    // Save to Firestore mockup
    setDoc(doc(db, 'profiles', user.uid), current, { merge: true });
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
      updateLocalProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

