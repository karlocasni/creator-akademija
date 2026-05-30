import { useState, useEffect, useRef } from 'react';
import { Play, Lock, Clock, CheckCircle2, ChevronRight, Bell, Plus, X, Upload } from 'lucide-react';
import { collection, getDocs, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { createNotification } from '../lib/notifications';

interface Lecture {
  id: string;
  title: string;
  description: string;
  daysToUnlock: number;
  thumbnail: string;
  duration: string;
  category: string;
  youtubeId?: string;
}


export default function Lectures() {
  const { user, profile, updateLocalProfile } = useAuth();
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCourse, setNewCourse] = useState<Partial<Lecture>>({});
  const [uploading, setUploading] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'courses'), orderBy('daysToUnlock', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbLectures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture));
      setLectures(dbLectures);
    });
    return unsubscribe;
  }, []);

  const notifyAll = async () => {
    if (!user || notifying) return;
    setNotifying(true);
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      const senderName = profile?.username || 'Admin';
      const senderAvatar =
        profile?.avatar_url ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderName}`;
      await Promise.all(
        snap.docs.map((d) =>
          createNotification({
            recipientId: d.id,
            senderId: user.uid,
            senderName,
            senderAvatar,
            type: 'new_lesson',
            message: 'Dostupna je nova lekcija! Provjeri bazu znanja.',
            postId: null,
          }).catch((err) => console.warn('Notify failed for', d.id, err)),
        ),
      );
    } catch (err) {
      console.error('notifyAll failed:', err);
    } finally {
      setNotifying(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `thumbnails/${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed', null, 
        (err) => { console.error(err); setUploading(false); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setNewCourse(prev => ({ ...prev, thumbnail: url }));
          setUploading(false);
        }
      );
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const extractYoutubeId = (urlOrId?: string) => {
    if (!urlOrId) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.match(regExp);
    return (match && match[2].length === 11) ? match[2] : urlOrId;
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!profile?.isAdmin) return;
    if (!window.confirm('Jesi li siguran da želiš obrisati ovu lekciju?')) return;
    
    try {
      await deleteDoc(doc(db, 'courses', courseId));
    } catch (err) {
      console.error('Failed to delete course:', err);
      alert('Greška pri brisanju');
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.thumbnail && !editCourseId) {
      alert('Molimo prenesite sliku!');
      return;
    }
    setAddingCourse(true);
    try {
      const courseData = {
        title: newCourse.title || '',
        description: newCourse.description || '',
        daysToUnlock: Number(newCourse.daysToUnlock) || 0,
        thumbnail: newCourse.thumbnail || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80',
        duration: newCourse.duration || '10:00',
        category: newCourse.category || 'Trening',
        youtubeId: extractYoutubeId(newCourse.youtubeId) || null,
        createdAt: editCourseId ? undefined : serverTimestamp(),
      };

      if (editCourseId) {
        await updateDoc(doc(db, 'courses', editCourseId), courseData);
      } else {
        await addDoc(collection(db, 'courses'), courseData);
      }
      
      setShowAddModal(false);
      setNewCourse({});
      setEditCourseId(null);
    } catch (err) {
      console.error('Failed to save course:', err);
      alert('Greška pri spremanju');
    } finally {
      setAddingCourse(false);
    }
  };

  const getSignupDate = (): Date => {
    if (!profile?.createdAt) return new Date();
    const parsed = new Date(profile.createdAt);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const getUnlockDate = (days: number): Date => {
    const signupDate = getSignupDate();
    return new Date(signupDate.getTime() + days * 24 * 60 * 60 * 1000);
  };

  const isLocked = (days: number): boolean => {
    if (profile?.isAdmin) return false;
    if (days <= 0) return false;
    
    // XP Bypass: Each locking day requires 150 XP (e.g. Day 1 = 150 XP, Day 2 = 300 XP, etc.)
    const requiredXp = days * 150;
    if (profile?.xp && profile.xp >= requiredXp) return false;

    if (!profile?.createdAt) return false;
    const unlockDate = getUnlockDate(days);
    return new Date() < unlockDate;
  };

  const getTimeRemaining = (days: number): string => {
    const requiredXp = days * 150;
    const hasXp = profile?.xp && profile.xp >= requiredXp;
    if (hasXp) return 'Otključano s XP';

    const unlockDate = getUnlockDate(days);
    const diff = unlockDate.getTime() - Date.now();
    if (diff <= 0) return 'Otključano';
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${d}d ${h}h (ili ${requiredXp} XP)`;
  };

  if (selectedLecture) {
    return (
      <div className="p-4 md:p-10 max-w-5xl mx-auto">
        <button
          onClick={() => setSelectedLecture(null)}
          className="mb-6 text-sm font-bold text-muted hover:text-primary flex items-center gap-1"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> NATRAG
        </button>
        <div className="aspect-video bg-black rounded-3xl overflow-hidden mb-8 relative">
          {selectedLecture.youtubeId ? (
            <iframe 
              src={`https://www.youtube.com/embed/${selectedLecture.youtubeId.includes('http') ? (selectedLecture.youtubeId.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11})/) || [])[1] || selectedLecture.youtubeId : selectedLecture.youtubeId}?rel=0&modestbranding=1&playsinline=1&origin=${window.location.origin}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              title={selectedLecture.title}
            />
          ) : (
            <>
              <img
                src={selectedLecture.thumbnail}
                className="w-full h-full object-cover opacity-50"
                alt=""
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                  <Play className="w-8 h-8 text-black fill-current" />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-black uppercase bg-primary/20 text-primary px-3 py-1 rounded-full">
            {selectedLecture.category}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {selectedLecture.duration}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            Otključano
          </span>
        </div>
        <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">
          {selectedLecture.title}
        </h1>
        <p className="text-muted-foreground text-lg mb-8 whitespace-pre-wrap">{selectedLecture.description}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-white mb-2">
            CREATOR <span className="text-primary font-permanent-marker normal-case tracking-normal">Akademija</span>
          </h1>
          <p className="text-muted-foreground text-xs uppercase tracking-widest max-w-md leading-relaxed mt-1">
            Nauči kako postati prepoznatljiv brend i gospodariti algoritmima društvenih mreža.
          </p>
        </div>
        {profile?.isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditCourseId(null);
                setNewCourse({});
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-full font-black text-xs hover:scale-105 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj Lekciju
            </button>
            <button
              onClick={notifyAll}
              disabled={notifying}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-full font-black text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <Bell className="w-3.5 h-3.5" />
              {notifying ? 'Slanje...' : 'Obavijesti članove'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {lectures.map((l) => {
          const locked = isLocked(l.daysToUnlock);
          return (
            <div
              key={l.id}
              onClick={() => {
                if (!locked) {
                  setSelectedLecture(l);
                  // Award +100 XP for first view!
                  const completedKey = `creator_mock_lecture_completed_${l.id}`;
                  if (!localStorage.getItem(completedKey)) {
                    localStorage.setItem(completedKey, 'true');
                    if (profile && updateLocalProfile) {
                      updateLocalProfile({ xp: profile.xp + 100 });
                      alert('🎉 Čestitamo! Osvojio si +100 Creator XP za započinjanje lekcije!');
                    }
                  }
                }
              }}
              className={cn(
                'ursa-card flex flex-col overflow-hidden group transition-all',
                locked
                  ? 'opacity-60 grayscale cursor-not-allowed'
                  : 'cursor-pointer hover:shadow-[0_0_30px_rgba(246,168,69,0.2)]',
              )}
            >
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={l.thumbnail} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt="" 
                />
                {locked ? (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10">
                    <Lock className="w-10 h-10 mb-3 text-white/50" />
                    <span className="text-xs font-black uppercase bg-black/50 text-white/80 px-4 py-1.5 rounded-full backdrop-blur-md">
                      {getTimeRemaining(l.daysToUnlock)}
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(212,255,0,0.5)] transform scale-50 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-8 h-8 text-black fill-current ml-1" />
                    </div>
                  </div>
                )}
                {profile?.isAdmin && (
                  <div className="absolute top-4 right-4 z-30 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCourseId(l.id);
                        setNewCourse(l);
                        setShowAddModal(true);
                      }}
                      className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full hover:bg-primary hover:text-black transition-colors uppercase"
                    >
                      Uredi
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(l.id);
                      }}
                      className="bg-red-500/60 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full hover:bg-red-500 transition-colors uppercase"
                    >
                      Obriši
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-6 flex flex-col flex-1 bg-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-black uppercase bg-primary text-black px-2 py-0.5 rounded-sm">
                    {l.category}
                  </span>
                  <span className="text-xs text-white/70 flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    {l.duration}
                  </span>
                </div>
                <h3 className="font-black text-xl mb-2 text-white group-hover:text-primary transition-colors leading-tight">
                  {l.title}
                </h3>
                <p className="text-white/60 text-sm line-clamp-2 whitespace-pre-wrap">{l.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => {setShowAddModal(false); setEditCourseId(null);}} />
          <div className="relative w-full max-w-md glass p-8 rounded-[2.5rem] border-primary/20 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {setShowAddModal(false); setEditCourseId(null);}}
              className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter text-white">
              {editCourseId ? 'Uredi' : 'Nova'} <span className="text-primary">Lekcija</span>
            </h2>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <input
                type="text"
                placeholder="Naslov"
                value={newCourse.title || ''}
                onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-primary text-white"
                required
              />
              <textarea
                placeholder="Opis"
                value={newCourse.description || ''}
                onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-primary text-white min-h-[120px]"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Dani za otklj."
                  value={newCourse.daysToUnlock || ''}
                  onChange={e => setNewCourse({...newCourse, daysToUnlock: Number(e.target.value)})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-primary text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Trajanje (npr 12:45)"
                  value={newCourse.duration || ''}
                  onChange={e => setNewCourse({...newCourse, duration: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-primary text-white"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Kategorija (Tag)"
                value={newCourse.category || ''}
                onChange={e => setNewCourse({...newCourse, category: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-primary text-white"
                required
              />
              <input
                type="text"
                placeholder="YouTube ID (opcionalno)"
                value={newCourse.youtubeId || ''}
                onChange={e => setNewCourse({...newCourse, youtubeId: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-primary text-white"
              />
              <div 
                className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:bg-white/5 transition-colors" 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    const syntheticEvent = { target: { files: [file] } } as any;
                    handleImageUpload(syntheticEvent);
                  }
                }}
              >
                {uploading ? (
                  <span className="text-sm font-bold text-primary">Prijenos u tijeku...</span>
                ) : newCourse.thumbnail ? (
                  <img src={newCourse.thumbnail} className="h-20 mx-auto rounded-lg object-cover" alt="Thumbnail" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm font-bold text-muted-foreground uppercase">Dodaj Thumbnail (Slika)</span>
                    <span className="text-[10px] text-muted-foreground">Klikni ili povuci sliku ovdje</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
              </div>
              <button 
                type="submit"
                disabled={addingCourse || uploading}
                className="w-full py-4 bg-primary text-black rounded-xl font-black text-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {addingCourse ? 'SPREMANJE...' : (editCourseId ? 'SPREMI PROMJENE' : 'DODAJ')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
