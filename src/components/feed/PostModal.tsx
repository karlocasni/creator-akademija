import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon, Send, AlertCircle, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUpload } from '../../contexts/UploadContext';
import { cn } from '../../lib/utils';
import { useMemberSearch } from '../../hooks/useMemberSearch';
import MentionDropdown from '../ui/MentionDropdown';
import { validateVideo } from '../../lib/compress';
import { bottomNavEventTarget } from '../layout/BottomNav';


function getActiveMention(text: string, cursorPos: number): string | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/@(\w*)$/);
  return match ? match[1] : null;
}

function replaceMention(text: string, cursorPos: number, username: string): string {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  return before.replace(/@\w*$/, `@${username} `) + after;
}

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PostModal({ isOpen, onClose }: PostModalProps) {
  const { user, profile } = useAuth();
  const { enqueue } = useUpload();

  const [category, setCategory] = useState<string>('Opća rasprava');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeMention, setActiveMention] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const mentionResults = useMemberSearch(activeMention ?? '');

  // Stable preview URL
  const previewUrl = useMemo(() => mediaFile ? URL.createObjectURL(mediaFile) : null, [mediaFile]);
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

  const handleMediaSelect = async (file: File, type: 'image' | 'video') => {
    setError(null);
    try {
      if (type === 'video') await validateVideo(file, !!profile?.isAdmin);
      setMediaFile(file);
      setMediaType(type);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    setError(null);

    // Hand off to background context and close immediately
    enqueue({ user, profile, content, title, category, mediaFile, mediaType });

    // Reset form
    setTitle('');
    setContent('');
    setMediaFile(null);
    setMediaType(null);
    setActiveMention(null);
    setCategory('Opća rasprava');
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
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Optional title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Naslov (neobavezno)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
        />

        {/* Content */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setActiveMention(null);
            else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
          placeholder="Što ti je na umu, kreativče? Podijeli hook ili pobjedu..."
          className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[120px] placeholder:text-muted-foreground/50 outline-none text-base"
        />

        {/* Media preview — stable URL, no flash */}
        {previewUrl && mediaType && (
          <div className="relative w-full mb-3 bg-black/40 rounded-xl overflow-hidden">
            {mediaType === 'image' ? (
              <img src={previewUrl} className="w-full max-h-64 object-contain" alt="Preview" />
            ) : (
              <video
                src={previewUrl}
                className="w-full max-h-64 bg-black"
                style={{ objectFit: 'contain' }}
                controls
                playsInline
                muted
              />
            )}
            <button
              onClick={() => { setMediaFile(null); setMediaType(null); }}
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
              className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-primary transition-colors"
              title="Dodaj sliku"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-primary transition-colors"
              title="Dodaj video (max 60s)"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-6 py-2 bg-primary text-black rounded-full font-black text-sm disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(190,242,100,0.2)] flex items-center gap-2"
          >
            OBJAVI <Send className="w-4 h-4" />
          </button>
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaSelect(f, 'image'); e.target.value = ''; }} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaSelect(f, 'video'); e.target.value = ''; }} />
      </motion.div>

      {activeMention !== null && mentionResults.length > 0 && (
        <MentionDropdown users={mentionResults} onSelect={handleMentionSelect} position={mentionPos} />
      )}
    </div>
  );
}
