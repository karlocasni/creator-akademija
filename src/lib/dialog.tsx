import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

/**
 * In-app replacements for window.alert / window.confirm (native dialogs are
 * blocked in embedded browsers and look out of place on mobile).
 * Mount <DialogHost /> once at the app root.
 */

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; text: string }
interface ConfirmRequest {
  id: number;
  text: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

let nextId = 1;
let toasts: Toast[] = [];
let confirmQueue: ConfirmRequest[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function toast(text: string, kind: ToastKind = 'info') {
  const id = nextId++;
  toasts = [...toasts, { id, kind, text }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    emit();
  }, kind === 'error' ? 6000 : 3500);
}

export function confirmDialog(
  text: string,
  { confirmLabel = 'Potvrdi', danger = false }: { confirmLabel?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise(resolve => {
    confirmQueue = [...confirmQueue, { id: nextId++, text, confirmLabel, danger, resolve }];
    emit();
  });
}

function settle(req: ConfirmRequest, ok: boolean) {
  confirmQueue = confirmQueue.filter(r => r.id !== req.id);
  emit();
  req.resolve(ok);
}

export function DialogHost() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const current = confirmQueue[0];

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(current, false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current]);

  return (
    <>
      <div
        className="fixed inset-x-0 z-[400] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
                t.kind === 'error'
                  ? 'border-red-500/30 bg-[#2A1418]/95 text-red-100'
                  : t.kind === 'success'
                    ? 'border-emerald-500/30 bg-[#11261F]/95 text-emerald-100'
                    : 'border-white/10 bg-[#151E30]/95 text-white'
              }`}
            >
              {t.kind === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                : t.kind === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  : <Info className="w-5 h-5 shrink-0 text-primary" />}
              <span className="leading-snug">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            className="fixed inset-0 z-[410] flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => settle(current, false)} />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#151E30] p-6 shadow-2xl"
            >
              <p className="text-white text-sm leading-relaxed mb-6">{current.text}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => settle(current, false)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors"
                >
                  Odustani
                </button>
                <button
                  autoFocus
                  onClick={() => settle(current, true)}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors ${
                    current.danger ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {current.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
