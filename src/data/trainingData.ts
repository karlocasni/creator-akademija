export const trainingDescription = {
  short: "Trening je koncipiran na način da je raspisan popis vježbi redom koje se rade za pojedini dan I pojedinu skupinu koja se odrađuje...",
  full: `Trening je koncipiran na način da je raspisan popis vježbi redom koje se rade za pojedini dan I pojedinu skupinu koja se odrađuje (naravno u slučaju da je neka sprava možda zauzeta, ideš dalje pa se poslije vratiš na vježbu, odnosno na spravu koja je bila zauzeta). Imamo zadani broj serija I broj ponavljanja za svaku vježbu, a kilažu s kojom radiš na pojedinoj vježbi određuješ si upravo prema zadanom broju ponavljanja.
  
Naprimjer : Ako imaš zadanu vježbu bench press sa šipkom I piše 5 serija po 12 ponavljanja. Prva serija na svakoj vježbi je warm up serija (serija zagrijavanja) u kojoj ćeš uzeti manju kilaži odraditi laganu seriju do 15 ponavljanja da se mišićna skupina koju radiš prokrvi I da se zglobovi koji su aktivni I koji rade zagriju. Ostale 4 serije su radne serije I ovdje povećavaš kilažu. Kilažu s kojom radiš te radne serije ćeš odrediti na način da kada radiš seriju, da ti to zadano ponavljanje ( u ovom slučaju 12.) bude mišićni otkaz, odnosno da ne možeš napraviti više od 12 ponavljanja.

Zona ponavljanja koju mi tražimo je raspon 8 - 12 ponavljanja I to je idealna zona za hipertrofiju. Ukoliko naprimjer ti na bech pressu možeš sa 100 kg dići 20 ponavljanja, tada ćeš dić kilažu na 120 kg cca da ti onda otkaz bude negdje oko 10. ili 12. ponavljanja kako je I zadano, međutim točnu kilažu si prilagođavaš sebi I svojoj snazi.

Ukoliko na šipku staviš I kreneš sa više npr 140 kg I možeš napraviti samo 5 ponavljanja, to znači da je preteško I da moraš malo smanjit kilažu da ti opet otkaz bude u rasponu od 8 I 12 ponavljanja.

Takav način prilagodbe radne kilaže koristiš I prilagođavaš za svaku vježbu.

Ono šta je bitno za napomenuti je da se kroz program I trening treba raditi progresivno povećanje opterećenja. To znači da se iz treninga u trening trudiš dići veću kilažu od prošlog puta, ali u zadanom broju ponavljanja. Naprimjer, ako si sa 100 kg na bench pressu napravio 12-13 ponavljanja bez problema prošli puta, ovaj puta na treningu pokušaš dić 102,5 kg isto 12 ponavljanja. Na taj način se radi progresivno povećanje opterećenja (kilaže) I na taj način se radi maksimalna hipertrofija jer mišićno tkivo treba poticaj, stimulaciju I razlog da se prilagođava, mijenja I na kraju krajeva raste što nam je konačan cilj kao odgovor na stimulaciju (trening).

Trening je podijeljen na 5 dana u tjednu I svaki dan se radi jedna mišićna skupina. Ukoliko se desi da jedan dan ne možeš kroz tjedan odradit neki trening, taj dan uvijek možeš onda nadoknaditi u subotu ili nedelju ako ćeš trenirat od ponedeljka do petka.`
};

export const workoutPlanMale = [
  {
    day: 'Ponedjeljak',
    focus: 'Prsa',
    notes: 'Za prsa nam je najbitnije da kod svih potisaka i razvlačenja, uvijek ramena (lopatice) zategnemo prema nazad, isprsimo se i blago napravimo mostić u djelu kralježnice kako bi se maksimalno stimulirala prsa, a maksimalno izbjegla kontrakcija tricepsa i prednjeg ramena.',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE NA BICIKLU 5 min', sets: '1', reps: '5 min', note: '(ili bilo koja druga kardio sprava koja ti paše)' },
      { name: 'RAZVLAČENJE ZA PRSA NA SPRAVI (peck deck fly)', sets: '3', reps: '15', note: 'Prva vježba kao lagani uvod u trening. Radiš 3 serije po 15 ponavljanja.' },
      { videoUrl: 'https://youtube.com/watch?v=XjZeyR3o-Uc', name: 'RAVNI BENCH PRESS SA ŠIPKOM', sets: '5', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=6LzDMvtkSzU', name: 'SUPERSET - RAVNI POTISAK BUČICAMA', sets: '4', reps: '8-12', note: 'Superset - radiš jednu iza druge bez odmora, ponavljaš 4 puta' },
      { videoUrl: 'https://youtube.com/shorts/4Jm2DGZM6j0', name: 'SUPERSET - RAZVLAČENJE BUČICAMA NA RAVNOJ KLUPI', sets: '4', reps: '8-12', note: 'Odmah iza potiska, bez odmora' },
      { videoUrl: 'https://youtube.com/shorts/yTV8Os7iIis', name: 'RAZVLAČENJE ZA PRSA NA KABLOVIMA', sets: '4', reps: '12' },
      { videoUrl: 'https://youtube.com/watch?v=c_79vjVoaaA', name: 'PROPADANJA', sets: '4', reps: 'Maks', note: 'Radiš do otkaza nebitno koliko ponavljanja / maks koliko možeš' },
      { videoUrl: 'https://youtube.com/watch?v=NauvOh2bviQ', name: 'TRBUH - Podizanje nogu na Dip mašini', sets: '5', reps: 'Maks', note: 'Maks koliko možeš' },
    ],
  },
  {
    day: 'Utorak',
    focus: 'Leđa',
    notes: 'Najbitnija stvar tijekom izvođenja vježbi za leđa je upravo držati kralježnicu ravnom i fiksiranom. U bilo kojem trenutku izvođenja vježbe ili dizanja ili spuštanja tereta, ne smije se desiti savijanje kralježnice. Neka ti to bude uvijek u glavi. Kod povlačenja i pokreta veslanja fokusirati se na to da vučemo laktom šipku i bučice, a ruke (šake) nam služe kao kuke. To nam omogućuje da maksimalno stimuliramo leđne mišiće, a minimalno da se stimulira biceps i zadnje rame.',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE NA BICIKLU 5 min', sets: '1', reps: '5 min', note: '(ili bilo koja druga kardio sprava koja ti paše)' },
      { videoUrl: 'https://youtube.com/shorts/crbUgTPMzQ8', name: 'EKSTENZIJA LEĐA NA KLUPI', sets: '3', reps: '15-20', note: 'Lagano zagrijavanje donjeg dijela leđa' },
      { videoUrl: 'https://youtube.com/shorts/p2JrNboQbas', name: 'MRTVO DIZANJE / DEADLIFT', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=7l5BZ3JIGqk', name: 'VESLANJE U PRETKLONU SA ŠIPKOM', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=HLvSaxqNyoE', name: 'LAT POVLAČENJE / LAT PULLDOWN NA PRSA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=JPHVlVeuHwI', name: 'PULLOVER NA SAJLI', sets: '3', reps: '12-15' },
    ],
  },
  {
    day: 'Srijeda',
    focus: 'Noge',
    notes: 'Noge su najveća mišićna skupina i sam trening iziskuje puno veći napor i potrošnju. Bitno je imati na umu da prilikom svakog izvođenja bilo kakve varijacije čučnja, leđa moraju biti ravna. Stopala u poziciji malo šire od širine ramena, cijelo stopalo obavezno na tlu, pete I prsti.',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE NA BICIKLU 5 min', sets: '1', reps: '5 min', note: 'Najbolja opcija je bicikl jer na taj način najviše zagriješ zglobnu strukturu koljena I najbolja je priprema za trening nogu' },
      { videoUrl: 'https://youtube.com/shorts/UOVF88H58pM', name: 'NOŽNA EKSTENZIJA', sets: '3', reps: '12-15' },
      { videoUrl: 'https://youtube.com/shorts/LDy89yjKqPQ', name: 'NOŽNA FLEKSIJA', sets: '3', reps: '12-15' },
      { videoUrl: 'https://youtube.com/shorts/vIArvE2gO8o', name: 'ČUČANJ SA ŠIPKOM', sets: '5', reps: '8-12' },
      { videoUrl: 'https://youtube.com/shorts/Nv1w53xIn4U', name: 'LEG PRESS MAŠINA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=xq54YM5ZZtI', name: 'SUMO ČUČANJ SA GIRIJOM', sets: '3', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=VzNDY1u0YHc', name: 'LISTOVI', sets: '6', reps: '15-20', note: 'Odradiš listove na mašini ako imaš za listove ili podizanje stopala na nekom povišenju na Smith mašini' },
    ],
  },
  {
    day: 'Četvrtak',
    focus: 'Ramena',
    notes: 'Ramena su mala mišična skupina koja se sastoji od 3 dijela : prednje rame, srednje rame I zadnje rame. Kod treninga ramena jako je bitno pogoditi sva 3 dijela ramenog pojasa. Također izrazito je bitno kod ovog treninga ne pretjerivati sa kilažom jer ramena se rade sa relativno manjim kilažama upravo iz razloga šta su manja mišićna skupina I rameni zglob je sam po sebi dosta kompleksan te tu često dolazi do nekih istegnuća I ozljeda. Tu treba biti jako oprezan I zaista paziti na formu izvođenja vježbi. Također prije samog treninga jako dobro treba zagrijati rotatore I rameni zglob na način da rotiramo ruke u oba smjera nekoliko minuta.',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE NA BICIKLU 5 min', sets: '1', reps: '5 min', note: '(ili bilo koja druga kardio sprava koja ti paše)' },
      { videoUrl: 'https://youtube.com/watch?v=DuAw91GKudM', name: 'RAMENI POTISAK BUČICAMA - SJEDEĆI', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/shorts/NbVI6C4Jo18', name: 'LATERALNO ODRUČENJE BUČICAMA', sets: '3', reps: '12-15' },
      { videoUrl: 'https://youtube.com/shorts/NbVI6C4Jo18', name: 'LATERALNO ODRUČENJE NA SAJLI SA DONJEG KOLUTURA', sets: '3', reps: '12-15', note: 'Svaka ruka zasebno' },
      { name: 'PODIZANJE EZ ŠIPKE PREMA BRADI', sets: '3', reps: '8-12' },
      { videoUrl: 'https://youtube.com/shorts/PHO-ZfmvcG8', name: 'ODRUČENJE ZA ZADNJE RAME NA KLUPI', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=NauvOh2bviQ', name: 'TRBUH - Podizanje nogu na Dip mašini', sets: '5', reps: 'Maks' },
    ],
  },
  {
    day: 'Petak',
    focus: 'Ruke',
    notes: 'Trening ruku se sastoji od vježbi zasebno za triceps koji čini dvije trećine mišića ruku i zasebno za biceps. Kod treninga ruku najbitnije načelo koje treba slijediti je da nadlaktica uvijek bude fiksirana i da se pokret vrši samo iz lakta ovisno da li je pregib (za biceps) ili potisak (za triceps).',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE NA BICIKLU 5 min', sets: '1', reps: '5 min', note: '(ili bilo koja druga kardio sprava koja ti paše)' },
      { videoUrl: 'https://youtube.com/watch?v=vG1jmKW4EDU', name: 'BICEPS PREGIB EZ ŠIPKOM / STOJEĆI', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=8vpOAdqxeOg', name: 'BICEPS PREGIB NA SAJLI SA RAVNOM ŠIPKOM', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=J0HlwDFyPwA', name: 'HAMMER PREGIB BUČICAMA', sets: '3', reps: '8-12' },
      { videoUrl: 'https://youtube.com/shorts/kp2grQWP8Rc', name: 'SKULLCRUSHER', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=Ctdkci1wYAU', name: 'TRICEPS POTISAK NA SAJLI RAVNOM ŠIPKOM', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=c_79vjVoaaA', name: 'PROPADANJA U SJEDEĆEM STAVU', sets: '4', reps: 'Maks', note: 'Radiš do otkaza koliko god možeš' },
      { videoUrl: 'https://youtube.com/watch?v=gPww2MhDgpg', name: 'TRBUH - vježba za trbuh po izboru', sets: '5', reps: '15-20', note: '(crunch, podizanje nogu, crunch na kablu, plank, mašina za trbušnjake I sl…)' },
    ],
  },
];

export const workoutPlanFemale = [
  {
    day: 'Ponedjeljak',
    focus: 'Noge + Gluteus',
    notes: 'Noge, zajedno sa gluteusom su najveća mišićna skupina i sam trening iziskuje puno veći napor i potrošnju. Bitno je imati na umu da prilikom svakog izvođenja bilo kakve varijacije čučnja, leđa moraju biti ravna. Stopala u poziciji malo šire od širine ramena, cijelo stopalo obavezno na tlu, pete I prsti.',
    exercises: [
      { videoUrl: 'https://youtube.com/watch?v=zatZsX9JOy4', name: 'LAGANO ZAGRIJAVANJE NA BICIKLU 5 MINUTA', sets: '1', reps: '5 min', note: '(bicikl iz razloga da se maksimalno zagriju koljena I zglobne strukture kao priprema az trening nogu)' },
      { videoUrl: 'https://youtube.com/shorts/vIArvE2gO8o', name: 'ČUČANJ SA ŠIPKOM', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/shorts/UOVF88H58pM', name: 'NOŽNA EKSTENZIJA', sets: '4', reps: '12' },
      { videoUrl: 'https://youtube.com/watch?v=xq54YM5ZZtI', name: 'SUMO ČUČANJ SA GIRIJOM', sets: '3', reps: '8-12', note: '(široki stav sa stopalima)' },
      { videoUrl: 'https://youtube.com/watch?v=LDy89yjKqPQ', name: 'LEG CURL - NOŽNA FLEKSIJA', sets: '4', reps: '12' },
      { videoUrl: 'https://youtube.com/shorts/0mU637Z1POw', name: 'POTISAK KUKOVIMA - HIP TRUST', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=fPx7vBoKfOU', name: 'KICKBACK NOGAMA NA SAJLI', sets: '4', reps: '12-15', note: 'Radiš svaku nogu pojedinčno' },
    ],
  },
  {
    day: 'Utorak',
    focus: 'Push (Prsa, Ramena, Triceps)',
    notes: 'Za početak, ne morate se bojati raditi vježbe za prsa. Potisci za prsa vas neće učiniti „muškima“, već su odličan način da ojačate i oblikujete gornji dio tijela. Osim prsnih mišića, ove vježbe aktiviraju i rameni pojas I triceps, što doprinosi ljepšem držanju i zategnutijem izgledu. Kod treninga ramena fokus treba biti na pravilnom izvođenju vježbi i kontroli pokreta. Rameni zglob je kompleksan i osjetljiv, pa je upravo dobra forma ključna kako biste izbjegle ozljede i izvukle maksimum iz treninga. Prije svakog push treninga treba dobro zagrijati ramena kroz lagane kružne pokrete rukama u oba smjera nekoliko minuta.',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE 5 NA KARDIO SPRAVI PO IZBORU', sets: '1', reps: '5 min', note: '(bicikl, orbitrek, traka za trčanje, ergometar I sl.)' },
      { videoUrl: 'https://youtube.com/watch?v=vy07AluOy0M', name: 'POTISAK S BUČICAMA - DUMBELL BENCH PRESS', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=DuAw91GKudM', name: 'RAMENI POTISAK S BUČICAMA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/shorts/NbVI6C4Jo18', name: 'LATERALNO ODRUČENJE BUČICAMA', sets: '4', reps: '12' },
      { videoUrl: 'https://youtube.com/shorts/PHO-ZfmvcG8', name: 'ODRUČENJE ZA ZADNJE RAME NA KOSOJ KLUPI', sets: '3', reps: '12' },
      { videoUrl: 'https://youtube.com/watch?v=Ctdkci1wYAU', name: 'TRICEPS POTISAK NA SAJLI RAVOM ŠIPKOM', sets: '3', reps: '12' },
      { videoUrl: 'https://youtube.com/watch?v=iA5WMTKzsXA', name: 'TRICEPS EKSTENZIJA S BUČICOM', sets: '3', reps: '8-12' },
    ],
  },
  {
    day: 'Srijeda',
    focus: 'Gluteus + Trbuh + Kardio',
    notes: '',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE 5 NA KARDIO SPRAVI PO IZBORU', sets: '1', reps: '5 min', note: '(bicikl, orbitrek, traka za trčanje, ergometar I sl.)' },
      { videoUrl: 'https://youtube.com/watch?v=xq54YM5ZZtI', name: 'SUMO ČUČANJ SA GIRIJOM', sets: '4', reps: '8-10' },
      { videoUrl: 'https://youtube.com/shorts/0mU637Z1POw', name: 'HIP TRUST - POTISAK KUKOVIMA', sets: '4', reps: '8-10' },
      { videoUrl: 'https://youtube.com/watch?v=NauvOh2bviQ', name: 'PODIZANJE NOGU NA DIP MAŠINI', sets: '4', reps: 'Maks' },
      { videoUrl: 'https://youtube.com/watch?v=nFDoFuFX_WI', name: 'TRBUŠNJACI / CRUNCH', sets: '4', reps: 'Maks', note: '(klasični trbušnjaci na podu)' },
      { name: 'KARDIO', sets: '1', reps: '30 min', note: 'Odrađuješ kardio na spravi po izboru (koja ti najviše odgovara) u trajanu od 30 minuta' },
    ],
  },
  {
    day: 'Četvrtak',
    focus: 'Pull (Leđa, Biceps)',
    notes: 'Najbitnija stvar tijekom izvođenja vježbi za leđa je upravo držati kralježnicu ravnom i fiksiranom. U bilo kojem trenutku izvođenja vježbe ili dizanja ili spuštanja tereta, ne smije se desiti savijanje kralježnice. Neka ti to bude uvijek u glavi. Kod povlačenja i pokreta veslanja fokusirati se na to da vučemo laktom šipku i bučice, a ruke (šake) nam služe kao kuke. To nam omogućuje da maksimalno stimuliramo leđne mišiće, a minimalno da se stimulira biceps i zadnje rame.',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE 5 NA KARDIO SPRAVI PO IZBORU', sets: '1', reps: '5 min', note: '(bicikl, orbitrek, traka za trčanje, ergometar I sl.)' },
      { videoUrl: 'https://youtube.com/shorts/p2JrNboQbas', name: 'MRTVO DIZANJE - DEADLIFT', sets: '4', reps: '8-10' },
      { videoUrl: 'https://youtube.com/watch?v=HLvSaxqNyoE', name: 'LAT POVLAČENJE - LAT PULLDOWN', sets: '4', reps: '12' },
      { videoUrl: 'https://youtube.com/watch?v=sUuAtAQ0sUc', name: 'VESLANJE NA SAJLI USKI HVAT', sets: '3', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=IkXtY3dqkRQ', name: 'BICEPS PREGIB BUČICAMA', sets: '3', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=J0HlwDFyPwA', name: 'HAMMER PREGIB BUČICAMA', sets: '3', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=gPww2MhDgpg', name: 'VJEŽBA ZA TRBUH PO IZBORU', sets: '4', reps: 'Maks', note: 'Maks ponavljanja koliko ide po seriji' },
    ],
  },
  {
    day: 'Petak',
    focus: 'Noge + Gluteus',
    notes: '',
    exercises: [
      { name: 'LAGANO ZAGRIJAVANJE NA BICIKLU 5 MINUTA', sets: '1', reps: '5 min', note: '(bicikl iz razloga da se maksimalno zagriju koljena I zglobne strukture kao priprema az trening nogu)' },
      { videoUrl: 'https://youtube.com/watch?v=cNZrSwqu5mM', name: 'ISKORAK', sets: '3', reps: '8-12', note: 'Svaka noga zasebno po 3 serije' },
      { videoUrl: 'https://youtube.com/shorts/UOVF88H58pM', name: 'NOŽNA EKSTENZIJA', sets: '4', reps: '12' },
      { videoUrl: 'https://youtube.com/shorts/vIArvE2gO8o', name: 'ČUČANJ SA ŠIPKOM', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=LDy89yjKqPQ', name: 'LEG CURL - NOŽNA FLEKSIJA', sets: '4', reps: '12' },
      { videoUrl: 'https://youtube.com/shorts/0mU637Z1POw', name: 'POTISAK KUKOVIMA - HIP TRUST', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=uecMkok3c0k', name: 'BUGARSKI ČUČANJ', sets: '4', reps: '8-12', note: 'Radiš svaku nogu pojedinčno' },
    ],
  },
];
