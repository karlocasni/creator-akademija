import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Phone, Mail, Camera, ShieldCheck, LogOut, ArrowLeft, ChevronDown, KeyRound } from 'lucide-react';
import { db, storage, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import XPBadge from '../components/ui/XPBadge';
import { UserProfile } from '../types/post';
import { calculateLevel } from '../lib/xp';

function parseFirestoreDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default function Profile() {
  const { userId: paramId, username: paramUsername } = useParams();
  const navigate = useNavigate();
  const { user, profile: myProfile, signOut } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
  
  // Form states for current user
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  
  // Social states
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  
  const [editOpen, setEditOpen] = useState(false);
  
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  // Determine if we are looking at our own profile
  const isOwnProfile = (!paramId && !paramUsername) || paramId === user?.uid || (paramUsername && paramUsername === myProfile?.username);

  useEffect(() => {
    async function fetchUser() {
      if (isOwnProfile) {
        setViewedProfile(myProfile);
        if (myProfile) {
          setUsername(myProfile.username || '');
          setPhoneNumber(myProfile.phone_number || '');
          setBio(myProfile.bio || '');
          setGender(myProfile.gender || 'male');
          setInstagram(myProfile.instagram || '');
          setTiktok(myProfile.tiktok || '');
          setYoutube(myProfile.youtube || '');
        }
      } else if (paramId) {
        setFetchingProfile(true);
        try {
          const docSnap = await getDoc(doc(db, 'profiles', paramId));
          if (docSnap.exists()) {
            setViewedProfile(docSnap.data() as UserProfile);
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        } finally {
          setFetchingProfile(false);
        }
      } else if (paramUsername) {
        setFetchingProfile(true);
        try {
          const q = query(
            collection(db, 'profiles'),
            where('username', '==', paramUsername),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setViewedProfile(snap.docs[0].data() as UserProfile);
          }
        } catch (err) {
          console.error('Error fetching profile by username:', err);
        } finally {
          setFetchingProfile(false);
        }
      }
    }
    fetchUser();
  }, [paramId, isOwnProfile, myProfile]);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user?.uid) throw new Error('Korisnik nije prijavljen.');
      await setDoc(
        doc(db, 'profiles', user.uid),
        { username, phone_number: phoneNumber, bio: bio.trim(), gender, instagram: instagram.trim(), tiktok: tiktok.trim(), youtube: youtube.trim(), updatedAt: new Date().toISOString() },
        { merge: true },
      );
      showStatus('success', 'Profil uspješno ažuriran!');
    } catch (err) {
      showStatus('error', 'Greška pri ažuriranju profila.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Check file size (2MB limit as per rules)
    if (file.size > 2 * 1024 * 1024) {
      showStatus('error', 'Slika je prevelika. Maksimalna veličina je 2MB.');
      return;
    }

    const storageRef = ref(storage, `avatars/${user.uid}/avatar.jpg`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snapshot) => {
        setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (err) => {
        console.error(err);
        setUploadProgress(null);
        showStatus('error', 'Greška pri uploadu slike.');
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await setDoc(doc(db, 'profiles', user.uid), { avatar_url: url }, { merge: true });
        setUploadProgress(null);
        showStatus('success', 'Avatar uspješno ažuriran!');
      },
    );
  };

  if (fetchingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const avatarSrc =
    viewedProfile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewedProfile?.username || 'user'}`;

  return (
    <div className="p-4 md:p-10 max-w-2xl mx-auto pb-20">
      <header className="mb-10 flex items-start justify-between">
        <div>
          {!isOwnProfile && (
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Povratak</span>
            </button>
          )}
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-white">
            {isOwnProfile ? 'KORISNIČKI ' : 'PREGLED '} 
            <span className="text-primary">PROFILA</span>
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest mt-1">
            {isOwnProfile 
              ? 'Upravljaj svojim podacima, prati Creator XP i razinu.' 
              : `Statistika i podaci korisnika ${viewedProfile?.username}.`}
          </p>
        </div>
      </header>

      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="ursa-card p-8 flex flex-col items-center text-center">
          <div className="relative group mb-4">
            <div className="w-32 h-32 rounded-full border-2 border-primary p-1">
              <img
                src={avatarSrc}
                className="w-full h-full rounded-full object-cover"
                alt="Avatar"
              />
              {isOwnProfile && uploadProgress !== null && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white">{uploadProgress}%</span>
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null}
                className="absolute bottom-1 right-1 p-2 bg-primary text-black rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          {isOwnProfile && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          )}
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
            {viewedProfile?.username || 'Projekt90 Član'}
          </h2>
          <div className="mt-2">
            <XPBadge xp={viewedProfile?.xp ?? 0} />
          </div>
          {viewedProfile?.status === 'active' && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                Aktivni Član
              </span>
            </div>
          )}

          {/* SOCIAL ICONS (View & Own Profile) */}
          {(viewedProfile?.instagram || viewedProfile?.tiktok || viewedProfile?.youtube) && (
            <div className="flex items-center justify-center gap-3 mt-6">
              {viewedProfile.instagram && (
                <a href={`https://instagram.com/${viewedProfile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {viewedProfile.tiktok && (
                <a href={`https://tiktok.com/@${viewedProfile.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96-.5 3.9-1.5 5.56-1.14 1.83-3.1 3.12-5.26 3.4-2.18.29-4.52-.22-6.29-1.57-1.74-1.35-2.87-3.37-3.08-5.59-.2-2.22.42-4.51 1.82-6.25 1.34-1.63 3.33-2.67 5.43-2.84.4-.04.81-.04 1.21-.02v3.9c-.39-.02-.79-.04-1.18-.01-1.07.08-2.11.53-2.89 1.3-.77.78-1.22 1.83-1.26 2.92-.04 1.09.34 2.16 1.03 3.02.7.85 1.71 1.37 2.8 1.48 1.09.11 2.21-.21 3.09-.86.88-.65 1.42-1.61 1.56-2.69.14-1.07-.11-2.18-.7-3.09V.02h3.04z"/></svg>
                </a>
              )}
              {viewedProfile.youtube && (
                <a href={viewedProfile.youtube.startsWith('http') ? viewedProfile.youtube : `https://youtube.com/@${viewedProfile.youtube.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 flex items-center justify-center hover:scale-110 transition-all text-white hover:text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              )}
              
              {isOwnProfile && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors h-10 ml-2"
                >
                  Uredi Mreže
                </button>
              )}
            </div>
          )}
        </div>

        {isOwnProfile ? (
          /* Form Section for Own Profile */
          <div className="ursa-card p-8 space-y-6">
            {/* Email — always visible */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                Email adresa
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            {/* Collapsible edit section */}
            <button
              type="button"
              onClick={() => setEditOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-black uppercase tracking-widest text-white hover:border-primary/50 transition-colors"
            >
              <span>Uredi profil</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${editOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {editOpen && (
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                    Korisničko ime
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
                      placeholder="korisnicko_ime"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                    Broj mobitela
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-primary focus:outline-none transition-colors text-white"
                      placeholder="+385 91 000 0000"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                    Opis o meni
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white resize-none placeholder:text-muted-foreground/50"
                    placeholder="Napiši nešto o sebi, svojim ciljevima..."
                  />
                  <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                    Spol
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white appearance-none"
                  >
                    <option value="male" className="bg-black text-white">Muško</option>
                    <option value="female" className="bg-black text-white">Žensko</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <h3 className="text-sm font-black uppercase text-white mb-4 tracking-widest">Moje Mreže</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2 text-left">
                      <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary focus:outline-none transition-colors text-white"
                        placeholder="@korisničkoime"
                      />
                    </div>
                    
                    <div className="space-y-2 text-left">
                      <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                        TikTok
                      </label>
                      <input
                        type="text"
                        value={tiktok}
                        onChange={(e) => setTiktok(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary focus:outline-none transition-colors text-white"
                        placeholder="@korisničkoime"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                        YouTube
                      </label>
                      <input
                        type="text"
                        value={youtube}
                        onChange={(e) => setYoutube(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:border-primary focus:outline-none transition-colors text-white"
                        placeholder="Naziv kanala ili URL"
                      />
                    </div>
                  </div>
                </div>

                {statusMsg && (
                  <p
                    className={
                      statusMsg.type === 'success'
                        ? 'text-sm text-primary font-bold text-center'
                        : 'text-sm text-red-400 font-bold text-center'
                    }
                  >
                    {statusMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-black rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {loading ? 'SPREMANJE...' : 'AŽURIRAJ PROFIL'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* View-only stats for other users */
          <div className="space-y-6">
            {/* Bio — shown if set */}
            {viewedProfile?.bio && (
              <div className="ursa-card p-6">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Opis o meni</p>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{viewedProfile.bio}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="ursa-card p-6 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Ukupni XP
                </span>
                <span className="text-2xl font-black text-primary">
                  {(viewedProfile?.xp ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="ursa-card p-6 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Razina
                </span>
                <span className="text-2xl font-black text-white">
                  {calculateLevel(viewedProfile?.xp ?? 0)}
                </span>
              </div>
            </div>
            {myProfile?.isAdmin && !isOwnProfile && paramId && (
              <div className="space-y-4">
                <div className="ursa-card p-6 border border-primary/20 bg-primary/5">
                  <h3 className="text-sm font-black text-primary uppercase mb-4">Admin Kontrole: Pretplata</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground uppercase text-xs">Datum pridruživanja:</span>
                      <span className="font-bold text-white">
                        {(() => { const d = parseFirestoreDate(viewedProfile?.createdAt); return d ? d.toLocaleDateString('hr-HR') : 'Nepoznato'; })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground uppercase text-xs">Datum isteka (90d + offset):</span>
                      <span className="font-bold text-primary">
                        {(() => {
                          const d = parseFirestoreDate(viewedProfile?.createdAt);
                          if (!d) return 'Nepoznato';
                          const expiry = new Date(d.getTime() + (90 + (viewedProfile?.offsetDays || 0)) * 24 * 60 * 60 * 1000);
                          return expiry.toLocaleDateString('hr-HR');
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground uppercase text-xs">Trenutni offset:</span>
                      <span className="font-bold">{viewedProfile?.offsetDays || 0} dana</span>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    <input 
                      type="number"
                      placeholder="Novi offset"
                      className="w-24 bg-black/50 border border-white/10 rounded-xl py-2 px-3 focus:border-primary text-white text-center"
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          // We use a custom property on the input to store the value temporarily without React state if needed,
                          // but since we can't easily do that without state, we will add an id and read it.
                        }
                      }}
                      id={`offset-input-${paramId}`}
                    />
                    <button
                      onClick={async () => {
                        const inputEl = document.getElementById(`offset-input-${paramId}`) as HTMLInputElement;
                        const val = parseInt(inputEl.value);
                        if (isNaN(val)) return alert('Unesite ispravan broj');
                        
                        const { updateDoc } = await import('firebase/firestore');
                        try {
                          await updateDoc(doc(db, 'profiles', paramId), {
                            offsetDays: val
                          });
                          alert(`Offset postavljen na ${val} dana.`);
                          inputEl.value = '';
                        } catch (err) {
                          alert('Greška pri ažuriranju: ' + err);
                        }
                      }}
                      className="flex-1 py-2 bg-primary text-black rounded-xl text-sm font-black hover:scale-[1.02] transition-transform"
                    >
                      POSTAVI OFFSET
                    </button>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!window.confirm('Jesi li siguran da želiš obrisati ovog korisnika?')) return;
                    try {
                      const { deleteDoc } = await import('firebase/firestore');
                      await deleteDoc(doc(db, 'profiles', paramId));
                      alert('Korisnik obrisan.');
                      navigate('/members');
                    } catch (err) {
                      console.error('Delete user failed:', err);
                      alert('Greška pri brisanju korisnika.');
                    }
                  }}
                  className="w-full py-4 ursa-card border-red-500/20 text-red-400 font-black text-lg flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
                >
                  OBRIŠI KORISNIKA
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reset password + Sign out (only on own profile) */}
        {isOwnProfile && (
          <div className="space-y-3">
            <button
              onClick={handlePasswordReset}
              disabled={resetSent}
              className="w-full py-4 ursa-card border-primary/20 text-primary font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors disabled:opacity-60"
            >
              <KeyRound className="w-5 h-5" />
              {resetSent ? '✓ LINK POSLAN NA TVOJ EMAIL' : 'RESETIRAJ LOZINKU'}
            </button>
            <button
              onClick={signOut}
              className="w-full py-4 ursa-card border-red-500/20 text-red-400 font-black text-lg flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" /> ODJAVA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
