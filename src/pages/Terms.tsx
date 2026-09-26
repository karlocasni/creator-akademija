import { Link } from 'react-router-dom';
import LegalPage, { Section, List, b, CompanyBlock, COMPANY, linkCls } from '../components/legal/LegalPage';

export default function Terms() {
  return (
    <LegalPage
      title="Uvjeti korištenja"
      updated="26. rujna 2026."
      intro={
        <p>
          Ovi uvjeti uređuju korištenje web stranice i aplikacije Creator Akademija (creator-akademija.web.app).
          Registracijom ili korištenjem platforme prihvaćaš ove uvjete. Ako se s njima ne slažeš, nemoj koristiti
          platformu.
        </p>
      }
    >
      <Section id="pruzatelj" title="1. Pružatelj usluge">
        <p>Platformu Creator Akademija vodi:</p>
        <CompanyBlock />
      </Section>

      <Section id="usluga" title="2. Što je Creator Akademija">
        <p>
          Creator Akademija je online edukacija za kreatore sadržaja. Ovisno o paketu koji dogovoriš, uključuje:
        </p>
        <List items={[
          'video lekcije koje se otključavaju postupno,',
          'zajednicu članova (objave, komentari i privatne poruke),',
          'slanje videa mentorima na ocjenu i povratnu informaciju,',
          'događaje uživo (npr. putem Google Meeta), izazove i ljestvicu bodova (XP),',
          'alate za ideje, hookove i trendove.',
        ]} />
        <p>
          Sadržaj i funkcije platforme možemo s vremenom mijenjati, dopunjavati i unapređivati, pri čemu nećemo bitno
          umanjiti ono što je uključeno u već plaćeno razdoblje pristupa.
        </p>
      </Section>

      <Section id="racun" title="3. Registracija i korisnički račun">
        <List items={[
          'Za registraciju moraš imati najmanje 13 godina. Ako imaš manje od 16 godina, potrebna ti je suglasnost roditelja ili skrbnika.',
          'Podaci koje upišeš moraju biti točni, a email adresu moraš potvrditi putem poslanog linka.',
          <>Račun je {b('osoban')}: jedan račun smije koristiti samo jedna osoba. Dijeljenje pristupnih podataka nije dopušteno.</>,
          'Odgovoran/na si za čuvanje svoje lozinke i za sve radnje izvršene s tvog računa. Ako posumnjaš na neovlašteni pristup, odmah promijeni lozinku i javi nam se.',
        ]} />
      </Section>

      <Section id="pristup" title="4. Pristup i plaćanje">
        <List items={[
          <>Nakon registracije račun čeka {b('aktivaciju')}. Pristup sadržaju omogućujemo nakon što se dogovorimo oko paketa i zaprimimo uplatu.</>,
          'Cijenu, trajanje pristupa i način plaćanja dogovaramo prije uplate (trenutno putem Instagrama). Na cijenu i uvjete dogovorene prije uplate ne utječu kasnije promjene cjenika.',
          'Pristup traje onoliko koliko je dogovoreno i prikazano na tvom računu. Istekom razdoblja pristup se automatski zaključava dok se ne produlji.',
          'Za svaku uplatu izdajemo račun u skladu s propisima.',
        ]} />
      </Section>

      <Section id="odustanak" title="5. Pravo na jednostrani raskid (odustanak)">
        <p>
          Ako si potrošač, prema Zakonu o zaštiti potrošača imaš pravo odustati od ugovora sklopljenog na daljinu u roku
          od 14 dana od sklapanja, bez navođenja razloga.
        </p>
        <p>
          Creator Akademija je digitalni sadržaj koji ti postaje dostupan odmah po aktivaciji. Ako zatražiš da ti pristup
          aktiviramo prije isteka roka od 14 dana i potvrdiš da time gubiš pravo na odustanak, to pravo prestaje trenutkom
          aktivacije. Ako račun još nije aktiviran, od ugovora možeš odustati slanjem izjave na{' '}
          <a href={`mailto:${COMPANY.email}`} className={linkCls}>{COMPANY.email}</a>, a uplaćeni iznos vratit ćemo
          najkasnije u roku od 14 dana.
        </p>
      </Section>

      <Section id="vlasnistvo" title="6. Autorska prava na sadržaj akademije">
        <p>
          Sve lekcije, videozapisi, tekstovi, materijali, dizajn i logotipi Creator Akademije zaštićeni su autorskim
          pravom i pripadaju {COMPANY.shortName} ili njegovim suradnicima. Aktivacijom dobivaš osobno, neisključivo i
          neprenosivo pravo gledati sadržaj unutar platforme za vlastito učenje, i to dok traje tvoj pristup.
        </p>
        <p>Bez našeg pisanog dopuštenja nije dopušteno:</p>
        <List items={[
          'snimati zaslon, preuzimati, kopirati ili objavljivati lekcije i materijale,',
          'dijeliti, prodavati ili iznajmljivati sadržaj ili pristup računu,',
          'koristiti sadržaj za izradu konkurentskog tečaja ili proizvoda.',
        ]} />
      </Section>

      <Section id="korisnicki-sadrzaj" title="7. Sadržaj koji objavljuješ">
        <List items={[
          'Objave, komentare, fotografije i videozapise koje objaviš i dalje su tvoji.',
          'Objavom nam daješ neisključivo, besplatno pravo da taj sadržaj prikažemo unutar platforme drugim članovima, u opsegu potrebnom za rad zajednice. To pravo prestaje kada sadržaj obrišeš, osim za kopije koje su drugi članovi već vidjeli.',
          'Videozapise poslane na ocjenu vide mentori, a nakon ocjene i ostali članovi ako je video označen kao javni.',
          'Smiješ objavljivati samo sadržaj na koji imaš prava i za koji imaš pristanak osoba koje se u njemu pojavljuju.',
        ]} />
      </Section>

      <Section id="ponasanje" title="8. Pravila ponašanja">
        <p>Zajednica funkcionira samo uz međusobno poštovanje. Zabranjeno je:</p>
        <List items={[
          'vrijeđanje, uznemiravanje, prijetnje, govor mržnje i diskriminacija,',
          'spam, neželjeno oglašavanje i prodaja bez dopuštenja,',
          'nezakonit, nasilan ili seksualno eksplicitan sadržaj,',
          'lažno predstavljanje i objavljivanje tuđih osobnih podataka ili privatnih poruka,',
          'zaobilaženje sigurnosnih zaštita, automatsko prikupljanje podataka i umjetno napuhavanje bodova (XP).',
        ]} />
      </Section>

      <Section id="prekid" title="9. Uklanjanje sadržaja i zatvaranje računa">
        <List items={[
          'Sadržaj koji krši ove uvjete ili zakon možemo ukloniti bez prethodne najave.',
          'Kod težeg ili ponovljenog kršenja (osobito dijeljenja računa ili sadržaja akademije) možemo privremeno ili trajno onemogućiti pristup. U tom slučaju uplaćeni iznos ne vraćamo, osim ako zakon propisuje drukčije.',
          <>Račun možeš zatvoriti u bilo kojem trenutku, a brisanje podataka zatražiti prema{' '}
            <Link to="/privatnost" className={linkCls}>Pravilima privatnosti</Link>.</>,
        ]} />
      </Section>

      <Section id="rezultati" title="10. Rezultati">
        <p>
          Creator Akademija je edukacija. Dijelimo znanje, iskustvo i povratne informacije, ali ne možemo jamčiti
          određeni broj pratitelja, pregleda, suradnji ni zarade jer oni ovise o tvom radu i o platformama na kojima
          objavljuješ.
        </p>
      </Section>

      <Section id="dostupnost" title="11. Dostupnost platforme">
        <p>
          Trudimo se da platforma radi bez prekida, no moguća su kraća razdoblja nedostupnosti zbog održavanja,
          nadogradnji ili kvarova kod naših pružatelja usluga. O planiranim duljim prekidima obavijestit ćemo te
          unaprijed.
        </p>
      </Section>

      <Section id="odgovornost" title="12. Odgovornost">
        <p>
          U mjeri dopuštenoj zakonom ne odgovaramo za neizravnu štetu, izgubljenu dobit ni za sadržaj koji objavljuju
          drugi članovi. Ništa u ovim uvjetima ne ograničava našu odgovornost za štetu nastalu namjerno ili iz krajnje
          nepažnje, niti tvoja prava kao potrošača koja se ne mogu ugovorom isključiti.
        </p>
      </Section>

      <Section id="privatnost" title="13. Privatnost">
        <p>
          Kako obrađujemo tvoje osobne podatke i koja su tvoja prava opisano je u{' '}
          <Link to="/privatnost" className={linkCls}>Pravilima privatnosti</Link>.
        </p>
      </Section>

      <Section id="izmjene" title="14. Izmjene uvjeta">
        <p>
          Uvjete možemo povremeno izmijeniti. O bitnim izmjenama obavijestit ćemo te u aplikaciji ili emailom
          najmanje 14 dana prije nego što stupe na snagu. Ako nastaviš koristiti platformu nakon toga, smatra se da
          prihvaćaš nove uvjete.
        </p>
      </Section>

      <Section id="sporovi" title="15. Prigovori i mjerodavno pravo">
        <List items={[
          <>Prigovor možeš poslati na <a href={`mailto:${COMPANY.email}`} className={linkCls}>{COMPANY.email}</a> ili na našu adresu. Na pisani prigovor odgovaramo najkasnije u roku od 15 dana.</>,
          'Na ove uvjete primjenjuje se pravo Republike Hrvatske. Sporove ćemo nastojati riješiti dogovorom, a ako to ne uspije, nadležan je stvarno nadležni sud u Zagrebu. Ako si potrošač, zadržavaš pravo pokrenuti postupak i pred sudom prema svom prebivalištu.',
          'Potrošači se mogu obratiti i tijelima za alternativno rješavanje potrošačkih sporova u Republici Hrvatskoj.',
        ]} />
      </Section>
    </LegalPage>
  );
}
