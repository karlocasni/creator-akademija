import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { UploadTask } from 'firebase/storage';
import { db } from '../lib/firebase';
import {
  MediaError,
  deleteMediaByUrl,
  mediaPath,
  prepareImage,
  prepareVideo,
  uploadErrorMessage,
  uploadMedia,
} from '../lib/media';
import { awardXP } from '../lib/xp';
import { createMentionNotifications } from '../lib/notifications';

/** Feed videos: non-admins may post up to 60 s. */
export const FEED_VIDEO_MAX_SECONDS = 60;
export const POST_CONTENT_MAX = 5000;
export const POST_TITLE_MAX = 200;
/** Posts shorter than this (and without media) don't earn XP, so spam can't farm it. */
const POST_XP_MIN_CHARS = 20;
const POST_XP = 50;

export interface UploadJob {
  id: string;
  phase: 'compressing' | 'uploading' | 'saving' | 'done' | 'error';
  /** 0-100 for the current phase; null = indeterminate (e.g. image processing). */
  progress: number | null;
  errorMsg?: string;
  /** false when retrying can't help (e.g. unsupported file). */
  canRetry?: boolean;
  previewUrl?: string;
  mediaType?: 'image' | 'video';
  /** The post text, kept so it isn't lost when the upload fails. */
  content: string;
}

export interface EnqueueParams {
  user: { uid: string };
  profile: { username?: string; avatar_url?: string } | null;
  content: string;
  title: string;
  mediaFile: File | null;
  mediaType: 'image' | 'video' | null;
  /** Admins have no video length limit. */
  isAdmin?: boolean;
}

interface JobState {
  params: EnqueueParams;
  /** Compressed media, kept so a retry doesn't re-encode. */
  prepared?: Blob;
  task?: UploadTask;
  running: boolean;
}

interface UploadContextValue {
  jobs: UploadJob[];
  enqueue: (params: EnqueueParams) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
}

const UploadContext = createContext<UploadContextValue>({
  jobs: [],
  enqueue: () => {},
  retry: () => {},
  dismiss: () => {},
});

export function UploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const jobState = useRef(new Map<string, JobState>());
  const previews = useRef(new Map<string, string>());

  const update = useCallback((id: string, patch: Partial<UploadJob>) => {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const revokePreview = useCallback((id: string) => {
    const url = previews.current.get(id);
    if (url) URL.revokeObjectURL(url);
    previews.current.delete(id);
  }, []);

  const dismiss = useCallback((id: string) => {
    const state = jobState.current.get(id);
    if (state?.running) state.task?.cancel();
    jobState.current.delete(id);
    revokePreview(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  }, [revokePreview]);

  // Release object URLs if the provider ever unmounts
  useEffect(() => {
    const map = previews.current;
    return () => {
      map.forEach(url => URL.revokeObjectURL(url));
      map.clear();
    };
  }, []);

  const run = useCallback(async (id: string) => {
    const state = jobState.current.get(id);
    if (!state || state.running) return;
    state.running = true;
    const { user, profile, content, title, mediaFile, mediaType, isAdmin } = state.params;

    const authorName = profile?.username || 'Kreator';
    const avatarUrl = profile?.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authorName)}`;

    let previewUrl: string | undefined;
    if (mediaFile) {
      previewUrl = URL.createObjectURL(mediaFile);
      previews.current.set(id, previewUrl);
    }
    update(id, {
      phase: mediaFile ? 'compressing' : 'saving',
      progress: mediaFile && mediaType === 'video' ? 0 : null,
      errorMsg: undefined,
      canRetry: undefined,
      previewUrl,
    });

    let uploadedUrl: string | null = null;
    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (mediaFile && mediaType) {
        // 1. Compress / convert
        let blob = state.prepared;
        if (!blob) {
          if (mediaType === 'image') {
            blob = await prepareImage(mediaFile, 1920);
          } else {
            const result = await prepareVideo(mediaFile, {
              maxDuration: isAdmin ? undefined : FEED_VIDEO_MAX_SECONDS,
              onProgress: (f) => update(id, { progress: Math.round(f * 100) }),
            });
            blob = result.blob;
          }
          state.prepared = blob;
        }
        if (!jobState.current.has(id)) return; // dismissed meanwhile

        // 2. Upload
        update(id, { phase: 'uploading', progress: 0 });
        const handle = uploadMedia(mediaPath(`posts/${user.uid}`, blob.type), blob, (f) =>
          update(id, { progress: Math.round(f * 100) }),
        );
        state.task = handle.task;
        uploadedUrl = await handle.promise;
        state.task = undefined;
        if (mediaType === 'image') imageUrl = uploadedUrl;
        else videoUrl = uploadedUrl;
      }

      // 3. Save the post
      update(id, { phase: 'saving', progress: null });
      const text = content.trim().slice(0, POST_CONTENT_MAX);
      const postData: Record<string, unknown> = {
        authorId: user.uid,
        authorName,
        authorAvatar: avatarUrl,
        content: text,
        imageUrl,
        videoUrl,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      };
      const cleanTitle = title.trim().slice(0, POST_TITLE_MAX);
      if (cleanTitle) postData.title = cleanTitle;

      let postId: string;
      try {
        const postRef = await addDoc(collection(db, 'posts'), postData);
        postId = postRef.id;
      } catch (err) {
        // Don't leave an orphaned file in Storage; a retry uploads it again
        if (uploadedUrl) deleteMediaByUrl(uploadedUrl);
        throw err;
      }

      // XP only for posts with some substance
      if (text.length >= POST_XP_MIN_CHARS || imageUrl || videoUrl) {
        awardXP(user.uid, POST_XP).catch(err => console.warn('XP award failed:', err));
      }
      createMentionNotifications(text, user.uid, authorName, avatarUrl, postId)
        .catch(err => console.warn('Mention notifications failed:', err));

      state.running = false;
      state.prepared = undefined;
      update(id, { phase: 'done', progress: 100 });
      setTimeout(() => dismiss(id), 3000);
    } catch (err) {
      console.error('Background upload failed:', err);
      state.running = false;
      state.task = undefined;
      if (!jobState.current.has(id)) return; // dismissed / cancelled
      revokePreview(id);
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof MediaError || code.startsWith('storage/')
        ? uploadErrorMessage(err)
        : code === 'permission-denied'
          ? 'Nemaš dopuštenje za objavu (provjeri je li ti članstvo aktivno).'
          : 'Objava nije spremljena. Provjeri vezu i pokušaj ponovno.';
      update(id, {
        phase: 'error',
        progress: null,
        errorMsg: msg,
        canRetry: !(err instanceof MediaError) && code !== 'permission-denied' && code !== 'storage/unauthorized',
        previewUrl: undefined,
      });
    }
  }, [dismiss, revokePreview, update]);

  const enqueue = useCallback((params: EnqueueParams) => {
    const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    jobState.current.set(id, { params, running: false });
    setJobs(prev => [...prev, {
      id,
      phase: params.mediaFile ? 'compressing' : 'saving',
      progress: null,
      mediaType: params.mediaType ?? undefined,
      content: params.content,
    }]);
    run(id);
  }, [run]);

  const retry = useCallback((id: string) => { run(id); }, [run]);

  return (
    <UploadContext.Provider value={{ jobs, enqueue, retry, dismiss }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  return useContext(UploadContext);
}
