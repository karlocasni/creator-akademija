// Cookie consent for the marketing cookies (Meta Pixel). Nothing from Meta is
// loaded until the visitor accepts; essential storage (login session, offline
// cache) doesn't need consent.

export type ConsentChoice = 'granted' | 'denied';

const KEY = 'ca_cookie_consent';
const PIXEL_ID = '2036092590665887';
const listeners = new Set<() => void>();

export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice) {
  try { localStorage.setItem(KEY, choice); } catch { /* private mode: ask again next visit */ }
  if (choice === 'granted') loadMetaPixel();
  listeners.forEach(fn => fn());
}

/** Forget the choice so the banner asks again (withdrawing consent reloads to drop the pixel). */
export function resetConsent() {
  const wasGranted = getConsent() === 'granted';
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  if (wasGranted) window.location.reload();
  else listeners.forEach(fn => fn());
}

export function onConsentChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[][]; loaded: boolean; version: string; push: unknown };

/** Meta's standard base snippet, run only after consent. */
export function loadMetaPixel() {
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  w.fbq = n;
  w._fbq = n;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  n('init', PIXEL_ID);
  n('track', 'PageView');
}

/** Sends a Pixel event only if the visitor accepted marketing cookies. */
export function trackPixel(event: string) {
  if (getConsent() !== 'granted') return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq === 'function') fbq('track', event);
}

/** Call once at startup: restores the pixel for visitors who already accepted. */
export function initConsent() {
  if (getConsent() === 'granted') loadMetaPixel();
}
