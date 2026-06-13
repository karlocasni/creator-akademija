import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, CheckCircle2, LogOut, Sparkles } from 'lucide-react';
import StripePayment from '../components/payment/StripePayment';

export default function Paywall() {
  const { profile, updateLocalProfile, signOut } = useAuth();

  const handleActivationSuccess = () => {
    updateLocalProfile({ status: 'active' });
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Dynamic background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[90px] pointer-events-none z-0" />

      {/* Top Header */}
      <header className="w-full py-6 px-8 flex justify-between items-center border-b border-white/5 relative z-10 bg-background/50 backdrop-blur-md">
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

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10 my-8">
        <div className="w-full max-w-md glass border border-primary/20 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_50px_rgba(245,165,0,0.15)] flex flex-col animate-in fade-in zoom-in-95 duration-500">
          
          {/* Badge */}
          <div className="mx-auto mb-6 inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary text-[10px] font-black uppercase tracking-widest">
              Jedan korak do akademije
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl md:text-3xl font-extrabold text-center uppercase tracking-tight text-white mb-2">
            Aktivacija Profila
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-8 max-w-xs mx-auto">
            Da bi pristupio bazi lekcija, alatima i zajednici, aktiviraj svoje doživotno članstvo.
          </p>

          {/* Pricing Info */}
          <div className="bg-white/5 border border-white/5 rounded-3xl p-5 mb-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary/20 text-primary px-3 py-1 font-bold text-[8px] tracking-wider uppercase rounded-bl-xl border-l border-b border-primary/10">
              DOŽIVOTNO
            </div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1">
              Kreator Akademija Pristup
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl md:text-5xl font-black text-white">89€</span>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">/ jednokratno</span>
            </div>
          </div>

          {/* Features Check List */}
          <div className="space-y-3 mb-8 text-left">
            {[
              "Pristup svih 9 premium modula",
              "Submissions grading sustav (odmentori)",
              "Viral Hook slot-machine generator",
              "Zajednica, rang liste i izravni chatovi"
            ].map((txt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-white/80">{txt}</span>
              </div>
            ))}
          </div>

          {/* Simulated Stripe Payment Component */}
          <div className="border-t border-white/5 pt-6">
            <StripePayment onSuccess={handleActivationSuccess} />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-8 text-center text-[10px] text-muted-foreground border-t border-white/5 relative z-10 bg-background/30 backdrop-blur-sm">
        <p>© 2026 Creator Akademija. 100% sigurna similirana aktivacija.</p>
      </footer>
    </div>
  );
}
