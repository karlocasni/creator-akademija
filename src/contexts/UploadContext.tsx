import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { compressImage } from '../lib/compress';
import { awardXP } from '../lib/xp';
import { createMentionNotifications } from '../lib/notifications';

export interface UploadJob {
  id: string;
  phase: 'compressing' | 'uploading' | 'saving' | 'done' | 'error';
  progress: number;
  errorMsg?: string;
  previewUrl?: string;
  mediaType?: 'image' | 'video';
}

interface UploadContextValue {
  jobs: UploadJob[];
  enqueue: (params: {
    user: { uid: string };
    profile: { username?: string; avatar_url?: string; xp?: number } | null;
    content: string;
    title: string;
    category: string;
    mediaFile: File | null;
    mediaType: 'image' | 'video' | null;
  }) => void;
  dismiss: (id: string) => void;
}

const UploadContext = createContext<UploadContextValue>({
  jobs: [],
  enqueue: () => {},
  dismiss: () => {},
});

export function UploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const update = (id: string, patch: Partial<UploadJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
  };

  const dismiss = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const enqueue = useCallback(async ({
    user, profile, content, title, category, mediaFile, mediaType
  }: {
    user: { uid: string };
    profile: { username?: string; avatar_url?: string; xp?: number } | null;
    content: string;
    title: string;
    category: string;
    mediaFile: File | null;
    mediaType: 'image' | 'video' | null;
  }) => {
    const id = `upload_${Date.now()}`;
    const avatarUrl = profile?.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`;

    // Create a stable preview URL before adding the job
    const previewUrl = mediaFile ? URL.createObjectURL(mediaFile) : undefined;

    const job: UploadJob = {
      id,
      phase: 'compressing',
      progress: 0,
      previewUrl,
      mediaType: mediaType ?? undefined,
    };
    setJobs(prev => [...prev, job]);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (mediaFile && mediaType) {
        let uploadBlob: Blob | File = mediaFile;

        if (mediaType === 'image') {
          update(id, { phase: 'compressing', progress: 0 });
          uploadBlob = await compressImage(mediaFile);
        } else if (mediaType === 'video') {
          // Skip FFmpeg compression — requires SharedArrayBuffer/COOP headers not set.
          // validateVideo already enforces 60s / 150MB limits before we reach here.
          uploadBlob = mediaFile;
        }

        update(id, { phase: 'uploading', progress: mediaType === 'video' ? 50 : 0 });

        const path = mediaType === 'image'
          ? `posts/${user.uid}/${Date.now()}_img.jpg`
          : `posts/${user.uid}/${Date.now()}_vid.mp4`;

        const storageRef = ref(storage, path);
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, uploadBlob);
          task.on('state_changed',
            (snap) => {
              const uploadP = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
              update(id, { progress: mediaType === 'video' ? 50 + Math.floor(uploadP / 2) : uploadP });
            },
            reject,
            () => resolve()
          );
        });

        const url = await getDownloadURL(storageRef);
        if (mediaType === 'image') imageUrl = url;
        else videoUrl = url;
      }

      update(id, { phase: 'saving', progress: 100 });

      const postData: Record<string, unknown> = {
        authorId: user.uid,
        authorName: profile?.username || 'Projekt90 Član',
        authorAvatar: avatarUrl,
        content: content.trim(),
        imageUrl,
        videoUrl,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      };

      // Only include title if non-empty — Firestore rejects undefined
      if (title.trim()) {
        postData.title = title.trim();
      }

      const postRef = await addDoc(collection(db, 'posts'), postData);

      if (profile && user.uid) {
        awardXP(user.uid, 50, profile.xp ?? 0).catch(() => {});
        createMentionNotifications(
          content.trim(), user.uid,
          profile.username || 'Projekt90 Član', avatarUrl, postRef.id
        ).catch(() => {});
      }

      update(id, { phase: 'done', progress: 100 });

      // Auto-dismiss after 3s
      setTimeout(() => {
        dismiss(id);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      }, 3000);

    } catch (err: any) {
      console.error('Background upload failed:', err);
      update(id, { phase: 'error', errorMsg: err?.message || 'Nepoznata greška.' });
    }
  }, [dismiss]);

  return (
    <UploadContext.Provider value={{ jobs, enqueue, dismiss }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  return useContext(UploadContext);
}
