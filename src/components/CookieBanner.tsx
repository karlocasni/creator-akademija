import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, onConsentChange, setConsent } from '../lib/consent';

/** Asks once whether Meta (Facebook/Instagram) marketing cookies may be used. */
export default function CookieBanner() {
  const [open, setOpen] = useState(() => getConsent() === null);

  useEffect(() => onConsentChange(() => setOpen(getConsent() === null)), []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Kolačići"
      className="fixed inset-x-0 bottom-0 z-[200] p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#141414]/95 backdrop-blur-md shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm text-white/75 leading-relaxed flex-1">
          Koristimo nužne kolačiće da bi prijava i aplikacija radile. Uz tvoj pristanak koristimo i
          Meta Pixel (Facebook/Instagram) za mjerenje oglasa.{' '}
          <Link to="/privatnost" className="text-primary underline underline-offset-2 hover:opacity-80">
            Pravila privatnosti
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setConsent('denied')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Odbij
          </button>
          <button
            onClick={() => setConsent('granted')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Prihvati
          </button>
        </div>
      </div>
    </div>
  );
}
