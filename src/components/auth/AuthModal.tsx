import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth, isAccessExpired } from '../../contexts/AuthContext';
import { saveAccountEmail } from '../../lib/account';
import { trackPixel } from '../../lib/consent';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

type Mode = 'login' | 'register' | 'reset';
type Message = { kind: 'error' | 'success'; text: string; action?: 'resend' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^@?[\p{L}\p{N}._-]{2,30}$/u;

function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Pogrešan email ili lozinka.';
    case 'auth/invalid-email':
      return 'Email adresa nije ispravna.';
    case 'auth/too-many-requests':
      return 'Previše neuspjelih pokušaja. Pričekaj nekoliko minuta ili resetiraj lozinku.';
    case 'auth/user-disabled':
      return 'Ovaj račun je deaktiviran. Javi nam se ako misliš da je greška.';
    case 'auth/network-request-failed':
      return 'Nema internetske veze. Provjeri vezu i pokušaj ponovno.';
    case 'auth/email-already-in-use':
      return 'Račun s ovim emailom već postoji. Prijavi se ili resetiraj lozinku.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'Lozinka je preslaba. Koristi barem 8 znakova, slova i brojeve.';
    default:
      return 'Nešto je pošlo po zlu. Pokušaj ponovno.';
  }
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const navigate = useNavigate();
  const { beginAuthFlow, endAuthFlow, authNotice, clearAuthNotice } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  // Reset the mode when the modal is (re)opened from a different button
  useEffect(() => {
    setMode(initialMode);
    setMessage(null);
  }, [initialMode, isOpen]);

  // A forced sign-out (expired access, unverified email…) is shown on the login form
  useEffect(() => {
    if (isOpen && authNotice) {
      setMode('login');
      setMessage({ kind: 'error', text: authNotice });
      clearAuthNotice();
    }
  }, [isOpen, authNotice, clearAuthNotice]);

  if (!isOpen) return null;

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const cleanEmail = email.trim().toLowerCase();

  const switchMode = (next: Mode) => {
    setMode(next);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const validate = (): string | null => {
    if (!EMAIL_RE.test(cleanEmail)) return 'Upiši ispravnu email adresu.';
    if (mode === 'reset') return null;
    if (!password) return 'Upiši lozinku.';
    if (isRegister) {
      if (!USERNAME_RE.test(username.trim())) {
        return 'Korisničko ime mora imati 2–30 znakova (slova, brojevi, točka, crtica).';
      }
      const ageNum = parseInt(age, 10);
      if (!ageNum || ageNum < 13 || ageNum > 100) return 'Upiši ispravnu dob (13–100).';
      if (password.length < 8) return 'Lozinka mora imati barem 8 znakova.';
      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Lozinka mora sadržavati slova i brojeve.';
      if (password !== confirmPassword) return 'Lozinke se ne podudaraju.';
    }
    return null;
  };

  const handleLogin = async () => {
    beginAuthFlow();
    try {
      const { user } = await signInWithEmailAndPassword(auth, cleanEmail, password);
      // Before any sign-out below, so admins see the email of accounts awaiting activation
      await saveAccountEmail(user.uid, user.email).catch(() => {});
      const snap = await getDoc(doc(db, 'profiles', user.uid)).catch(() => null);
      const data = snap?.exists() ? snap.data() : null;
      const admin = data?.isAdmin === true;

      if (!admin && !user.emailVerified && data?.status !== 'active') {
        await signOut(auth);
        setMessage({
          kind: 'error',
          text: 'Email adresa još nije potvrđena. Klikni link koji smo ti poslali (provjeri i spam).',
          action: 'resend',
        });
        return;
      }
      if (!admin && isAccessExpired(data?.accessUntil)) {
        await signOut(auth);
        setMessage({ kind: 'error', text: 'Tvoj pristup platformi je istekao. Javi nam se za produljenje.' });
        return;
      }

      navigate('/feed', { replace: true });
      onClose();
    } finally {
      endAuthFlow();
    }
  };

  const handleRegister = async () => {
    beginAuthFlow();
    try {
      const { user } = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const rawName = username.trim();
      const cleanUsername = rawName.startsWith('@') ? rawName : `@${rawName}`;
      const handle = (v: string) => {
        const t = v.trim();
        return t ? (t.startsWith('@') ? t : `@${t}`) : '';
      };

      await updateProfile(user, { displayName: cleanUsername });
      await setDoc(doc(db, 'profiles', user.uid), {
        uid: user.uid,
        username: cleanUsername,
        status: 'inactive',
        xp: 0,
        level: 1,
        gender,
        age: parseInt(age, 10) || null,
        instagram: handle(instagram),
        tiktok: handle(tiktok),
        createdAt: new Date().toISOString(),
      });
      await saveAccountEmail(user.uid, cleanEmail);
      await sendEmailVerification(user);
      await signOut(auth);
      trackPixel('Lead');

      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setMessage({
        kind: 'success',
        text: `Račun je kreiran! Poslali smo link za potvrdu na ${cleanEmail}. Potvrdi email pa se prijavi.`,
      });
    } finally {
      endAuthFlow();
    }
  };

  const handleReset = async () => {
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      // Unknown emails are not revealed; only real problems are shown
      if (err?.code !== 'auth/user-not-found') throw err;
    }
    setMessage({
      kind: 'success',
      text: `Ako postoji račun za ${cleanEmail}, poslali smo link za novu lozinku.`,
    });
  };

  const handleResendVerification = async () => {
    setLoading(true);
    beginAuthFlow();
    try {
      const { user } = await signInWithEmailAndPassword(auth, cleanEmail, password);
      await sendEmailVerification(user);
      await signOut(auth);
      setMessage({ kind: 'success', text: `Novi link za potvrdu poslan je na ${cleanEmail}.` });
    } catch (err: any) {
      setMessage({ kind: 'error', text: authErrorMessage(err?.code) });
    } finally {
      endAuthFlow();
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const invalid = validate();
    if (invalid) {
      setMessage({ kind: 'error', text: invalid });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (isLogin) await handleLogin();
      else if (isRegister) await handleRegister();
      else await handleReset();
    } catch (err: any) {
      setMessage({ kind: 'error', text: authErrorMessage(err?.code) });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-2xl py-4 focus:border-primary focus:outline-none transition-colors text-white';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative w-full max-w-md glass p-6 sm:p-8 rounded-[2.5rem] border-primary/20 animate-in fade-in zoom-in duration-300 my-auto"
      >
        <button
          onClick={onClose}
          aria-label="Zatvori"
          className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="auth-title" className="text-3xl font-black mb-2 uppercase tracking-tighter text-white pr-10">
          {isLogin ? 'Dobrodošao natrag' : isRegister ? 'Pridruži se plemenu' : 'Nova lozinka'}
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          {isLogin
            ? 'Prijavi se za nastavak transformacije.'
            : isRegister
              ? 'Započni svoju evoluciju danas.'
              : 'Upiši email i poslat ćemo ti link za postavljanje nove lozinke.'}
        </p>

        {message && (
          <div
            role={message.kind === 'error' ? 'alert' : 'status'}
            className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
              message.kind === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {message.kind === 'error'
              ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              : <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />}
            <div className="space-y-2">
              <p>{message.text}</p>
              {message.action === 'resend' && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="font-bold text-white underline underline-offset-2 hover:text-primary disabled:opacity-50"
                >
                  Pošalji link ponovno
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {isRegister && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Korisničko ime (npr. @kreator)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                maxLength={31}
                className={`${inputClass} pl-12 pr-4`}
              />
            </div>
          )}

          {isRegister && (
            <div className="flex gap-4">
              <div className="flex-[2] flex gap-2">
                {(['male', 'female'] as const).map(g => (
                  <label
                    key={g}
                    className={`flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border cursor-pointer transition-colors bg-white/5 text-white hover:border-primary/50 ${gender === g ? 'border-primary bg-primary/10' : 'border-white/10'}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className="sr-only"
                    />
                    <span className="font-bold text-xs uppercase">{g === 'male' ? 'Muško' : 'Žensko'}</span>
                  </label>
                ))}
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Dob"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-center focus:border-primary focus:outline-none transition-colors text-white text-sm"
                  min="13"
                  max="100"
                />
              </div>
            </div>
          )}

          {isRegister && (
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Instagram (npr. @kreator)"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                maxLength={40}
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white text-sm"
              />
              <input
                type="text"
                placeholder="TikTok (npr. @kreator)"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                maxLength={40}
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white text-sm"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email adresa"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              className={`${inputClass} pl-12 pr-4`}
            />
          </div>

          {mode !== 'reset' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Lozinka"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className={`${inputClass} pl-12 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          )}

          {isRegister && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Potvrdi lozinku"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`${inputClass} pl-12 pr-4`}
              />
            </div>
          )}

          {isLogin && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                Zaboravljena lozinka?
              </button>
            </div>
          )}

          {isRegister && (
            <p className="text-xs text-white/45 text-center leading-relaxed">
              Registracijom prihvaćaš{' '}
              <a href="/uvjeti" target="_blank" rel="noopener" className="text-primary underline underline-offset-2">
                Uvjete korištenja
              </a>{' '}
              i potvrđuješ da imaš barem 16 godina ili suglasnost roditelja te da si pročitao/la{' '}
              <a href="/privatnost" target="_blank" rel="noopener" className="text-primary underline underline-offset-2">
                Pravila privatnosti
              </a>.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-black rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? 'OBRADA...' : isLogin ? 'PRIJAVI SE' : isRegister ? 'REGISTRIRAJ SE' : 'POŠALJI LINK'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-muted-foreground">
          {mode === 'reset' ? (
            <button onClick={() => switchMode('login')} className="text-primary font-bold hover:underline">
              Natrag na prijavu
            </button>
          ) : (
            <>
              {isLogin ? 'Nemaš račun?' : 'Već imaš račun?'}{' '}
              <button
                onClick={() => switchMode(isLogin ? 'register' : 'login')}
                className="text-primary font-bold hover:underline"
              >
                {isLogin ? 'Registriraj se' : 'Prijavi se'}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
