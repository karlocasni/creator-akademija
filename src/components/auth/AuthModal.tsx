import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { auth, db, functions } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  
  // Update mode if initialMode changes while open or when opening
  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode, isOpen]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const finalUsername = username || email.split('@')[0];
        
        // Postavi ime na Auth objektu kako bi radilo u %DISPLAY_NAME% predlošku
        await updateProfile(user, { displayName: finalUsername });
        
        // Zatraži od cloud funkcije da generira i pošalje custom HTML verifikacijski link
        try {
          const sendCustomVerification = httpsCallable(functions, 'sendCustomVerificationEmail');
          await sendCustomVerification();
        } catch (emailErr) {
          console.error("Neuspjelo slanje verifikacijskog emaila:", emailErr);
        }
        
        // Create profile in Firestore
        await setDoc(doc(db, 'profiles', user.uid), {
          username: finalUsername,
          email,
          status: 'inactive',
          xp: 0,
          level: 1,
          gender,
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        message = 'Pogrešan email ili lozinka. Provjerite podatke ili se registrirajte.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Ovaj email se već koristi. Pokušajte se prijaviti.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Lozinka mora imati barem 6 znakova.';
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-md glass p-8 rounded-[2.5rem] border-primary/20 animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter text-white">
          {isLogin ? 'Dobrodošao natrag' : 'Pridruži se plemenu'}
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {isLogin ? 'Prijavi se za nastavak transformacije.' : 'Započni svoju evoluciju danas.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Korisničko ime"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
                required
              />
            </div>
          )}

          {!isLogin && (
            <div className="relative flex gap-4">
              <label className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-colors bg-white/5 text-white hover:border-primary/50
                has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                  className="hidden"
                />
                <span className="font-bold text-sm uppercase">Muško</span>
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-colors bg-white/5 text-white hover:border-primary/50
                has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                  className="hidden"
                />
                <span className="font-bold text-sm uppercase">Žensko</span>
              </label>
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email adresa"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="password"
              placeholder="Lozinka"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            onClick={() => {
              if (!isLogin && typeof (window as any).fbq === 'function') {
                (window as any).fbq('track', 'Lead');
              }
            }}
            className="w-full py-4 bg-primary text-black rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? 'OBRADA...' : (isLogin ? 'PRIJAVI SE' : 'REGISTRIRAJ SE')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-muted-foreground">
          {isLogin ? 'Nemaš račun?' : 'Već imaš račun?'} {' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-bold hover:underline"
          >
            {isLogin ? 'Registriraj se' : 'Prijavi se'}
          </button>
        </p>
      </div>
    </div>
  );
}
