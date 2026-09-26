import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getConsent, onConsentChange, resetConsent } from '../lib/consent';

const UPDATED = '26. rujna 2026.';
const INSTAGRAM_DM = 'https://ig.me/m/creator_akademija';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg sm:text-xl font-bold text-white mt-10 mb-3">{title}</h2>
      <div className="space-y-3 text-white/70 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 marker:text-primary">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

const b = (text: string) => <strong className="text-white/90 font-semibold">{text}</strong>;

export default function Privacy() {
  const navigate = useNavigate();
  const [consent, setConsentState] = useState(getConsent);

  useEffect(() => onConsentChange(() => setConsentState(getConsent())), []);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Pravila privatnosti | Creator Akademija';
    window.scrollTo(0, 0);
    return () => { document.title = prev; };
  }, []);

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

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-6">Pravila privatnosti</h1>
        <p className="text-sm text-white/45 mt-2">Zadnja izmjena: {UPDATED}</p>

        <p className="text-white/70 leading-relaxed mt-6 text-[15px]">
          Ova pravila objašnjavaju koje osobne podatke prikupljamo kada koristiš web stranicu i aplikaciju
          Creator Akademija (creator-akademija.web.app), zašto ih prikupljamo, s kim ih dijelimo i koja su tvoja
          prava. Podatke obrađujemo u skladu s Općom uredbom o zaštiti podataka (GDPR) i Zakonom o provedbi
          Opće uredbe o zaštiti podataka.
        </p>

        <Section id="voditelj" title="1. Tko je voditelj obrade">
          <p>
            {b('GRIZLI GANG d.o.o. za marketing i usluge')}<br />
            Malešnica 27, 10000 Zagreb, Hrvatska<br />
            OIB: 59878531102
          </p>
          <p>
            Za sva pitanja o privatnosti i ostvarivanje svojih prava javi nam se porukom na Instagramu{' '}
            <a href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              @creator_akademija
            </a>{' '}
            ili pisanim putem na gornju adresu.
          </p>
        </Section>

        <Section id="podaci" title="2. Koje podatke prikupljamo">
          <List items={[
            <>{b('Podaci o računu:')} email adresa, korisničko ime, lozinka (pohranjuje se isključivo u šifriranom obliku kod Googlea, mi je ne vidimo), spol, dob te, ako ih upišeš, Instagram i TikTok korisničko ime.</>,
            <>{b('Podaci o profilu:')} profilna slika, opis i ostali podaci koje sam dodaš na profil.</>,
            <>{b('Sadržaj koji objaviš:')} objave, fotografije i videozapisi, komentari, lajkovi, privatne poruke, videozapisi poslani na ocjenu i njihove ocjene, prijave na izazove, prijave na događaje te spremljene ideje i hookovi.</>,
            <>{b('Podaci o korištenju:')} bodovi (XP) i razina, napredak kroz lekcije, obavijesti, datum registracije i zadnje aktivnosti, status i trajanje pristupa.</>,
            <>{b('Lista čekanja:')} ime i prezime, Discord korisničko ime i email ako se prijaviš na listu čekanja.</>,
            <>{b('Tehnički podaci:')} IP adresa, vrsta uređaja i preglednika te sigurnosni zapisi koje automatski obrađuju naši pružatelji usluga (Google, a uz tvoj pristanak i Meta).</>,
          ]} />
          <p>Fotografije i videozapise prije slanja smanjujemo i komprimiramo na tvom uređaju, pa na naše poslužitelje ne šaljemo izvornu datoteku.</p>
        </Section>

        <Section id="svrhe" title="3. Zašto obrađujemo podatke i na kojoj osnovi">
          <List items={[
            <>{b('Izvršenje ugovora (čl. 6. st. 1. t. b GDPR-a):')} otvaranje i vođenje računa, aktivacija pristupa, prikazivanje lekcija, zajednice, poruka, događaja, izazova i ocjena videa.</>,
            <>{b('Legitimni interes (čl. 6. st. 1. t. f):')} sigurnost aplikacije, sprječavanje zlouporabe i lažnih računa, provjera email adrese te odgovaranje na tvoje upite.</>,
            <>{b('Privola (čl. 6. st. 1. t. a):')} Meta Pixel i mjerenje oglasa te lista čekanja. Privolu možeš povući u bilo kojem trenutku.</>,
            <>{b('Zakonska obveza (čl. 6. st. 1. t. c):')} čuvanje računovodstvene dokumentacije o plaćanjima.</>,
          ]} />
          <p>Ne donosimo odluke o tebi isključivo automatiziranom obradom i ne prodajemo tvoje podatke.</p>
        </Section>

        <Section id="kolacici" title="4. Kolačići i lokalna pohrana">
          <p>{b('Nužni')} (ne traže privolu jer bez njih aplikacija ne radi):</p>
          <List items={[
            'podaci o prijavi (Firebase Authentication) koji te drže prijavljenim,',
            'predmemorija aplikacije (PWA) za brže učitavanje i rad bez interneta,',
            'zapis o tvom izboru kolačića.',
          ]} />
          <p>
            {b('Marketinški')} (samo uz tvoj pristanak): {b('Meta Pixel')} tvrtke Meta Platforms Ireland Ltd.
            To je mali alat koji Facebooku i Instagramu javlja da si posjetio/la našu stranicu ili se registrirao/la,
            kako bismo mjerili uspješnost oglasa i prikazivali ih relevantnim ljudima. Postavlja kolačić
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white/10 text-white/80 text-[13px]">_fbp</code>
            koji traje do 90 dana. Ako odbiješ, Pixel se uopće ne učitava.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-sm text-white/50">
              Trenutni izbor: {consent === 'granted' ? 'prihvaćeno' : consent === 'denied' ? 'odbijeno' : 'nije odabrano'}
            </span>
            <button
              onClick={resetConsent}
              className="px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Promijeni postavke kolačića
            </button>
          </div>
        </Section>

        <Section id="primatelji" title="5. Tko još vidi ili obrađuje podatke">
          <List items={[
            <>{b('Ostali članovi')} Creator Akademije vide tvoje korisničko ime, profilnu sliku, opis, društvene mreže, razinu i XP, objave i komentare. Privatne poruke vidite samo ti i osoba s kojom se dopisuješ.</>,
            <>{b('Mentori i administratori')} vide videozapise koje pošalješ na ocjenu. Ocijenjeni video vide i ostali članovi samo ako je označen kao javni, što možeš isključiti pri slanju ili bilo kada kasnije.</>,
            <>{b('Google (Firebase)')}: Google Ireland Ltd. i Google LLC kao izvršitelj obrade za prijavu, bazu podataka (smještena u EU), pohranu datoteka i hosting. Fontove učitavamo s Google Fonts, pri čemu Google vidi tvoju IP adresu.</>,
            <>{b('Meta Platforms Ireland Ltd.')}: samo ako prihvatiš marketinške kolačiće. Za prikupljanje podataka putem Pixela Meta i mi smo zajednički voditelji obrade, a daljnju obradu Meta provodi prema vlastitim pravilima privatnosti.</>,
            <>{b('Nadležna tijela')}: kada nas na to obvezuje zakon.</>,
          ]} />
        </Section>

        <Section id="prijenos" title="6. Prijenos podataka izvan EU">
          <p>
            Google i Meta mogu obrađivati podatke i u SAD-u. Takav prijenos temelji se na Okviru za privatnost
            podataka EU–SAD (EU-U.S. Data Privacy Framework) i standardnim ugovornim klauzulama Europske komisije.
          </p>
        </Section>

        <Section id="rok" title="7. Koliko dugo čuvamo podatke">
          <List items={[
            'Podatke o računu i sadržaj čuvamo dok imaš račun. Nakon zahtjeva za brisanje brišemo ih u roku od 30 dana.',
            'Objave i komentare koje obrišeš uklanjamo odmah, a pripadajuće datoteke iz pohrane najkasnije u roku od 30 dana.',
            'Podatke s liste čekanja čuvamo do otvaranja upisa ili dok ne zatražiš brisanje.',
            'Računovodstvenu dokumentaciju o plaćanjima čuvamo 11 godina, kako propisuje Zakon o računovodstvu.',
            'Meta Pixel kolačić traje najviše 90 dana.',
          ]} />
        </Section>

        <Section id="prava" title="8. Tvoja prava">
          <p>U svakom trenutku možeš zatražiti:</p>
          <List items={[
            'pristup svojim podacima i kopiju podataka,',
            'ispravak netočnih podataka (većinu možeš sam/a urediti na profilu),',
            'brisanje podataka i računa,',
            'ograničenje obrade,',
            'prenosivost podataka u strojno čitljivom obliku,',
            'prigovor na obradu temeljenu na legitimnom interesu,',
            'povlačenje privole, bez utjecaja na zakonitost obrade prije povlačenja.',
          ]} />
          <p>
            Na zahtjev odgovaramo najkasnije u roku od mjesec dana. Ako smatraš da kršimo propise, možeš podnijeti
            prigovor Agenciji za zaštitu osobnih podataka (AZOP), Selska cesta 136, 10000 Zagreb,{' '}
            <a href="https://azop.hr" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">azop.hr</a>.
          </p>
        </Section>

        <Section id="maloljetnici" title="9. Maloljetnici">
          <p>
            Registracija je dopuštena od 13 godina. Ako imaš manje od 16 godina, prije registracije trebaš
            suglasnost roditelja ili skrbnika. Ako saznamo da je račun otvoren suprotno tome, obrisat ćemo ga.
          </p>
        </Section>

        <Section id="sigurnost" title="10. Sigurnost">
          <p>
            Svi podaci putuju šifrirano (HTTPS). Lozinke nikad ne vidimo jer ih Google pohranjuje isključivo u
            šifriranom obliku. Pristup podacima ograničen je sigurnosnim pravilima, pa svaki korisnik može mijenjati samo
            svoje podatke, a pristup je dostupan tek nakon potvrde email adrese i aktivacije računa.
          </p>
        </Section>

        <Section id="izmjene" title="11. Izmjene pravila">
          <p>
            Ova pravila možemo povremeno ažurirati. Datum zadnje izmjene nalazi se na vrhu stranice, a o bitnim
            promjenama obavijestit ćemo te u aplikaciji.
          </p>
        </Section>
      </div>
    </div>
  );
}
