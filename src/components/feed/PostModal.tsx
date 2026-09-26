import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon, Send, AlertCircle, Video, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  useUpload,
  FEED_VIDEO_MAX_SECONDS,
  POST_CONTENT_MAX,
  POST_TITLE_MAX,
} from '../../contexts/UploadContext';
import { useMemberSearch } from '../../hooks/useMemberSearch';
import MentionDropdown from '../ui/MentionDropdown';
import { MediaError, formatDuration, isImageFile, isVideoFile, readVideoInfo } from '../../lib/media';
import { isAdminEmail } from '../../lib/admin';
import { bottomNavEventTarget } from '../layout/BottomNav';

const MENTION_CHARS = '[\\p{L}\\p{N}._-]';
const ACTIVE_MENTION = new RegExp(`@(${MENTION_CHARS}*)$`, 'u');

function getActiveMention(text: string, cursorPos: number): string | null {
  const match = text.slice(0, cursorPos).match(ACTIVE_MENTION);
  return match ? match[1] : null;
}

function replaceMention(text: string, cursorPos: number, username: string): string {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  return before.replace(ACTIVE_MENTION, `@${username} `) + after;
}

/** Some pickers (Windows, older Android) hand over .mov/.mp4 files without a MIME type. */
function withMediaType(file: File): File {
  if (file.type) return file;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const type =
    ext === 'mov' ? 'video/quicktime' :
    ext === 'mp4' || ext === 'm4v' ? 'video/mp4' :
    ext === 'webm' ? 'video/webm' :
    ext === 'heic' ? 'image/heic' :
    ext === 'heif' ? 'image/heif' : '';
  return type ? new File([file], file.name, { type, lastModified: file.lastModified }) : file;
}

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PostModal({ isOpen, onClose }: PostModalProps) {
  const { user, profile, isActualAdmin } = useAuth();
  const { enqueue } = useUpload();
  const isAdmin = isActualAdmin || isAdminEmail(user?.email);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [validating, setValidating] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickToken = useRef(0);

  const [activeMention, setActiveMention] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const mentionResults = useMemberSearch(activeMention ?? '');

  // Stable preview URL, revoked whenever the file changes or the modal unmounts
  const previewUrl = useMemo(() => (mediaFile ? URL.createObjectURL(mediaFile) : null), [mediaFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) {
      bottomNavEventTarget.dispatchEvent(new Event('hide'));
    } else {
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    }
    return () => {
      document.body.style.overflow = '';
      bottomNavEventTarget.dispatchEvent(new Event('show'));
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart ?? val.length;
    const mention = getActiveMention(val, cursor);
    if (mention !== null) {
      setActiveMention(mention);
      const rect = textareaRef.current?.getBoundingClientRect();
      if (rect) setMentionPos({ top: rect.bottom + 8, left: rect.left });
    } else {
      setActiveMention(null);
    }
  };

  const handleMentionSelect = (username: string) => {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    setContent(replaceMention(content, cursor, username));
    setActiveMention(null);
    textareaRef.current?.focus();
  };

  const clearMedia = () => {
    pickToken.current++;
    setMediaFile(null);
    setMediaType(null);
    setValidating(false);
    setPreviewBroken(false);
  };

  const handleMediaSelect = async (picked: File, type: 'image' | 'video') => {
    const file = withMediaType(picked);
    const token = ++pickToken.current;
    setError(null);
    setMediaFile(null);
    setMediaType(null);
    setPreviewBroken(false);

    if (type === 'image') {
      if (!isImageFile(file)) {
        setError('Odabrana datoteka nije slika.');
        return;
      }
      setMediaFile(file);
      setMediaType('image');
      return;
    }

    if (!isVideoFile(file)) {
      setError('Odabrana datoteka nije video.');
      return;
    }
    setValidating(true);
    try {
      const info = await readVideoInfo(file);
      if (token !== pickToken.current) return;
      if (!isAdmin && info.duration > FEED_VIDEO_MAX_SECONDS + 0.5) {
        throw new MediaError(`Video smije trajati najviše ${formatDuration(FEED_VIDEO_MAX_SECONDS)} min.`);
      }
    } catch (e) {
      if (token !== pickToken.current) return;
      // The browser can't preview it (e.g. HEVC .mov) — it can still be
      // converted to MP4 during upload when WebCodecs is available.
      const canConvert = typeof window !== 'undefined' && 'VideoEncoder' in window;
      if (e instanceof MediaError && (e.message.startsWith('Video smije') || !canConvert)) {
        setError(e.message);
        setValidating(false);
        return;
      }
      if (!canConvert) {
        setError('Ovaj video format nije podržan. Pošalji MP4 ili MOV.');
        setValidating(false);
        return;
      }
      setPreviewBroken(true);
    }
    if (token !== pickToken.current) return;
    setMediaFile(file);
    setMediaType('video');
    setValidating(false);
  };

  const trimmed = content.trim();
  const canSubmit = (trimmed.length > 0 || !!mediaFile) && !validating && content.length <= POST_CONTENT_MAX;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setError(null);

    // Hand off to the background upload queue and close immediately
    enqueue({
      user,
      profile: profile ? { username: profile.username, avatar_url: profile.avatar_url } : null,
      content,
      title,
      mediaFile,
      mediaType,
      isAdmin,
    });

    setTitle('');
    setContent('');
    setMediaFile(null);
    setMediaType(null);
    setActiveMention(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full md:max-w-lg ursa-card rounded-t-[2rem] md:rounded-[2rem] p-6 z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-black text-lg uppercase">Nova Objava</h2>
          <button onClick={onClose} aria-label="Zatvori" className="p-2 text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={POST_TITLE_MAX}
          placeholder="Naslov (neobavezno)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
        />

        {/* Content */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          maxLength={POST_CONTENT_MAX}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setActiveMention(null);
            else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
          placeholder="Što ti je na umu, kreativče? Podijeli hook ili pobjedu..."
          className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[120px] placeholder:text-muted-foreground/50 outline-none text-base"
        />
        {content.length > POST_CONTENT_MAX - 300 && (
          <p className="text-right text-[11px] text-muted-foreground mb-2">
            {content.length}/{POST_CONTENT_MAX}
          </p>
        )}

        {/* Video being checked */}
        {validating && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-white/5 px-3 py-3 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Provjeravam video...</span>
          </div>
        )}

        {/* Media preview — stable URL, no flash */}
        {previewUrl && mediaType && (
          <div className="relative w-full mb-3 bg-black/40 rounded-xl overflow-hidden">
            {mediaType === 'image' ? (
              <img src={previewUrl} className="w-full max-h-64 object-contain" alt="Pregled odabrane slike" decoding="async" />
            ) : previewBroken ? (
              <div className="w-full h-32 flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs px-4 text-center">
                <Video className="w-6 h-6" />
                <span className="truncate max-w-full">{mediaFile?.name}</span>
                <span>Pregled nije dostupan — video će se pretvoriti u MP4 pri objavi.</span>
              </div>
            ) : (
              <video
                src={`${previewUrl}#t=0.001`}
                className="w-full max-h-64 bg-black"
                style={{ objectFit: 'contain' }}
                controls
                playsInline
                muted
                preload="metadata"
              />
            )}
            <button
              onClick={clearMedia}
              aria-label="Ukloni prilog"
              className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 hover:bg-black transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs mb-3 bg-red-500/10 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={validating}
              className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
              title="Dodaj sliku"
              aria-label="Dodaj sliku"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={validating}
              className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
              title={isAdmin ? 'Dodaj video' : `Dodaj video (max ${FEED_VIDEO_MAX_SECONDS}s)`}
              aria-label="Dodaj video"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-2 bg-primary text-black rounded-full font-black text-sm disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(190,242,100,0.2)] flex items-center gap-2"
          >
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            OBJAVI {!validating && <Send className="w-4 h-4" />}
          </button>
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaSelect(f, 'image'); e.target.value = ''; }} />
        <input ref={videoInputRef} type="file" accept="video/*,.mov,.mp4,.m4v" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaSelect(f, 'video'); e.target.value = ''; }} />
      </motion.div>

      {activeMention !== null && mentionResults.length > 0 && (
        <MentionDropdown users={mentionResults} onSelect={handleMentionSelect} position={mentionPos} />
      )}
    </div>
  );
}
