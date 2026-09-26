import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, LogOut, Sparkles, Clock, Instagram } from 'lucide-react';
import { LegalLinks } from '../components/legal/LegalPage';

// Payments are not integrated yet: a new account waits here until an admin
// activates it on the Members page. The profile listener in AuthContext lets
// the user in automatically the moment that happens.
export default function Paywall() {
  const { profile, user, signOut } = useAuth();
  const email = profile?.email || user?.email || '';

  return (
    <div className="min-h-screen bg-background text-white flex flex-col justify-between relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[90px] pointer-events-none z-0" />

      <header className="w-full py-6 px-6 md:px-8 flex justify-between items-center border-b border-white/5 relative z-10 bg-background/50 backdrop-blur-md">
        <span className="font-extrabold text-xl tracking-tighter uppercase text-white flex items-center gap-2">
          CREATOR <span className="text-primary font-marker normal-case tracking-normal text-2xl">Akademija</span>
        </span>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-wider border border-white/5"
        >
          <LogOut className="w-3.5 h-3.5" /> Odjava
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10 my-8">
        <div className="w-full max-w-md glass border border-primary/20 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto mb-6 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary text-[10px] font-black uppercase tracking-widest">
              Jedan korak do akademije
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-center uppercase tracking-tight text-white mb-2">
            Aktivacija profila
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs mx-auto">
            Tvoj račun je kreiran. Pristup lekcijama, alatima i zajednici otključava se čim je članstvo plaćeno i aktivirano.
          </p>

          <div className="bg-white/5 border border-white/5 rounded-3xl p-5 mb-6 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/20 text-primary px-3 py-1 font-bold text-[8px] tracking-wider uppercase rounded-bl-xl border-l border-b border-primary/10">
              DOŽIVOTNO
            </div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1">
              Creator Akademija pristup
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl md:text-5xl font-black text-white">89€</span>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">/ jednokratno</span>
            </div>
          </div>

          <div className="space-y-3 mb-8 text-left">
            {[
              'Svih 9 video lekcija',
              'Predaja videa i ocjena mentora',
              'Alati za hookove i ideje za videe',
              'Zajednica, događaji uživo i poruke',
            ].map(txt => (
              <div key={txt} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-bold text-white/80">{txt}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-primary/5 border border-primary/15 p-4">
              <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-white/75 leading-relaxed">
                Nakon uplate javi nam se s emailom računa
                {email && <> (<span className="font-bold text-white break-all">{email}</span>)</>} — aktivirat ćemo ga,
                a ova stranica će se sama otvoriti čim je pristup odobren.
              </p>
            </div>
            <a
              href="https://ig.me/m/creator_akademija"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Instagram className="w-4 h-4" /> Javi se na Instagramu
            </a>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 px-8 text-center text-[10px] text-muted-foreground border-t border-white/5 relative z-10 bg-background/30 backdrop-blur-sm">
        <p>© {new Date().getFullYear()} Creator Akademija · <LegalLinks /></p>
      </footer>
    </div>
  );
}
