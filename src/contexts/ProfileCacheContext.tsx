import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/post';

interface CachedProfile {
  avatar_url?: string;
  username?: string;
  isAdmin?: boolean;
}

interface CacheEntry extends CachedProfile {
  /** false when the profile doesn't exist or couldn't be read (kept so we don't hammer Firestore) */
  found: boolean;
  timestamp: number;
}

interface ProfileCacheContextType {
  getProfile: (uid: string) => CachedProfile | null;
  refreshProfile: (uid: string) => Promise<void>;
}

const ProfileCacheContext = createContext<ProfileCacheContextType>({
  getProfile: () => null,
  refreshProfile: async () => {},
});

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const FAILURE_RETRY = 1000 * 60; // retry unreadable profiles after a minute

export const ProfileCacheProvider = ({ children }: { children: React.ReactNode }) => {
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});

  const inFlight = useRef(new Map<string, Promise<void>>());
  const pending = useRef(new Set<string>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  // One fetch per uid at a time; concurrent callers share the same promise.
  const refreshProfile = useCallback((uid: string): Promise<void> => {
    if (!uid) return Promise.resolve();
    const running = inFlight.current.get(uid);
    if (running) return running;

    const task = (async () => {
      let entry: CacheEntry;
      try {
        const docSnap = await getDoc(doc(db, 'profiles', uid));
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          entry = {
            avatar_url: data.avatar_url,
            username: data.username,
            isAdmin: data.isAdmin,
            found: true,
            timestamp: Date.now(),
          };
        } else {
          entry = { found: false, timestamp: Date.now() };
        }
      } catch (err) {
        console.warn('Failed to fetch profile for cache:', uid, err);
        entry = { found: false, timestamp: Date.now() - CACHE_DURATION + FAILURE_RETRY };
      } finally {
        inFlight.current.delete(uid);
      }
      if (mounted.current) setCache(prev => ({ ...prev, [uid]: entry }));
    })();

    inFlight.current.set(uid, task);
    return task;
  }, []);

  // getProfile is called during render, so it only queues uids; the actual
  // fetches (and the resulting state updates) happen after the render.
  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      const uids = Array.from(pending.current);
      pending.current.clear();
      uids.forEach(uid => { void refreshProfile(uid); });
    }, 0);
  }, [refreshProfile]);

  const getProfile = useCallback((uid: string): CachedProfile | null => {
    if (!uid) return null;
    const entry = cache[uid];
    const stale = !entry || Date.now() - entry.timestamp > CACHE_DURATION;
    if (stale && !inFlight.current.has(uid) && !pending.current.has(uid)) {
      pending.current.add(uid);
      scheduleFlush();
    }
    return entry && entry.found
      ? { avatar_url: entry.avatar_url, username: entry.username, isAdmin: entry.isAdmin }
      : null;
  }, [cache, scheduleFlush]);

  const value = useMemo(() => ({ getProfile, refreshProfile }), [getProfile, refreshProfile]);

  return (
    <ProfileCacheContext.Provider value={value}>
      {children}
    </ProfileCacheContext.Provider>
  );
};

export const useProfileCache = () => useContext(ProfileCacheContext);
