import { ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTask } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Client-side media pipeline: every photo/video goes through prepareImage /
 * prepareVideo (resize + re-encode) before uploadMedia puts it in Storage.
 * The size limits here mirror storage.rules.
 */

export const MB = 1024 * 1024;
export const IMAGE_UPLOAD_LIMIT = 10 * MB;   // after compression (storage.rules)
export const VIDEO_UPLOAD_LIMIT = 200 * MB;  // after compression (storage.rules)
const IMAGE_INPUT_LIMIT = 40 * MB;
const VIDEO_INPUT_LIMIT = 1024 * MB;

export class MediaError extends Error {}

export const isVideoFile = (file: Blob) => file.type.startsWith('video/');
export const isImageFile = (file: Blob) => file.type.startsWith('image/');

const extFromType = (type: string) => {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'image/gif') return 'gif';
  if (type === 'video/mp4') return 'mp4';
  if (type === 'video/webm') return 'webm';
  if (type === 'video/quicktime') return 'mov';
  return type.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
};

/** Storage object name: `<folder>/<timestamp>_<random>.<ext>` — never trusts the original file name. */
export const mediaPath = (folder: string, type: string) =>
  `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extFromType(type)}`;

// ─── Images ──────────────────────────────────────────────────────────────────

async function decodeImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    } catch { /* fall through to <img> */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => URL.revokeObjectURL(url);
    img.onload = () => { cleanup(); resolve(img); };
    img.onerror = () => { cleanup(); reject(new MediaError('Ovaj format slike nije podržan. Pošalji JPG, PNG ili WEBP.')); };
    img.src = url;
  });
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));

/**
 * Resizes so the longer side is at most `maxDim` and re-encodes (JPEG for
 * photos, WEBP/PNG when the image has transparency). Animated GIFs are kept.
 */
export async function prepareImage(file: File, maxDim = 1920, quality = 0.82): Promise<Blob> {
  if (!isImageFile(file)) throw new MediaError('Odabrana datoteka nije slika.');
  if (file.size > IMAGE_INPUT_LIMIT) throw new MediaError('Slika je prevelika (max 40 MB).');
  if (file.type === 'image/gif') {
    if (file.size > IMAGE_UPLOAD_LIMIT) throw new MediaError('GIF je prevelik (max 10 MB).');
    return file;
  }

  const source = await decodeImage(file);
  const srcW = source.width;
  const srcH = source.height;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new MediaError('Obrada slike nije uspjela.');
  ctx.drawImage(source, 0, 0, w, h);
  if ('close' in source) source.close();

  const mayHaveAlpha = file.type === 'image/png' || file.type === 'image/webp';
  let blob: Blob | null = null;
  if (mayHaveAlpha) {
    blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (blob && blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/png', 1);
  } else {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }
  if (!blob) throw new MediaError('Obrada slike nije uspjela.');

  // Re-encoding a small, already optimised file can make it bigger
  const keepOriginal = scale === 1 && file.size <= blob.size && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  const result = keepOriginal ? file : blob;
  if (result.size > IMAGE_UPLOAD_LIMIT) throw new MediaError('Slika je prevelika i nakon kompresije (max 10 MB).');
  return result;
}

// ─── Videos ──────────────────────────────────────────────────────────────────

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
}

/** Reads duration/size through a <video> element (with a timeout so it never hangs). */
export function readVideoInfo(file: Blob): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (fn: () => void) => { clearTimeout(timer); URL.revokeObjectURL(url); video.removeAttribute('src'); fn(); };
    const timer = setTimeout(() => done(() => reject(new MediaError('Video se ne može pročitati.'))), 15000);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      const info = { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
      if (Number.isFinite(info.duration)) {
        done(() => resolve(info));
        return;
      }
      // MediaRecorder WebM files report Infinity until the end is seeked
      video.ontimeupdate = () => {
        video.ontimeupdate = null;
        done(() => resolve({ ...info, duration: video.duration }));
      };
      video.currentTime = 1e7;
    };
    video.onerror = () => done(() => reject(new MediaError('Ovaj video format nije podržan. Pošalji MP4 ili MOV.')));
    video.src = url;
  });
}

export const formatDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export interface PrepareVideoOptions {
  /** Longest allowed duration in seconds (undefined = no limit). */
  maxDuration?: number;
  /** The shorter side of the output is capped at this many pixels (1080 = Full HD). */
  maxShortSide?: number;
  onProgress?: (fraction: number) => void;
}

/**
 * Re-encodes a video to H.264 MP4 (fast-start) with WebCodecs via mediabunny,
 * capped at 1080p. Falls back to the original file when the browser cannot
 * transcode it, as long as it fits the upload limit.
 */
export async function prepareVideo(file: File, opts: PrepareVideoOptions = {}): Promise<{ blob: Blob; duration: number }> {
  if (!isVideoFile(file)) throw new MediaError('Odabrana datoteka nije video.');
  if (file.size > VIDEO_INPUT_LIMIT) throw new MediaError('Video je prevelik (max 1 GB).');

  const { maxDuration, maxShortSide = 1080, onProgress } = opts;
  let duration = 0;
  try {
    duration = (await readVideoInfo(file)).duration;
  } catch (err) {
    // Some browsers can't preview e.g. HEVC but mediabunny may still convert it
    if (!('VideoEncoder' in window)) throw err;
  }
  if (maxDuration && duration > maxDuration + 0.5) {
    throw new MediaError(`Video smije trajati najviše ${formatDuration(maxDuration)} min.`);
  }

  const fallback = () => {
    if (file.size > VIDEO_UPLOAD_LIMIT) {
      throw new MediaError('Video je prevelik (max 200 MB), a ovaj preglednik ga ne može smanjiti. Skrati ga ili smanji rezoluciju.');
    }
    return { blob: file, duration };
  };

  // Small MP4s are uploaded as they are
  if (file.type === 'video/mp4' && file.size <= 8 * MB) return { blob: file, duration };
  if (!('VideoEncoder' in window)) return fallback();

  try {
    const mb = await import('mediabunny');
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new MediaError('Video nema slikovni zapis.');
    if (!duration) duration = await input.computeDuration();
    if (maxDuration && duration > maxDuration + 0.5) {
      throw new MediaError(`Video smije trajati najviše ${formatDuration(maxDuration)} min.`);
    }

    const w = track.displayWidth;
    const h = track.displayHeight;
    const scale = Math.min(1, maxShortSide / Math.min(w, h));
    const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
    const outW = even(w * scale);
    const outH = even(h * scale);

    const codec = await mb.getFirstEncodableVideoCodec(['avc'], { width: outW, height: outH });
    if (!codec) return fallback();

    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new mb.BufferTarget(),
    });
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: { width: outW, height: outH, fit: 'contain', codec, quality: mb.QUALITY_MEDIUM, frameRate: 30 },
      showWarnings: false,
    });
    if (!conversion.isValid) return fallback();
    if (onProgress) conversion.onProgress = (p) => onProgress(Math.min(1, p));
    await conversion.execute();

    const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
    if (!buffer) return fallback();
    const blob = new Blob([buffer], { type: 'video/mp4' });

    // Keep the original if it was already smaller and plays everywhere
    if (file.type === 'video/mp4' && file.size <= blob.size && file.size <= VIDEO_UPLOAD_LIMIT) {
      return { blob: file, duration };
    }
    if (blob.size > VIDEO_UPLOAD_LIMIT) {
      throw new MediaError('Video je prevelik i nakon kompresije (max 200 MB). Skrati ga.');
    }
    return { blob, duration };
  } catch (err) {
    if (err instanceof MediaError) throw err;
    console.warn('[media] Video conversion failed, uploading original:', err);
    return fallback();
  }
}

// ─── Upload / delete ─────────────────────────────────────────────────────────

export interface UploadHandle {
  promise: Promise<string>;
  task: UploadTask;
}

/** Uploads a blob to Storage and resolves with its download URL. */
export function uploadMedia(path: string, blob: Blob, onProgress?: (fraction: number) => void): UploadHandle {
  const task = uploadBytesResumable(ref(storage, path), blob, {
    contentType: blob.type || 'application/octet-stream',
    cacheControl: 'public, max-age=31536000',
  });
  const promise = new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      snap => onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
      err => reject(err),
      () => { getDownloadURL(task.snapshot.ref).then(resolve, reject); },
    );
  });
  return { promise, task };
}

/** Best-effort removal of a Storage file referenced by its download URL. */
export async function deleteMediaByUrl(url?: string | null) {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    console.warn('[media] Could not delete storage file:', err);
  }
}

/** Human-readable message for Storage/upload errors. */
export function uploadErrorMessage(err: unknown): string {
  if (err instanceof MediaError) return err.message;
  const code = (err as { code?: string })?.code || '';
  if (code === 'storage/unauthorized') return 'Nemaš dopuštenje za ovaj prijenos (ili je datoteka prevelika).';
  if (code === 'storage/canceled') return 'Prijenos je otkazan.';
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/network-request-failed') {
    return 'Prijenos je prekinut zbog loše veze. Pokušaj ponovno.';
  }
  if (code === 'storage/quota-exceeded') return 'Prostor za pohranu je pun. Javi se administratoru.';
  return 'Prijenos nije uspio. Pokušaj ponovno.';
}

/** Only http(s) links may be rendered as clickable URLs (blocks javascript: etc.). */
export const safeUrl = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
};
