// Creator Akademija - Local Mock Firebase Engine
// Completely replaces firebase packages via Vite aliases

// --- TIMESTAMP MOCK ---
export class MockTimestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  toDate() {
    return new Date(this.seconds * 1000);
  }
  toISOString() {
    return this.toDate().toISOString();
  }
  static now() {
    return new MockTimestamp(Math.floor(Date.now() / 1000), 0);
  }
  static fromDate(date: Date) {
    return new MockTimestamp(Math.floor(date.getTime() / 1000), 0);
  }
}

// --- INITIALIZE SEED DATA ---
const getLocalData = (key: string, initial: any) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return initial;
  }
};

const setLocalData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const SEED_PROFILES = {
  'mock-user-id': {
    uid: 'mock-user-id',
    username: 'Kreator Student',
    email: 'korisnik@akademija.com',
    status: 'active',
    xp: 450,
    level: 2,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KreatorStudent',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isAdmin: false,
    weeklyGoal: 3,
    weeklyPostCount: 1,
    streak: 2,
    streakWeekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'ismael-admin-id': {
    uid: 'ismael-admin-id',
    username: 'Ismael Hadžić',
    email: 'ismael@akademija.com',
    status: 'active',
    xp: 9999,
    level: 99,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ismael',
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    isAdmin: true,
    weeklyGoal: 7,
    weeklyPostCount: 7,
    streak: 12,
    streakWeekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'student-1': {
    uid: 'student-1',
    username: 'Anamarija V.',
    email: 'anamarija@akademija.com',
    status: 'active',
    xp: 2300,
    level: 8,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anamarija',
    createdAt: new Date().toISOString(),
    isAdmin: false,
    weeklyGoal: 5,
    weeklyPostCount: 4,
    streak: 4,
    streakWeekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'student-2': {
    uid: 'student-2',
    username: 'Filip B.',
    email: 'filip@akademija.com',
    status: 'active',
    xp: 1850,
    level: 6,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Filip',
    createdAt: new Date().toISOString(),
    isAdmin: false,
    weeklyGoal: 2,
    weeklyPostCount: 2,
    streak: 1,
    streakWeekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'student-3': {
    uid: 'student-3',
    username: 'Lana S.',
    email: 'lana@akademija.com',
    status: 'active',
    xp: 1200,
    level: 4,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lana',
    createdAt: new Date().toISOString(),
    isAdmin: false,
    weeklyGoal: 3,
    weeklyPostCount: 0,
    streak: 0,
    streakWeekStart: new Date().toISOString(),
  }
};

const SEED_COURSES = [
  {
    id: 'course-1',
    title: 'Dobrodošli u kreator akademiju (PRVO I PRVO! - 2 Min)',
    description: 'Uvodna lekcija o Akademiji. Saznaj što te sve čeka i kako najbolje iskoristiti resurse.',
    daysToUnlock: 0,
    thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500',
    duration: '2:00',
    category: 'Uvod',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: 'course-2',
    title: 'Tko su influenceri uopće?',
    description: 'Temeljito razumijevanje modernog utjecaja na društvenim mrežama i psihologije gledatelja.',
    daysToUnlock: 0,
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500',
    duration: '5:00',
    category: 'Teorija',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: 'course-3',
    title: 'Odabir niše (Odaberi svoj smjer - 4 Min)',
    description: 'Kako definirati svoju idealnu publiku, odabrati profitabilan smjer i kreirati prepoznatljiv brend.',
    daysToUnlock: 1,
    thumbnail: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=500',
    duration: '4:00',
    category: 'Strategija',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: 'course-4',
    title: 'Kreiranje videa (Kako urediti video?)',
    description: 'Osnove snimanja, osvjetljenja te napredne tehnike mobilnog editiranja (CapCut/Premiere Rush).',
    daysToUnlock: 2,
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=500',
    duration: '12:00',
    category: 'Produkcija',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: 'course-5',
    title: 'Objavljivanje sadržaja (Tajne objavljivanja)',
    description: 'Najbolje vrijeme za objavu, optimizacija naslova, tagova i opisa koje algoritmi vole.',
    daysToUnlock: 3,
    thumbnail: 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=500',
    duration: '8:00',
    category: 'Algoritam',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: 'course-6',
    title: 'Količina objavljivanja (Koliko uploadati?)',
    description: 'Balansiranje frekvencije objava i kvalitete. Kako ostati dosljedan bez izgaranja.',
    daysToUnlock: 4,
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500',
    duration: '6:00',
    category: 'Strategija',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: 'course-7',
    title: 'Interakcija s publikom (Poveži se s pratiteljima)',
    description: 'Kako odgovarati na komentare, raditi Q&A videe i pretvoriti povremene gledatelje u lojalnu bazu.',
    daysToUnlock: 5,
    thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500',
    duration: '9:00',
    category: 'Zajednica',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: 'course-8',
    title: 'Promjene algoritma (Kako preživjeti pad algoritma?)',
    description: 'Što napraviti kada pregledi padnu i kako se brzo prilagoditi novim trendovima platformi.',
    daysToUnlock: 6,
    thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500',
    duration: '10:00',
    category: 'Algoritam',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: 'course-9',
    title: 'Suradnja s klijentima i partnerima (Kako zarađivati?)',
    description: 'Kreiranje media kita, slanje ponuda brandovima (cold outreach) i pregovaranje sponzorstava.',
    daysToUnlock: 7,
    thumbnail: 'https://images.unsplash.com/photo-1552581230-c01bc941c91a?w=500',
    duration: '15:00',
    category: 'Monetizacija',
    youtubeId: 'dQw4w9WgXcQ'
  }
];

const SEED_POSTS = [
  {
    id: 'post-1',
    userId: 'ismael-admin-id',
    username: 'Ismael Hadžić',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ismael',
    content: 'Dobrodošli u Creator Akademiju! 🚀 Ovdje dijelimo svoje najbolje hookove, thumbnailove, i što je najvažnije - NAŠE POBJEDE! Napišite u komentarima odakle dolazite i koji vam je trenutno cilj na društvenim mrežama.',
    likes: ['student-1', 'student-2', 'mock-user-id'],
    likeCount: 3,
    commentsCount: 2,
    createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 24, 0)
  },
  {
    id: 'post-2',
    userId: 'student-1',
    username: 'Anamarija V.',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anamarija',
    content: 'EKIPA! Upravo mi je jedan video probio 100k pregleda na TikToku koristeći slot-machine Viral Hook Generator! 😭🔥 Uvodne 3 sekunde su doslovno presudne! Hvala Ismaelu na savjetima za uvođenje emocije.',
    likes: ['ismael-admin-id', 'mock-user-id'],
    likeCount: 2,
    commentsCount: 1,
    createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 12, 0)
  }
];

const SEED_COMMENTS = {
  'post-1': [
    {
      id: 'comment-1',
      userId: 'student-2',
      username: 'Filip B.',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Filip',
      content: 'Pozdrav! Dolazim iz Zagreba, cilj mi je doći do 10k pratitelja na Instagramu i pokrenuti svoj brand. Sretan sam što sam ovdje!',
      createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 20, 0)
    },
    {
      id: 'comment-2',
      userId: 'mock-user-id',
      username: 'Kreator Student',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KreatorStudent',
      content: 'Jedva čekam proći sve lekcije i dignuti kvalitetu videa na novu razinu! Hvala Ismael!',
      createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 18, 0)
    }
  ],
  'post-2': [
    {
      id: 'comment-3',
      userId: 'ismael-admin-id',
      username: 'Ismael Hadžić',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ismael',
      content: 'Tako je, Anamarija! Bravo! To je tek početak, samo nastavi raditi konzistentno! 🎯🏆',
      createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 10, 0)
    }
  ]
};

const SEED_MESSAGES = {
  'chat-global': [
    {
      id: 'msg-1',
      userId: 'ismael-admin-id',
      username: 'Ismael Hadžić',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ismael',
      text: 'Pozdrav svima u globalnom chat-u! Iskoristite ovaj prostor za brza pitanja i networking.',
      createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 48, 0)
    },
    {
      id: 'msg-2',
      userId: 'student-1',
      username: 'Anamarija V.',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anamarija',
      text: 'Slažem se! Super je što možemo komunicirati direktno ovdje.',
      createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 40, 0)
    }
  ]
};

const getSunday = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysToSunday);
  sunday.setHours(23, 59, 59, 0);
  return sunday.toISOString();
};

const SEED_CHALLENGES = [
  {
    id: 'challenge-1',
    title: 'Snimi 3 različita hooka za isti proizvod',
    description: 'Cilj je vježbati uvodne 3 sekunde. Snimi tri potpuno različita pristupa (Vizualni šok, Statistički hook, Emocionalni hook) i postavi ih u Creator Hub.',
    xpReward: 50,
    daysRemaining: 5,
    deadline: getSunday(),
    active: true,
    exampleText: 'Pogledaj lekciju 1 o hookovima za inspiraciju. Svaki hook mora biti drugačiji pristup!',
    participants: ['student-1', 'student-2', 'mock-user-id']
  },
  {
    id: 'challenge-2',
    title: 'Objavi video svaki dan tijekom 7 dana',
    description: 'Izazov dosljednosti! Objavljuj jedan video dnevno. Svoje video linkove i statistiku podijeli s kolegama za dodatni feedback.',
    xpReward: 100,
    daysRemaining: 12,
    deadline: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: false,
    participants: ['student-1']
  }
];

const SEED_HOOK_VAULT = [
  {
    id: 'hook-1',
    hookText: 'Ovo nitko od lifestyle kreatora ne govori otvoreno...',
    kategorija: 'Radoznalost',
    nisa: 'Lifestyle',
    zastoRadi: 'Radoznalost je jedan od najjačih psiholoških okidača. Gledatelji moraju znati što skrivate.',
    authorId: 'ismael-admin-id',
    authorName: 'Ismael Hadžić',
    likes: ['student-1', 'student-2'],
    likeCount: 2,
    createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 24, 0)
  },
  {
    id: 'hook-2',
    hookText: 'POV: Ulaziš u fitness zajednicu prvi put i ne znaš ništa...',
    kategorija: 'Humor',
    nisa: 'Fitness',
    zastoRadi: 'POV format stvara immediacy i identifikaciju. Gledatelji se stavljaju u situaciju i ostaju da vide kako se razvija.',
    authorId: 'student-1',
    authorName: 'Anamarija V.',
    likes: ['mock-user-id'],
    likeCount: 1,
    createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 12, 0)
  },
  {
    id: 'hook-3',
    hookText: 'Jedna greška koja koštala moj kanal 50.000 pratitelja:',
    kategorija: 'Priča',
    nisa: 'Biznis',
    zastoRadi: 'Priče o greškama i gubitku aktiviraju empatiju i FOMO. Audience želi znati grešku da je izbjegne.',
    authorId: 'student-2',
    authorName: 'Filip B.',
    likes: ['ismael-admin-id', 'student-1', 'mock-user-id'],
    likeCount: 3,
    createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 6, 0)
  }
];

const SEED_CHALLENGE_SUBMISSIONS: any[] = [
  {
    id: 'sub-1',
    challengeId: 'challenge-1',
    authorId: 'student-1',
    authorName: 'Anamarija V.',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anamarija',
    videoLink: 'https://tiktok.com/@anamarija/video/example',
    description: 'Moj hook za jutarnju rutinu — tri potpuno različita pristupa!',
    likes: ['ismael-admin-id'],
    likeCount: 1,
    isPinned: false,
    createdAt: new MockTimestamp(Math.floor(Date.now() / 1000) - 3600 * 5, 0)
  }
];

const SEED_VIDEO_IDEAS: any[] = [];
const SEED_SAVED_TRENDS: any[] = [];

const SEED_NOTIFICATIONS: any[] = [];

const SEED_EVENTS = [
  {
    id: 'event-1',
    title: 'Live Q&A s Ismaelom',
    description: 'Postavite svoja pitanja direktno Ismaelu! Radit ćemo live audit vaših kanala, analizirati preglede i prokomentirati uvodne hookove.',
    type: 'live_qa', // live_qa, guest_lecture, accountability
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    duration: '60 min',
    zoomLink: 'https://zoom.us/j/placeholder-ismael-qa',
    speaker: 'Ismael Hadžić'
  },
  {
    id: 'event-2',
    title: 'Gost Predavač: TikTok Algoritam 2026',
    description: 'U goste nam stiže poznati regionalni kreator koji će s nama podijeliti najnovije tajne rasta na TikTok platformi u 2026. godini.',
    type: 'guest_lecture',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '90 min',
    zoomLink: 'https://zoom.us/j/placeholder-guest-lecture',
    speaker: 'Filip (TikTok Expert)'
  },
  {
    id: 'event-3',
    title: 'Accountability Sastanak: Tjedni Rezultati',
    description: 'Povežite se s ostalim članovima grupe, podijelite svoje tjedne ciljeve i preuzmite odgovornost za svoj napredak u narednih 7 dana.',
    type: 'accountability',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration: '45 min',
    zoomLink: 'https://meet.google.com/placeholder-accountability',
    speaker: 'Creator Moderatori'
  }
];

// Load databases or write initial values
let mockDb = {
  profiles: getLocalData('creator_mock_profiles', SEED_PROFILES),
  courses: getLocalData('creator_mock_courses', SEED_COURSES),
  posts: getLocalData('creator_mock_posts', SEED_POSTS),
  comments: getLocalData('creator_mock_comments', SEED_COMMENTS),
  messages: getLocalData('creator_mock_messages', SEED_MESSAGES),
  challenges: getLocalData('creator_mock_challenges', SEED_CHALLENGES),
  notifications: getLocalData('creator_mock_notifications', SEED_NOTIFICATIONS),
  events: getLocalData('creator_mock_events', SEED_EVENTS),
  hookVault: getLocalData('creator_mock_hook_vault', SEED_HOOK_VAULT),
  videoIdeas: getLocalData('creator_mock_video_ideas', SEED_VIDEO_IDEAS),
  challengeSubmissions: getLocalData('creator_mock_challenge_submissions', SEED_CHALLENGE_SUBMISSIONS),
  savedTrends: getLocalData('creator_mock_saved_trends', SEED_SAVED_TRENDS),
};

const saveDb = () => {
  setLocalData('creator_mock_profiles', mockDb.profiles);
  setLocalData('creator_mock_courses', mockDb.courses);
  setLocalData('creator_mock_posts', mockDb.posts);
  setLocalData('creator_mock_comments', mockDb.comments);
  setLocalData('creator_mock_messages', mockDb.messages);
  setLocalData('creator_mock_challenges', mockDb.challenges);
  setLocalData('creator_mock_notifications', mockDb.notifications);
  setLocalData('creator_mock_events', mockDb.events);
  setLocalData('creator_mock_hook_vault', mockDb.hookVault);
  setLocalData('creator_mock_video_ideas', mockDb.videoIdeas);
  setLocalData('creator_mock_challenge_submissions', mockDb.challengeSubmissions);
  setLocalData('creator_mock_saved_trends', mockDb.savedTrends);
  triggerAllListeners();
};

// --- REACTIVE LISTENER ENGINE ---
interface Listener {
  id: string;
  collectionName: string;
  docId?: string;
  chatId?: string;
  callback: (snapshot: any) => void;
}
let activeListeners: Listener[] = [];

const triggerListener = (listener: Listener) => {
  const col = mockDb[listener.collectionName as keyof typeof mockDb];
  if (!col && listener.collectionName !== 'messages') return;

  if (listener.docId) {
    // Document Listener
    const docData = Array.isArray(col) 
      ? col.find((item: any) => item.id === listener.docId)
      : col[listener.docId];
    
    listener.callback({
      id: listener.docId,
      exists: () => !!docData,
      data: () => docData ? JSON.parse(JSON.stringify(docData)) : null
    });
  } else {
    // Collection/Query Listener
    let docArray = [];
    if (listener.collectionName === 'messages' && listener.chatId) {
      docArray = (mockDb.messages as any)[listener.chatId] || [];
    } else if (col) {
      docArray = Array.isArray(col) ? col : Object.values(col);
    }

    // Deep copy to prevent side effects
    const docsCopy = JSON.parse(JSON.stringify(docArray));
    
    listener.callback({
      docs: docsCopy.map((docItem: any) => ({
        id: docItem.id || docItem.uid,
        exists: () => true,
        data: () => docItem
      })),
      empty: docsCopy.length === 0,
      size: docsCopy.length,
      forEach: (cb: any) => {
        docsCopy.forEach((docItem: any) => {
          cb({
            id: docItem.id || docItem.uid,
            exists: () => true,
            data: () => docItem
          });
        });
      }
    });
  }
};

const triggerAllListeners = () => {
  activeListeners.forEach(triggerListener);
};

// --- MOCK FIREBASE INITIALIZATION & AUTH ---
export const initializeApp = () => ({});

// Setup mock session
let currentMockUser: any = JSON.parse(localStorage.getItem('creator_mock_current_user') || 'null');
let authStateChangedListeners: ((user: any) => void)[] = [];

export const getAuth = () => ({
  currentUser: currentMockUser,
  signOut: async () => {
    currentMockUser = null;
    localStorage.removeItem('creator_mock_current_user');
    authStateChangedListeners.forEach(cb => cb(null));
  }
}) as any;

export const signOut = async (authObj?: any) => {
  currentMockUser = null;
  localStorage.removeItem('creator_mock_current_user');
  authStateChangedListeners.forEach(cb => cb(null));
};

export const firebaseSignOut = signOut;

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const profileMatch = Object.values(mockDb.profiles).find((p: any) => p.email.toLowerCase() === email.toLowerCase()) as any;
  const userPayload = {
    uid: profileMatch ? profileMatch.uid : 'mock-user-id',
    email: email,
    displayName: profileMatch ? profileMatch.username : 'Kreator Student',
    emailVerified: true
  };
  currentMockUser = userPayload;
  localStorage.setItem('creator_mock_current_user', JSON.stringify(userPayload));
  authStateChangedListeners.forEach(cb => cb(userPayload));
  return { user: userPayload };
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const newUid = 'mock-user-' + Math.random().toString(36).substring(7);
  const userPayload = {
    uid: newUid,
    email: email,
    displayName: 'Novi Član',
    emailVerified: true
  };
  
  // Create profile automatically in mockDb
  mockDb.profiles[newUid] = {
    uid: newUid,
    username: 'Novi Član',
    email: email,
    status: 'active', // Instantly activate on register for mock demo!
    xp: 0,
    level: 1,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUid}`,
    createdAt: new Date().toISOString(),
    isAdmin: false
  };
  saveDb();

  currentMockUser = userPayload;
  localStorage.setItem('creator_mock_current_user', JSON.stringify(userPayload));
  authStateChangedListeners.forEach(cb => cb(userPayload));
  return { user: userPayload };
};

export const sendEmailVerification = async () => true;
export const updateProfile = async (user: any, updates: any) => {
  if (currentMockUser) {
    currentMockUser = { ...currentMockUser, displayName: updates.displayName };
    localStorage.setItem('creator_mock_current_user', JSON.stringify(currentMockUser));
    
    if (mockDb.profiles[currentMockUser.uid]) {
      mockDb.profiles[currentMockUser.uid].username = updates.displayName;
      saveDb();
    }
  }
  return true;
};
export const sendPasswordResetEmail = async () => true;

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  authStateChangedListeners.push(callback);
  
  // Auto-log in a demo user if none exists, so they don't get stuck on auth
  if (!currentMockUser) {
    const defaultUser = {
      uid: 'mock-user-id',
      email: 'korisnik@akademija.com',
      displayName: 'Kreator Student',
      emailVerified: true
    };
    currentMockUser = defaultUser;
    localStorage.setItem('creator_mock_current_user', JSON.stringify(defaultUser));
  }

  callback(currentMockUser);
  return () => {
    authStateChangedListeners = authStateChangedListeners.filter(cb => cb !== callback);
  };
};

// --- MOCK FIRESTORE API ---
export const getFirestore = () => ({}) as any;
export const enableIndexedDbPersistence = async () => {};

export const collection = (dbObj: any, ...pathSegments: string[]) => {
  const lastSegment = pathSegments[pathSegments.length - 1];
  if (lastSegment === 'messages') {
    return { collectionName: 'messages', chatId: pathSegments[1] };
  }
  return { collectionName: pathSegments[0] };
};

export const writeBatch = (dbObj?: any) => ({
  set: () => {},
  update: () => {},
  delete: () => {},
  commit: async () => {}
});

export const doc = (dbObj: any, pathOrCol: any, ...segments: string[]) => {
  if (typeof pathOrCol === 'string') {
    // e.g. doc(db, 'profiles', uid)
    return { collectionName: pathOrCol, docId: segments[0] };
  } else {
    // e.g. doc(collectionRef, uid)
    return { collectionName: pathOrCol.collectionName, docId: pathOrCol.docId || segments[0] };
  }
};

export const query = (colRef: any, ...queryConstraints: any[]) => {
  return colRef; // Just return collection reference for mockup
};

// Filter constraints (stubs)
export const where = () => ({ type: 'where' });
export const orderBy = () => ({ type: 'orderBy' });
export const limit = () => ({ type: 'limit' });
export const startAfter = (...args: any[]) => ({ type: 'startAfter' });
export class DocumentSnapshot {}

export const getDoc = async (docRef: any) => {
  const col = mockDb[docRef.collectionName as keyof typeof mockDb];
  if (!col) return { exists: () => false, data: () => null };

  const docData = Array.isArray(col)
    ? col.find((item: any) => item.id === docRef.docId)
    : col[docRef.docId];

  return {
    id: docRef.docId,
    exists: () => !!docData,
    data: () => docData ? JSON.parse(JSON.stringify(docData)) : null
  };
};

export const getDocs = async (queryRef: any) => {
  const colName = queryRef.collectionName;
  let docArray = [];
  if (colName === 'messages' && queryRef.chatId) {
    docArray = (mockDb.messages as any)[queryRef.chatId] || [];
  } else {
    const col = mockDb[colName as keyof typeof mockDb];
    if (col) {
      docArray = Array.isArray(col) ? col : Object.values(col);
    }
  }
  
  return {
    docs: docArray.map((docItem: any) => ({
      id: docItem.id || docItem.uid,
      exists: () => true,
      data: () => JSON.parse(JSON.stringify(docItem))
    })),
    empty: docArray.length === 0,
    size: docArray.length,
    forEach: (cb: any) => {
      docArray.forEach((docItem: any) => {
        cb({
          id: docItem.id || docItem.uid,
          exists: () => true,
          data: () => JSON.parse(JSON.stringify(docItem))
        });
      });
    }
  };
};

export const addDoc = async (colRef: any, data: any) => {
  const colName = colRef.collectionName;
  const id = Math.random().toString(36).substring(7);
  const newRecord = { id, ...data };
  
  // Handle serverTimestamp
  if (newRecord.createdAt && typeof newRecord.createdAt === 'object') {
    newRecord.createdAt = MockTimestamp.now();
  }
  if (newRecord.timestamp && typeof newRecord.timestamp === 'object') {
    newRecord.timestamp = MockTimestamp.now();
  }

  // Handle nested messages sub-collection
  if (colName === 'messages' && colRef.chatId) {
    if (!mockDb.messages[colRef.chatId]) {
      mockDb.messages[colRef.chatId] = [];
    }
    mockDb.messages[colRef.chatId].push(newRecord);
  } else {
    if (Array.isArray(mockDb[colName as keyof typeof mockDb])) {
      (mockDb[colName as keyof typeof mockDb] as any).push(newRecord);
    } else {
      (mockDb[colName as keyof typeof mockDb] as any)[id] = newRecord;
    }
  }
  saveDb();
  return { id };
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  const colName = docRef.collectionName;
  const id = docRef.docId;

  if (Array.isArray(mockDb[colName as keyof typeof mockDb])) {
    const index = (mockDb[colName as keyof typeof mockDb] as any).findIndex((item: any) => item.id === id);
    if (index > -1) {
      if (options?.merge) {
        mockDb[colName as keyof typeof mockDb][index] = { ...mockDb[colName as keyof typeof mockDb][index], ...data };
      } else {
        mockDb[colName as keyof typeof mockDb][index] = { id, ...data };
      }
    } else {
      mockDb[colName as keyof typeof mockDb].push({ id, ...data });
    }
  } else {
    if (options?.merge) {
      mockDb[colName as keyof typeof mockDb][id] = { ...(mockDb[colName as keyof typeof mockDb][id] || {}), ...data };
    } else {
      mockDb[colName as keyof typeof mockDb][id] = { uid: id, ...data };
    }
  }
  saveDb();
  return true;
};

export const updateDoc = async (docRef: any, data: any) => {
  const colName = docRef.collectionName;
  const id = docRef.docId;

  const processObject = (obj: any) => {
    const res = { ...obj };
    for (const key in data) {
      const val = data[key];
      if (val && typeof val === 'object' && val._special === 'increment') {
        res[key] = (res[key] || 0) + val.value;
      } else {
        res[key] = val;
      }
    }
    return res;
  };

  if (Array.isArray(mockDb[colName as keyof typeof mockDb])) {
    const index = (mockDb[colName as keyof typeof mockDb] as any).findIndex((item: any) => item.id === id);
    if (index > -1) {
      mockDb[colName as keyof typeof mockDb][index] = processObject(mockDb[colName as keyof typeof mockDb][index]);
    }
  } else {
    if (mockDb[colName as keyof typeof mockDb][id]) {
      mockDb[colName as keyof typeof mockDb][id] = processObject(mockDb[colName as keyof typeof mockDb][id]);
    }
  }
  saveDb();
  return true;
};

export const deleteDoc = async (docRef: any) => {
  const colName = docRef.collectionName;
  const id = docRef.docId;

  if (Array.isArray(mockDb[colName as keyof typeof mockDb])) {
    mockDb[colName as keyof typeof mockDb] = (mockDb[colName as keyof typeof mockDb] as any).filter((item: any) => item.id !== id);
  } else {
    delete (mockDb[colName as keyof typeof mockDb] as any)[id];
  }
  saveDb();
  return true;
};

export const onSnapshot = (queryOrDocRef: any, callback: (snap: any) => void) => {
  const listener = {
    id: Math.random().toString(36).substring(7),
    collectionName: queryOrDocRef.collectionName,
    docId: queryOrDocRef.docId,
    chatId: queryOrDocRef.chatId,
    callback
  };
  activeListeners.push(listener);
  triggerListener(listener);
  return () => {
    activeListeners = activeListeners.filter(l => l.id !== listener.id);
  };
};

export const serverTimestamp = () => MockTimestamp.now();
export const increment = (val: number) => ({ _special: 'increment', value: val });
export const arrayUnion = (...elements: any[]) => ({ _special: 'arrayUnion', elements });
export const arrayRemove = (...elements: any[]) => ({ _special: 'arrayRemove', elements });
export const Timestamp = MockTimestamp;

// --- MOCK STORAGE API ---
export const getStorage = () => ({}) as any;
export const ref = (storageObj: any, path: string) => ({ path });
export const uploadBytesResumable = (refObj: any, file: File) => {
  const task = {
    snapshot: {
      ref: refObj
    },
    on: (event: string, progressCb: any, errorCb: any, completionCb: any) => {
      if (progressCb) progressCb({ bytesTransferred: 100, totalBytes: 100 });
      setTimeout(() => {
        if (completionCb) completionCb();
      }, 500);
    }
  };
  return task;
};
export const getDownloadURL = async (refObj: any) => {
  // Returns high fidelity unsplash avatar or sample thumbnail based on upload type
  if (refObj.path.includes('avatar')) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
  }
  return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500';
};

// --- MOCK FUNCTIONS API ---
export const getFunctions = () => ({}) as any;
export const httpsCallable = (funcObj: any, name: string) => {
  return async (args?: any) => {
    if (name === 'sendCustomVerificationEmail') {
      return { data: { success: true } };
    }
    // Simulate successful checkout or subscription
    if (name === 'createCheckoutSession') {
      return { data: { sessionId: 'mock-session-id', url: '/feed' } };
    }
    return { data: { success: true } };
  };
};

// --- MOCK ANALYTICS ---
export const getAnalytics = () => null;

// --- EXPORT MOCK INSTANCES ---
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
export const functions = getFunctions();
export const analytics = getAnalytics();
