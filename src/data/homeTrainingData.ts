export const homeTrainingDescription = {
  short: "Kućni trening sa dvije bučice, dizajniran da možeš odraditi kod kuće bez teretane. Sve što trebaš su dvije bučice i vlastita težina tijela...",
  full: `Kućni trening sa dvije bučice dizajniran je tako da možeš odraditi kompletan trening kod kuće bez ikakvog posebnog opreme osim para bučica. Svaka vježba je odabrana tako da maksimalno aktivira ciljanu mišićnu skupinu koristeći slobodne utege i tjelesnu težinu.

Kilažu bučica biraš prema zadanom broju ponavljanja - na kraju zadnjeg ponavljanja trebao bi biti na mišićnom otkazu ili veoma blizu. Ako ti je lako, uzmi teže bučice. Ako ne možeš odraditi minimalni broj ponavljanja, uzmi lakše.

Trening je podijeljen na 5 dana u tjednu: ponedjeljak-petak. Subota i nedjelja su dani odmora. Ako jedan dan propustiš, možeš nadoknaditi u subotu.`
};

export const homeWorkoutPlanMale = [
  {
    day: 'Ponedjeljak',
    focus: 'Push (Prsa, Ramena, Triceps)',
    notes: 'Push dan - guramo od sebe. Fokus na prsima, ramenima i tricepsu. Kod sklekova drži tijelo ravno poput daske, ne savi kukove.',
    exercises: [
      { name: 'JUMPING JACKS - zagrijavanje', sets: '3', reps: '30 sek', note: '30 sekundi radiš, 30 sekundi odmaraš - 3 kruga' },
      { videoUrl: 'https://youtube.com/watch?v=qZKqsPlmGcc', name: 'SKLEKOVI', sets: '4', reps: 'Maks', note: 'Do otkaza - maks koliko možeš po seriji' },
      { videoUrl: 'https://youtube.com/watch?v=6LzDMvtkSzU', name: 'POTISAK BUČICAMA SA PODA', sets: '4', reps: '12-15', note: 'Ležiš na podu i radiš potisak bučicama ako nemaš klupu' },
      { videoUrl: 'https://youtube.com/watch?v=IWa7-YjsYls', name: 'SUPERSET - PREDRUČENJE BUČICAMA', sets: '5', reps: '8-12', note: 'Superset - radiš odmah iza lateralnog odručenja bez odmora' },
      { videoUrl: 'https://youtube.com/watch?v=NbVI6C4Jo18', name: 'SUPERSET - LATERALNO ODRUČENJE BUČICAMA', sets: '5', reps: '8-12', note: 'Odmah iza predručenja, bez odmora između' },
      { videoUrl: 'https://youtube.com/watch?v=DuAw91GKudM', name: 'RAMENI POTISAK BUČICAMA', sets: '4', reps: '8-12', note: 'Stojeći ili sjedeći na stolici' },
      { videoUrl: 'https://youtube.com/watch?v=iA5WMTKzsXA', name: 'TRICEPS EKSTENZIJA BUČICOM', sets: '4', reps: '12', note: 'Jedna ruka drži drugu, spuštaš bučicu iza glave' },
      { videoUrl: 'https://youtube.com/watch?v=c_79vjVoaaA', name: 'PROPADANJA U SJEDEĆEM STAVU', sets: '3', reps: 'Maks', note: 'Koristiš stolicu ili kauč - do otkaza' },
      { videoUrl: 'https://youtube.com/watch?v=gPww2MhDgpg', name: 'VARIJACIJE ZA TRBUH', sets: '4', reps: '10-15' },
    ],
  },
  {
    day: 'Utorak',
    focus: 'Pull (Leđa, Biceps)',
    notes: 'Pull dan - vučemo prema sebi. Fokus na leđima i bicepsu. Kod svih veslanja drži leđa ravna, ne savijaj kralježnicu.',
    exercises: [
      { videoUrl: 'https://youtube.com/shorts/D5_749C5rP4', name: 'MRTVO DIZANJE SA BUČICAMA', sets: '5', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=XTb-9e3L9A4', name: 'VESLANJE U PRETKLONU SA BUČICAMA', sets: '5', reps: '8-12', note: 'Leđa ravna, vuci laktom prema gore' },
      { videoUrl: 'https://youtube.com/shorts/ZHMP342frDU', name: 'SLIJEGANJE RAMENIMA - SHRUG', sets: '4', reps: '8-12', note: 'Fokus na gornji dio leđa i trapezijus' },
      { videoUrl: 'https://youtube.com/watch?v=IkXtY3dqkRQ', name: 'BICEPS PREGIB S BUČICAMA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=J0HlwDFyPwA', name: 'HAMMER PREGIB BUČICAMA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=gPww2MhDgpg', name: 'VARIJACIJE ZA TRBUH', sets: '4', reps: '15-20' },
    ],
  },
  {
    day: 'Srijeda',
    focus: 'Noge',
    notes: 'Noge su najveća mišićna skupina. Kod čučnja drži leđa ravna, koljena prati smjer prstiju, pete na tlu.',
    exercises: [
      { name: 'JUMPING JACKS - zagrijavanje', sets: '3', reps: '30 sek', note: '30 sekundi radiš, 30 sekundi odmaraš - 3 kruga' },
      { videoUrl: 'https://youtube.com/watch?v=p3Fm34riFIw', name: 'ČUČANJ SA BUČICAMA', sets: '5', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=cNZrSwqu5mM', name: 'ISKORAK', sets: '4', reps: '8-12', note: 'Svaka noga zasebno po 4 serije' },
      { videoUrl: 'https://youtube.com/watch?v=uecMkok3c0k', name: 'BUGARSKI ČUČANJ', sets: '3', reps: '8-12', note: 'Svaka noga zasebno, stražnja noga na stolici/kauču' },
      { videoUrl: 'https://youtube.com/watch?v=xq54YM5ZZtI', name: 'SUMO ČUČANJ SA BUČICOM', sets: '4', reps: '8-12', note: 'Široki stav, držiš jednu bučicu objema rukama' },
      { videoUrl: 'https://youtube.com/watch?v=bflzwYO_VFQ', name: 'RUMUNJSKO MRTVO DIZANJE BUČICAMA', sets: '4', reps: '8-12', note: 'Noge gotovo ravne, fokus na zadnju ložu' },
    ],
  },
  {
    day: 'Četvrtak',
    focus: 'Push (Prsa, Ramena, Triceps)',
    notes: 'Ponavljamo push dan. Pokušaj dići malo veću kilažu ili napraviti više ponavljanja nego u ponedjeljak - progresivno opterećenje!',
    exercises: [
      { name: 'JUMPING JACKS - zagrijavanje', sets: '3', reps: '30 sek', note: '30 sekundi radiš, 30 sekundi odmaraš - 3 kruga' },
      { videoUrl: 'https://youtube.com/watch?v=qZKqsPlmGcc', name: 'SKLEKOVI', sets: '4', reps: 'Maks', note: 'Do otkaza - maks koliko možeš po seriji' },
      { videoUrl: 'https://youtube.com/watch?v=6LzDMvtkSzU', name: 'POTISAK BUČICAMA SA PODA', sets: '4', reps: '12-15' },
      { videoUrl: 'https://youtube.com/watch?v=IWa7-YjsYls', name: 'SUPERSET - PREDRUČENJE BUČICAMA', sets: '5', reps: '8-12', note: 'Superset s lateralnim odručenjem' },
      { videoUrl: 'https://youtube.com/watch?v=NbVI6C4Jo18', name: 'SUPERSET - LATERALNO ODRUČENJE BUČICAMA', sets: '5', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=DuAw91GKudM', name: 'RAMENI POTISAK BUČICAMA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=iA5WMTKzsXA', name: 'TRICEPS EKSTENZIJA BUČICOM', sets: '4', reps: '12' },
      { videoUrl: 'https://youtube.com/watch?v=c_79vjVoaaA', name: 'PROPADANJA U SJEDEĆEM STAVU', sets: '3', reps: 'Maks' },
      { videoUrl: 'https://youtube.com/watch?v=gPww2MhDgpg', name: 'VARIJACIJE ZA TRBUH', sets: '4', reps: '10-15' },
    ],
  },
  {
    day: 'Petak',
    focus: 'Pull (Leđa, Biceps)',
    notes: 'Ponavljamo pull dan. Zadnji trening tjedna - daj sve od sebe!',
    exercises: [
      { videoUrl: 'https://youtube.com/shorts/D5_749C5rP4', name: 'MRTVO DIZANJE SA BUČICAMA', sets: '5', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=XTb-9e3L9A4', name: 'VESLANJE U PRETKLONU SA BUČICAMA', sets: '5', reps: '8-12' },
      { videoUrl: 'https://youtube.com/shorts/ZHMP342frDU', name: 'SLIJEGANJE RAMENIMA - SHRUG', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=IkXtY3dqkRQ', name: 'BICEPS PREGIB S BUČICAMA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=J0HlwDFyPwA', name: 'HAMMER PREGIB BUČICAMA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=gPww2MhDgpg', name: 'VARIJACIJE ZA TRBUH', sets: '4', reps: '15-20' },
    ],
  },
];

export const homeWorkoutPlanFemale = [
  {
    day: 'Ponedjeljak',
    focus: 'Noge + Gluteus',
    notes: 'Noge i gluteus - najveća mišićna skupina. Fokus na pravilnoj formi čučnja i aktivaciji gluteusa.',
    exercises: [
      { name: 'JUMPING JACKS - zagrijavanje', sets: '4', reps: '30 sek', note: '30 sekundi radiš, 30 sekundi odmaraš - 4 kruga' },
      { videoUrl: 'https://youtube.com/watch?v=cNZrSwqu5mM', name: 'ISKORAK', sets: '3', reps: '8-12', note: 'Svaka noga zasebno' },
      { videoUrl: 'https://youtube.com/watch?v=p3Fm34riFIw', name: 'SUPERSET - ČUČANJ S BUČICAMA', sets: '4', reps: '8-12', note: 'Superset s izdržajem uz zid' },
      { videoUrl: 'https://youtube.com/watch?v=8jsx3IStvvc', name: 'SUPERSET - IZDRŽAJ UZ ZID', sets: '4', reps: 'Maks', note: 'Odmah iza čučnja, maks koliko možeš uz zid' },
      { videoUrl: 'https://youtube.com/watch?v=uecMkok3c0k', name: 'BUGARSKI ČUČANJ', sets: '3', reps: '8-12', note: 'Svaka noga zasebno' },
      { videoUrl: 'https://youtube.com/watch?v=xq54YM5ZZtI', name: 'SUMO ČUČANJ', sets: '4', reps: '8-12', note: 'Široki stav, držiš jednu bučicu' },
      { videoUrl: 'https://youtube.com/watch?v=fPx7vBoKfOU', name: 'GLUTE KICKBACK', sets: '4', reps: '12-15', note: 'Svaka noga zasebno - možeš koristiti bučicu ili elastic traku' },
      { videoUrl: 'https://youtube.com/watch?v=gPww2MhDgpg', name: 'VARIJACIJE ZA TRBUH', sets: '4', reps: '8-15' },
    ],
  },
  {
    day: 'Utorak',
    focus: 'Gornji dio',
    notes: 'Gornji dio tijela - prsa, leđa, ramena, ruke. Ne bojte se raditi ove vježbe - neće vas učiniti "muškima", već će oblikovati i ojačati gornji dio tijela.',
    exercises: [
      { name: 'JUMPING JACKS - zagrijavanje', sets: '4', reps: '30 sek', note: '30 sekundi radiš, 30 sekundi odmaraš - 4 kruga' },
      { videoUrl: 'https://youtube.com/watch?v=6LzDMvtkSzU', name: 'RAVNI POTISAK S BUČICAMA', sets: '4', reps: '8-12', note: 'Ležiš na podu ako nemaš klupu' },
      { videoUrl: 'https://youtube.com/watch?v=XTb-9e3L9A4', name: 'VESLANJE U PRETKLONU SA BUČICAMA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=DuAw91GKudM', name: 'RAMENI POTISAK S BUČICAMA', sets: '3', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=NbVI6C4Jo18', name: 'LATERALNO ODRUČENJE S BUČICAMA', sets: '3', reps: '12-15' },
      { videoUrl: 'https://youtube.com/watch?v=IkXtY3dqkRQ', name: 'BICEPS PREGIB S BUČICAMA', sets: '4', reps: '12-15' },
      { videoUrl: 'https://youtube.com/watch?v=iA5WMTKzsXA', name: 'TRICEPS EKSTENZIJA S BUČICOM', sets: '4', reps: '8-12' },
    ],
  },
  {
    day: 'Srijeda',
    focus: 'Kardio',
    notes: 'Dan kardio aktivnosti. Bira aktivnost koja ti paše.',
    exercises: [
      { name: 'KARDIO AKTIVNOST', sets: '1', reps: '60 min', note: 'Bicikl, šetnja, brzi hod, trčanje, plivanje ili bilo koja druga kardio aktivnost u trajanju od sat vremena' },
    ],
  },
  {
    day: 'Četvrtak',
    focus: 'Noge + Gluteus',
    notes: 'Ponavljamo noge i gluteus. Progresivno povećavaj opterećenje u odnosu na ponedjeljak!',
    exercises: [
      { name: 'JUMPING JACKS - zagrijavanje', sets: '4', reps: '30 sek', note: '30 sekundi radiš, 30 sekundi odmaraš - 4 kruga' },
      { videoUrl: 'https://youtube.com/watch?v=cNZrSwqu5mM', name: 'ISKORAK', sets: '3', reps: '8-12', note: 'Svaka noga zasebno' },
      { videoUrl: 'https://youtube.com/watch?v=p3Fm34riFIw', name: 'SUPERSET - ČUČANJ S BUČICAMA', sets: '4', reps: '8-12', note: 'Superset s izdržajem uz zid' },
      { videoUrl: 'https://youtube.com/watch?v=8jsx3IStvvc', name: 'SUPERSET - IZDRŽAJ UZ ZID', sets: '4', reps: 'Maks', note: 'Odmah iza čučnja, maks koliko možeš uz zid' },
      { videoUrl: 'https://youtube.com/watch?v=uecMkok3c0k', name: 'BUGARSKI ČUČANJ', sets: '3', reps: '8-12', note: 'Svaka noga zasebno' },
      { videoUrl: 'https://youtube.com/watch?v=xq54YM5ZZtI', name: 'SUMO ČUČANJ', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=fPx7vBoKfOU', name: 'GLUTE KICKBACK', sets: '4', reps: '12-15', note: 'Svaka noga zasebno' },
      { videoUrl: 'https://youtube.com/watch?v=gPww2MhDgpg', name: 'VARIJACIJE ZA TRBUH', sets: '4', reps: '8-15' },
    ],
  },
  {
    day: 'Petak',
    focus: 'Gornji dio',
    notes: 'Ponavljamo gornji dio. Zadnji trening tjedna - daj sve!',
    exercises: [
      { name: 'JUMPING JACKS - zagrijavanje', sets: '4', reps: '30 sek', note: '30 sekundi radiš, 30 sekundi odmaraš - 4 kruga' },
      { videoUrl: 'https://youtube.com/watch?v=6LzDMvtkSzU', name: 'RAVNI POTISAK S BUČICAMA', sets: '4', reps: '8-12', note: 'Ležiš na podu ako nemaš klupu' },
      { videoUrl: 'https://youtube.com/watch?v=XTb-9e3L9A4', name: 'VESLANJE U PRETKLONU SA BUČICAMA', sets: '4', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=DuAw91GKudM', name: 'RAMENI POTISAK S BUČICAMA', sets: '3', reps: '8-12' },
      { videoUrl: 'https://youtube.com/watch?v=NbVI6C4Jo18', name: 'LATERALNO ODRUČENJE S BUČICAMA', sets: '3', reps: '12-15' },
      { videoUrl: 'https://youtube.com/watch?v=IkXtY3dqkRQ', name: 'BICEPS PREGIB S BUČICAMA', sets: '4', reps: '12-15' },
      { videoUrl: 'https://youtube.com/watch?v=iA5WMTKzsXA', name: 'TRICEPS EKSTENZIJA S BUČICOM', sets: '4', reps: '8-12' },
    ],
  },
];
