import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const COMPANY = {
  name: 'GRIZLI GANG d.o.o. za marketing i usluge',
  shortName: 'GRIZLI GANG d.o.o.',
  address: 'Malešnica 27, 10000 Zagreb, Hrvatska',
  oib: '59878531102',
  email: 'ismael.hadzic17@gmail.com',
  instagramDm: 'https://ig.me/m/creator_akademija',
};

export const linkCls = 'text-primary underline underline-offset-2 hover:opacity-80';

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg sm:text-xl font-bold text-white mt-10 mb-3">{title}</h2>
      <div className="space-y-3 text-white/70 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export const b = (text: string) => <strong className="text-white/90 font-semibold">{text}</strong>;

export function CompanyBlock() {
  return (
    <p>
      {b(COMPANY.name)}<br />
      {COMPANY.address}<br />
      OIB: {COMPANY.oib}<br />
      Email: <a href={`mailto:${COMPANY.email}`} className={linkCls}>{COMPANY.email}</a><br />
      Instagram:{' '}
      <a href={COMPANY.instagramDm} target="_blank" rel="noopener noreferrer" className={linkCls}>@creator_akademija</a>
    </p>
  );
}

/** "Uvjeti korištenja · Pravila privatnosti" for footers and settings. */
export function LegalLinks({ className = '' }: { className?: string }) {
  const cls = 'underline underline-offset-2 hover:text-white/70 transition-colors';
  return (
    <span className={className}>
      <Link to="/uvjeti" className={cls}>Uvjeti korištenja</Link>
      {' · '}
      <Link to="/privatnost" className={cls}>Pravila privatnosti</Link>
    </span>
  );
}

export default function LegalPage({ title, updated, intro, children }: {
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | Creator Akademija`;
    window.scrollTo(0, 0);
    return () => { document.title = prev; };
  }, [title]);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-32">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Natrag
        </button>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-6">{title}</h1>
        <p className="text-sm text-white/45 mt-2">Zadnja izmjena: {updated}</p>

        <div className="text-white/70 leading-relaxed mt-6 text-[15px]">{intro}</div>

        {children}

        <p className="text-xs text-white/35 mt-14 pt-6 border-t border-white/10">
          © {new Date().getFullYear()} {COMPANY.shortName} · <LegalLinks />
        </p>
      </div>
    </div>
  );
}
