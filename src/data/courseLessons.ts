// Single source of truth for the Creator Akademija curriculum.
// Used by the landing page curriculum and by the course seed data.
// Descriptions are summarised from the lesson videos themselves.

export interface CourseLesson {
  id: string;
  /** Section title from the original curriculum */
  title: string;
  /** Lesson headline shown under the title */
  subtitle: string;
  description: string;
  /** m:ss — empty while the video is not published yet */
  duration: string;
  category: string;
  daysToUnlock: number;
  /** Video not recorded/uploaded yet */
  comingSoon?: boolean;
}

export const COURSE_LESSONS: CourseLesson[] = [
  {
    id: 'course-1',
    title: 'Dobrodošli u Creator Akademiju',
    subtitle: 'PRVO I PRVO!',
    description: 'Kako je sve počelo na štandu sa sladoledom u Rovinju, prvi video s 260 tisuća pregleda i put do najpraćenijeg hrvatskog TikTokera s domaćom publikom. Upoznaj Ismaela i što te čeka u akademiji.',
    duration: '1:11',
    category: 'Uvod',
    daysToUnlock: 0,
  },
  {
    id: 'course-2',
    title: 'Tko su influenceri uopće?',
    subtitle: 'Koja je realnost?',
    description: 'Što znači biti influencer danas – kreator vrijednosti, vođa zajednice, poduzetnik i brand. Zašto većina odustane u prvih osam mjeseci, kako ne pregorjeti uz content kalendar i radne blokove te pet najčešćih mitova o influencerima.',
    duration: '7:18',
    category: 'Teorija',
    daysToUnlock: 0,
  },
  {
    id: 'course-3',
    title: 'Odabir niše',
    subtitle: 'Odaberi svoj smjer',
    description: 'Kako odabrati nišu prema onome što ti dobro ide, smisliti ime koje se pamti i postaviti profesionalni Instagram i TikTok profil – profilna slika, bio u 3–4 linije i isti username na svim mrežama.',
    duration: '3:32',
    category: 'Strategija',
    daysToUnlock: 1,
  },
  {
    id: 'course-4',
    title: 'Kreiranje videa',
    subtitle: 'Kako urediti video?',
    description: 'Montaža i obrada sadržaja – kako od sirove snimke napraviti video koji ljudi gledaju do kraja i fotografije koje se ističu na tvom profilu.',
    duration: '',
    category: 'Produkcija',
    daysToUnlock: 2,
    comingSoon: true,
  },
  {
    id: 'course-5',
    title: 'Objavljivanje sadržaja',
    subtitle: 'Tajne objavljivanja',
    description: 'Kada objaviti, kako složiti naslovnicu, opis, hashtagove i prvi komentar, što nikako ne objavljivati te kako jedan video pretvoriti u dva profila. Plus: kako snimati storyje i dijeliti Reelse za dodatne preglede.',
    duration: '5:41',
    category: 'Algoritam',
    daysToUnlock: 3,
  },
  {
    id: 'course-6',
    title: 'Količina objavljivanja',
    subtitle: 'Koliko uploadati?',
    description: 'Koliko storyja, postova, Reelsa i TikTok videa objavljivati da algoritam radi za tebe – od idealnog broja storyja do ljestvice ocjena za TikTok tempo. I zašto je kvaliteta ipak važnija od kvantitete.',
    duration: '4:13',
    category: 'Strategija',
    daysToUnlock: 4,
  },
  {
    id: 'course-7',
    title: 'Interakcija s publikom',
    subtitle: 'Poveži se s pratiteljima',
    description: 'Kako odgovarati na komentare i poruke da gradiš odnos i algoritam, kada pinati komentar, koliko ulaziti u razgovor te kako mirno i pametno reagirati na negativne komentare i hejtere.',
    duration: '3:09',
    category: 'Zajednica',
    daysToUnlock: 5,
  },
  {
    id: 'course-8',
    title: 'Promjene algoritma',
    subtitle: 'Kako preživjeti pad algoritma?',
    description: 'Što kad doseg padne: kako se osloniti na zajednicu, reciklirati videe, eksperimentirati i biti prisutan na više platformi. Plus šest grešaka koje ubijaju doseg – od slabog hooka u prve tri sekunde do objavljivanja bez ritma.',
    duration: '7:24',
    category: 'Algoritam',
    daysToUnlock: 6,
  },
  {
    id: 'course-9',
    title: 'Suradnja s klijentima i partnerima',
    subtitle: 'Kako zarađivati?',
    description: 'Kako doći do prve plaćene suradnje, pregovarati bez spuštanja cijene, komunicirati s brendovima i agencijama, složiti svoj cjenik i znati kada ga dignuti. Plus: kako od briefa napraviti reklamu i prepoznati prevaru.',
    duration: '7:55',
    category: 'Monetizacija',
    daysToUnlock: 7,
  },
];
