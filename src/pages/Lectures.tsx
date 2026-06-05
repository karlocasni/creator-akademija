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
  const [selectedCategory, setSelectedCategory] = useState<string>('SVE');
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
          className="mb-6 text-sm font-bold text-[#F5A500] hover:text-[#ffb31a] flex items-center gap-1 transition-colors"
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

  const categories = ['SVE', ...Array.from(new Set(lectures.map(l => l.category)))];
  const filteredLectures = selectedCategory === 'SVE' ? lectures : lectures.filter(l => l.category === selectedCategory);
  
  const featuredCourse = filteredLectures.length > 0 ? filteredLectures[0] : null;
  const regularCourses = filteredLectures.length > 1 ? filteredLectures.slice(1) : [];

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden pb-[24px]">
      {/* 2. PAGE HERO SECTION */}
      <div className="pt-[24px] px-[16px] flex flex-col">
        <h1 className="font-heading font-[800] text-[28px] text-[#FFFFFF] leading-[1.1] mb-[4px] uppercase flex items-center gap-2">
          <span>CREATOR</span>
          <span className="text-[#F5A500] font-marker font-normal tracking-normal mt-1">AKADEMIJA</span>
        </h1>
        <p className="font-sans font-[400] text-[14px] text-[#8B8FA8]">
          Nauči kako postati prepoznatljiv brend i gospodariti algoritmima.
        </p>

        {profile?.isAdmin && (
          <div className="flex items-center gap-[8px] mt-[16px]">
            <button
              onClick={() => {
                setEditCourseId(null);
                setNewCourse({});
                setShowAddModal(true);
              }}
              className="flex items-center gap-[8px] px-[16px] py-[8px] bg-[#F5A500] text-[#0A0A0F] rounded-full font-heading font-[700] text-[12px] hover:scale-105 transition-transform"
            >
              <Plus className="w-[14px] h-[14px]" />
              Dodaj Lekciju
            </button>
            <button
              onClick={notifyAll}
              disabled={notifying}
              className="flex items-center gap-[8px] px-[16px] py-[8px] bg-[rgba(255,255,255,0.05)] text-[#FFFFFF] rounded-full font-heading font-[700] text-[12px] hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50"
            >
              <Bell className="w-[14px] h-[14px]" />
              {notifying ? 'Slanje...' : 'Obavijesti članove'}
            </button>
          </div>
        )}
      </div>

      {/* 3. CATEGORY FILTER TABS */}
      <div className="py-[16px] pl-[16px] flex gap-[8px] overflow-x-auto scrollbar-hidden">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-[18px] py-[8px] rounded-full font-sans font-[600] text-[13px] border-[1.5px] cursor-pointer whitespace-nowrap transition-colors",
              selectedCategory === cat
                ? "bg-[rgba(245,165,0,0.12)] border-[#F5A500] text-[#F5A500]"
                : "bg-transparent border-[rgba(255,255,255,0.06)] text-[#8B8FA8]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. FEATURED COURSE */}
      {featuredCourse && (
        <div 
          className="mx-[16px] mb-[12px] rounded-[20px] overflow-hidden relative group cursor-pointer"
          onClick={() => {
            if (!isLocked(featuredCourse.daysToUnlock)) {
              setSelectedLecture(featuredCourse);
            }
          }}
        >
          {profile?.isAdmin && (
            <div className="absolute top-[16px] right-[16px] z-30 flex gap-[8px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditCourseId(featuredCourse.id);
                  setNewCourse(featuredCourse);
                  setShowAddModal(true);
                }}
                className="bg-[#0A0A0F]/60 backdrop-blur-md text-[#FFFFFF] text-[10px] font-heading font-[800] px-[12px] py-[6px] rounded-full hover:bg-[#F5A500] hover:text-[#0A0A0F] transition-colors uppercase"
              >
                Uredi
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCourse(featuredCourse.id);
                }}
                className="bg-[#EF4444]/60 backdrop-blur-md text-[#FFFFFF] text-[10px] font-heading font-[800] px-[12px] py-[6px] rounded-full hover:bg-[#EF4444] transition-colors uppercase"
              >
                Obriši
              </button>
            </div>
          )}

          <img 
            src={featuredCourse.thumbnail} 
            className={cn("w-full h-[180px] object-cover transition-transform duration-700 group-hover:scale-105", isLocked(featuredCourse.daysToUnlock) && "opacity-60 grayscale")} 
            alt={featuredCourse.title} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(10,10,15,0.3)] to-[rgba(10,10,15,0.95)]" />
          
          {isLocked(featuredCourse.daysToUnlock) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <Lock className="w-[40px] h-[40px] mb-[12px] text-[#FFFFFF]/50" />
              <span className="text-[12px] font-sans font-[700] uppercase bg-[#0A0A0F]/50 text-[#FFFFFF]/80 px-[16px] py-[6px] rounded-full backdrop-blur-md">
                {getTimeRemaining(featuredCourse.daysToUnlock)}
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 bg-[#F5A500]/0 group-hover:bg-[#F5A500]/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
              <div className="w-[64px] h-[64px] bg-[#F5A500] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,165,0,0.5)] transform scale-50 group-hover:scale-100 transition-transform duration-300">
                <Play className="w-[32px] h-[32px] text-[#0A0A0F] fill-current ml-[4px]" />
              </div>
            </div>
          )}

          <div className="absolute bottom-0 w-full p-[16px] flex flex-col items-start z-10">
            <span className="tag-category mb-[8px] bg-[rgba(245,165,0,0.12)] text-[#F5A500]">{featuredCourse.category}</span>
            <h2 className="font-heading font-[700] text-[24px] text-[#FFFFFF] leading-tight line-clamp-2">
              {featuredCourse.title}
            </h2>
            <div className="flex items-center gap-[6px] mt-[8px]">
              <Clock className="w-[14px] h-[14px] text-[#4A4A5A]" />
              <span className="font-mono text-[11px] text-[#4A4A5A]">{featuredCourse.duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. COURSE LIST */}
      <div className="flex flex-col gap-[12px] px-[16px]">
        {regularCourses.map((l) => {
          const locked = isLocked(l.daysToUnlock);
          return (
            <div
              key={l.id}
              onClick={() => {
                if (!locked) setSelectedLecture(l);
              }}
              className={cn(
                "bg-[#111116] rounded-[16px] border border-[rgba(255,255,255,0.06)] flex items-center gap-[14px] p-[14px] overflow-hidden transition-colors cursor-pointer group",
                locked ? "opacity-60 grayscale cursor-not-allowed" : "hover:border-[#F5A500]/50"
              )}
            >
              <div className="relative w-[90px] h-[70px] rounded-[12px] overflow-hidden flex-shrink-0">
                {profile?.isAdmin && (
                  <div className="absolute top-[4px] right-[4px] z-30 flex flex-col gap-[4px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCourseId(l.id);
                        setNewCourse(l);
                        setShowAddModal(true);
                      }}
                      className="bg-[#0A0A0F]/60 backdrop-blur-md text-[#FFFFFF] text-[8px] font-heading font-[800] px-[6px] py-[2px] rounded-full hover:bg-[#F5A500] hover:text-[#0A0A0F] transition-colors uppercase"
                    >
                      Uredi
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(l.id);
                      }}
                      className="bg-[#EF4444]/60 backdrop-blur-md text-[#FFFFFF] text-[8px] font-heading font-[800] px-[6px] py-[2px] rounded-full hover:bg-[#EF4444] transition-colors uppercase"
                    >
                      Obriši
                    </button>
                  </div>
                )}
                <img 
                  src={l.thumbnail} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt={l.title} 
                />
                {locked ? (
                  <div className="absolute inset-0 bg-[#0A0A0F]/60 flex items-center justify-center">
                    <Lock className="w-[20px] h-[20px] text-[#FFFFFF]/50" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-transparent group-hover:bg-[#0A0A0F]/20 flex items-center justify-center transition-colors">
                    <Play className="w-[24px] h-[24px] text-[#FFFFFF] opacity-0 group-hover:opacity-100 fill-current" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <span className="tag-category self-start mb-[6px] bg-[rgba(255,255,255,0.05)] text-[#8B8FA8]">{l.category}</span>
                <h3 className="font-heading font-[700] text-[15px] text-[#FFFFFF] leading-[1.2] whitespace-nowrap overflow-hidden text-ellipsis">
                  {l.title}
                </h3>
                <div className="flex items-center gap-[6px] mt-[6px]">
                  <Clock className="w-[12px] h-[12px] text-[#4A4A5A]" />
                  <span className="font-mono text-[11px] text-[#4A4A5A]">{locked ? getTimeRemaining(l.daysToUnlock) : l.duration}</span>
                </div>
              </div>

              <ChevronRight className="w-[20px] h-[20px] text-[#4A4A5A] flex-shrink-0" />
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
