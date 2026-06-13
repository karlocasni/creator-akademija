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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      alert('Lozinke se ne podudaraju.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const isBypassed = user.email === 'ismael@akademija.com' ||
                           (user.email || '').toLowerCase().includes('admin') ||
                           (user.displayName || '').toLowerCase().includes('admin');
        
        // Provjeri je li email verificiran (osim ako nije admin ili mock korisnik)
        if (!user.emailVerified && !isBypassed) {
          alert('Molimo potvrdite vašu email adresu. Poslan vam je link za verifikaciju.');
          await sendEmailVerification(user);
          await auth.signOut();
          setLoading(false);
          return;
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const finalUsername = username || email.split('@')[0];
        const cleanUsername = finalUsername.startsWith('@') ? finalUsername : `@${finalUsername}`;
        
        // Postavi ime na Auth objektu
        await updateProfile(user, { displayName: cleanUsername });
        
        // Pošalji standardni Firebase verifikacijski email
        await sendEmailVerification(user);
        
        const cleanInstagram = instagram ? (instagram.startsWith('@') ? instagram : `@${instagram}`) : '';
        const cleanTiktok = tiktok ? (tiktok.startsWith('@') ? tiktok : `@${tiktok}`) : '';

        // Create profile in Firestore
        await setDoc(doc(db, 'profiles', user.uid), {
          username: cleanUsername,
          email,
          status: 'inactive',
          xp: 0,
          level: 1,
          gender,
          age: parseInt(age) || null,
          instagram: cleanInstagram,
          tiktok: cleanTiktok,
          createdAt: new Date().toISOString()
        });

        alert('Registracija uspješna! Poslan je link za verifikaciju na vaš email. Potvrdite ga prije prijave.');
        // Odjavi se odmah kako bi se morao prijaviti nakon verifikacije
        await auth.signOut();
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
                placeholder="Korisničko ime / Nadimak (npr. @kreator)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
                required
              />
            </div>
          )}

          {!isLogin && (
            <div className="flex gap-4">
              <div className="flex-[2] flex gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border cursor-pointer transition-colors bg-white/5 text-white hover:border-primary/50 ${gender === 'male' ? 'border-primary bg-primary/10' : 'border-white/10'}`}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                    className="hidden"
                  />
                  <span className="font-bold text-xs uppercase">Muško</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3.5 rounded-2xl border cursor-pointer transition-colors bg-white/5 text-white hover:border-primary/50 ${gender === 'female' ? 'border-primary bg-primary/10' : 'border-white/10'}`}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                    className="hidden"
                  />
                  <span className="font-bold text-xs uppercase">Žensko</span>
                </label>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Dob"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-center focus:border-primary focus:outline-none transition-colors text-white text-sm"
                  min="10"
                  max="100"
                  required
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Instagram (npr. @kreator)"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white text-sm"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="TikTok (npr. @kreator)"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white text-sm"
                />
              </div>
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

          {!isLogin && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                placeholder="Potvrdi lozinku"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
                required
              />
            </div>
          )}

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
