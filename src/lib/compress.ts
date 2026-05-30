/**
 * Compress an image file using a canvas element.
 * Returns a compressed Blob.
 */
export async function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.80
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Validate a video file:
 * - Max file size 150MB (no limit for admin)
 * - Max duration 60s (no limit for admin)
 */
export async function validateVideo(file: File, isAdmin: boolean = false): Promise<void> {
  const maxSize = 150 * 1024 * 1024;
  if (!isAdmin && file.size > maxSize) {
    throw new Error('Video je prevelik. Maksimalna veličina je 150MB.');
  }
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (!isAdmin && video.duration > 60) {
        reject(new Error('Video ne smije biti duži od 60 sekundi.'));
      } else {
        resolve();
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Nije moguće učitati video.'));
    };
    video.src = url;
  });
}

export async function compressVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile } = await import('@ffmpeg/util');

  const ffmpeg = new FFmpeg();
  
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    });
  }

  await ffmpeg.load({
    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
    wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
    classWorkerURL: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js'
  });

  const tempName = 'input_video.mp4';
  await ffmpeg.writeFile(tempName, await fetchFile(file));

  await ffmpeg.exec([
    '-i', tempName,
    '-vf', "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-c:a', 'aac',
    '-b:a', '128k',
    'output.mp4'
  ]);

  const data = await ffmpeg.readFile('output.mp4');
  ffmpeg.terminate();
  return new Blob([data as any], { type: 'video/mp4' });
}


