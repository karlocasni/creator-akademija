import { useUpload, UploadJob } from '../../contexts/UploadContext';
import { X, CheckCircle2, Loader2, ImageIcon, Video, RotateCcw, Copy, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from '../../lib/dialog';

function phaseLabel(job: UploadJob): string {
  const pct = job.progress != null ? ` ${job.progress}%` : '';
  switch (job.phase) {
    case 'compressing':
      return job.mediaType === 'video' ? `Priprema videa${pct}` : 'Obrada slike...';
    case 'uploading':
      return `Slanje${pct}`;
    case 'saving':
      return 'Objavljujem...';
    case 'done':
      return 'Objavljeno';
    default:
      return 'Objava nije uspjela';
  }
}

function JobCard({ job }: { job: UploadJob }) {
  const { dismiss, retry } = useUpload();

  const isDone = job.phase === 'done';
  const isError = job.phase === 'error';

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(job.content);
      toast('Tekst objave kopiran.', 'success');
    } catch {
      toast('Kopiranje nije uspjelo.', 'error');
    }
  };

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-2xl px-4 py-3 shadow-2xl border transition-all',
        'bg-[#111] backdrop-blur-xl',
        isDone ? 'border-primary/30' : isError ? 'border-red-500/30' : 'border-white/10',
      )}
    >
      {/* Media thumbnail / icon */}
      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
        {job.previewUrl ? (
          job.mediaType === 'video' ? (
            <video
              src={`${job.previewUrl}#t=0.001`}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={job.previewUrl} className="w-full h-full object-cover" alt="Pregled priloga" decoding="async" />
          )
        ) : job.mediaType === 'video' ? (
          <Video className="w-4 h-4 text-muted-foreground" />
        ) : job.mediaType === 'image' ? (
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        ) : (
          <FileText className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Progress */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-xs font-black uppercase tracking-widest',
            isDone ? 'text-primary' : isError ? 'text-red-400' : 'text-white',
          )}
        >
          {phaseLabel(job)}
        </p>
        {isError && job.errorMsg && (
          <p className="text-[11px] text-red-300/80 mt-0.5 leading-snug">{job.errorMsg}</p>
        )}
        {isError && (
          <div className="flex flex-wrap gap-2 mt-2">
            {job.canRetry && (
              <button
                onClick={() => retry(job.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-bold hover:bg-primary/25 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Pokušaj ponovno
              </button>
            )}
            {job.content.trim() && (
              <button
                onClick={copyText}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-[11px] font-bold hover:bg-white/15 transition-colors"
              >
                <Copy className="w-3 h-3" /> Kopiraj tekst
              </button>
            )}
          </div>
        )}
        {!isDone && !isError && (
          <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
            {job.progress != null ? (
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            ) : (
              <div className="bg-primary/70 h-full w-1/3 rounded-full animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Status icon / dismiss */}
      {isDone ? (
        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
      ) : isError ? (
        <button
          onClick={() => dismiss(job.id)}
          aria-label="Zatvori"
          className="p-0.5 hover:text-white text-muted-foreground flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
      )}
    </div>
  );
}

export default function UploadToast() {
  const { jobs } = useUpload();
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 md:bottom-6 z-[200] flex flex-col gap-2 w-[300px] max-w-[calc(100vw-2rem)]">
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
