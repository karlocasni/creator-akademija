import { useUpload, UploadJob } from '../../contexts/UploadContext';
import { X, CheckCircle2, AlertCircle, Loader2, ImageIcon, Video } from 'lucide-react';
import { cn } from '../../lib/utils';

function JobCard({ job }: { job: UploadJob }) {
  const { dismiss } = useUpload();

  const label =
    job.phase === 'compressing' ? `Kompresija ${job.progress}%` :
    job.phase === 'uploading'   ? `Slanje ${job.progress}%` :
    job.phase === 'saving'      ? 'Objava...' :
    job.phase === 'done'        ? 'Objavljeno ✓' :
                                  'Greška';

  const isDone  = job.phase === 'done';
  const isError = job.phase === 'error';

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl border transition-all',
      'bg-[#111] backdrop-blur-xl',
      isDone  ? 'border-primary/30' :
      isError ? 'border-red-500/30' :
                'border-white/10',
    )}>
      {/* Media thumbnail / icon */}
      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
        {job.previewUrl ? (
          job.mediaType === 'video'
            ? <video src={job.previewUrl} className="w-full h-full object-cover" muted />
            : <img src={job.previewUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          job.mediaType === 'video'
            ? <Video className="w-4 h-4 text-muted-foreground" />
            : <ImageIcon className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Progress */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs font-black uppercase tracking-widest',
          isDone ? 'text-primary' : isError ? 'text-red-400' : 'text-white'
        )}>
          {label}
        </p>
        {isError && job.errorMsg && (
          <p className="text-[10px] text-red-400/70 truncate mt-0.5">{job.errorMsg}</p>
        )}
        {!isDone && !isError && (
          <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status icon / dismiss */}
      {isDone ? (
        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
      ) : isError ? (
        <button onClick={() => dismiss(job.id)} className="p-0.5 hover:text-white text-muted-foreground flex-shrink-0">
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
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 md:bottom-6 z-[200] flex flex-col gap-2 w-[280px]">
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
