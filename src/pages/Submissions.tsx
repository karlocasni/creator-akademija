import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, onSnapshot, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { createNotification } from '../lib/notifications';
import { cn } from '../lib/utils';
import { 
  Upload, Video, CheckCircle2, AlertCircle, Clock, Award, MessageSquare, 
  ChevronRight, X, Star, ExternalLink, ShieldCheck, Globe, Lock, Play, 
  Sparkles, Filter, Trash2, Edit3, Link as LinkIcon, FileVideo, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Lecture {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
}

export interface VideoSubmission {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  lectureId: string;
  lectureTitle: string;
  videoLink: string;
  videoFileUrl?: string;
  description?: string;
  isPublic: boolean; // Checked = visible to everyone once graded; Unchecked = private (only student and mentor)
  status: 'pending' | 'graded';
  grade?: number; // 1 to 5
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  createdAt: string;
}

// Helper to render responsive video embed or link
function VideoPlayer({ url, title }: { url: string; title?: string }) {
  if (!url) return null;

  // YouTube embed
  const ytMatch = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11})/);
  if (ytMatch && ytMatch[1]) {
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-lg">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&playsinline=1`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || 'Video submission'}
        />
      </div>
    );
  }

  // Loom embed
  const loomMatch = url.match(/(?:loom\.com\/(?:share|embed)\/)([a-zA-Z0-9]+)/);
  if (loomMatch && loomMatch[1]) {
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-lg">
        <iframe
          src={`https://www.loom.com/embed/${loomMatch[1]}`}
          className="w-full h-full border-0"
          allowFullScreen
          title={title || 'Loom submission'}
        />
      </div>
    );
  }

  // Direct video file (mp4, webm, mov, or firebase storage)
  const isDirectVideo = url.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i) || url.includes('firebasestorage.googleapis.com');
  if (isDirectVideo) {
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg">
        <video 
          src={url} 
          controls 
          playsInline
          className="w-full h-full object-contain"
        >
          Vaš preglednik ne podržava reprodukciju videa.
        </video>
      </div>
    );
  }

  // Generic link fallback button
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all group"
    >
      <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
      <span>Otvori video ({url.length > 35 ? url.slice(0, 35) + '...' : url})</span>
      <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
    </a>
  );
}

export default function Submissions() {
  const { user: currentUser, profile, updateLocalProfile } = useAuth();
  const isAdmin = profile?.isAdmin === true;

  const [courses, setCourses] = useState<Lecture[]>([]);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'novi' | 'moje' | 'pending' | 'graded' | 'community'>(
    isAdmin ? 'pending' : 'novi'
  );

  // Form states (Student)
  const [selectedLectureId, setSelectedLectureId] = useState('');
  const [uploadMode, setUploadMode] = useState<'link' | 'file'>('link');
  const [videoLink, setVideoLink] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true); // default true for community learning, but user can uncheck for private
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Grading states (Mentor / Admin)
  const [selectedSubmission, setSelectedSubmission] = useState<VideoSubmission | null>(null);
  const [grade, setGrade] = useState<number>(5);
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  // Community filter
  const [communityFilterGrade, setCommunityFilterGrade] = useState<number | 'all'>('all');

  useEffect(() => {
    // Load courses for dropdown selection
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      if (snap.empty) {
        import('../lib/firebase-mock').then(({ SEED_COURSES }) => {
          setCourses(SEED_COURSES as any[]);
        });
      } else {
        setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
      }
    }, (err) => {
      console.warn('[Submissions] Courses fetch error, using mock fallback:', err);
      import('../lib/firebase-mock').then(({ SEED_COURSES }) => {
        setCourses(SEED_COURSES as any[]);
      });
    });

    // Load submissions live
    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snap) => {
      const all = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // default isPublic to false if not explicitly set on legacy submissions
          isPublic: data.isPublic !== undefined ? data.isPublic : false
        } as VideoSubmission;
      });
      // Sort: newest first
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubmissions(all);
    }, (err) => {
      console.warn('[Submissions] Submissions fetch error, using empty fallback:', err);
      setSubmissions([]);
    });

    return () => {
      unsubCourses();
      unsubSubmissions();
    };
  }, []);

  const handleFileUploadAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profile) return;
    if (!selectedLectureId) {
      alert('Molimo odaberite seminar ili temu.');
      return;
    }

    let finalVideoUrl = videoLink.trim();

    if (uploadMode === 'file') {
      if (!uploadFile) {
        alert('Molimo odaberite video datoteku za prijenos.');
        return;
      }
    } else {
      if (!finalVideoUrl) {
        alert('Molimo unesite poveznicu na video.');
        return;
      }
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      // If user is uploading a video file directly
      if (uploadMode === 'file' && uploadFile) {
        setUploadProgress(10);
        try {
          const storageRef = ref(storage, `submissions/${currentUser.uid}/${Date.now()}_${uploadFile.name}`);
          const uploadTask = uploadBytesResumable(storageRef, uploadFile);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setUploadProgress(prog);
              },
              (err) => {
                console.warn('Storage upload error, continuing fallback:', err);
                // Fallback for mock/local environments without actual storage bucket configured
                finalVideoUrl = URL.createObjectURL(uploadFile);
                resolve();
              },
              async () => {
                try {
                  finalVideoUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve();
                } catch {
                  finalVideoUrl = URL.createObjectURL(uploadFile);
                  resolve();
                }
              }
            );
          });
        } catch (uploadErr) {
          console.warn('Upload fallback to object URL:', uploadErr);
          finalVideoUrl = URL.createObjectURL(uploadFile);
        }
      }

      const selectedCourse = courses.find(c => c.id === selectedLectureId);
      const lectureTitle = selectedCourse 
        ? selectedCourse.title 
        : (selectedLectureId === 'custom' ? 'Slobodni rad / Vlastiti projekt' : 'Opći video uradak');

      const submissionData = {
        userId: currentUser.uid,
        username: profile.username || 'Kreator',
        userAvatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
        lectureId: selectedLectureId,
        lectureTitle,
        videoLink: finalVideoUrl,
        description: description.trim(),
        isPublic: Boolean(isPublic),
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      // Add document to Firestore
      await addDoc(collection(db, 'submissions'), submissionData);

      // Increment student's weekly post count
      const newPostCount = (profile.weeklyPostCount || 0) + 1;
      updateLocalProfile({ weeklyPostCount: newPostCount });

      setSubmitSuccess(true);
      setSelectedLectureId('');
      setVideoLink('');
      setDescription('');
      setUploadFile(null);
      setUploadProgress(null);
      setIsPublic(true);

      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('moje');
      }, 2000);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Došlo je do pogreške pri predaji videa.');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedSubmission) return;

    setGrading(true);

    try {
      const subRef = doc(db, 'submissions', selectedSubmission.id);
      await setDoc(subRef, {
        status: 'graded',
        grade,
        feedback: feedback.trim(),
        gradedBy: profile.username || 'Mentor',
        gradedAt: new Date().toISOString()
      }, { merge: true });

      // Award XP to student (+100 XP)
      try {
        const studentRef = doc(db, 'profiles', selectedSubmission.userId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          await setDoc(studentRef, {
            xp: (studentData.xp || 0) + 100
          }, { merge: true });
        }
      } catch (xpErr) {
        console.warn('XP update error:', xpErr);
      }

      // Send notification to student
      await createNotification({
        recipientId: selectedSubmission.userId,
        senderId: currentUser?.uid || 'system',
        senderName: profile.username || 'Mentor',
        senderAvatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
        type: 'comment',
        message: `Mentor ${profile.username} je ocijenio tvoj video za: ${selectedSubmission.lectureTitle} (Ocjena: ${grade}/5)`,
        postId: null
      });

      setSelectedSubmission(null);
      setFeedback('');
      setGrade(5);
    } catch (err) {
      console.error('Grading failed:', err);
      alert('Došlo je do pogreške pri ocjenjivanju.');
    } finally {
      setGrading(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('Jeste li sigurni da želite obrisati ovu predaju?')) return;
    try {
      await deleteDoc(doc(db, 'submissions', id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Pogreška pri brisanju predaje.');
    }
  };

  // Submissions subsets
  const studentSubmissions = submissions.filter(s => s.userId === currentUser?.uid);
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');
  
  // Public community submissions (MUST be graded and user consented to isPublic = true)
  const communitySubmissions = submissions.filter(s => s.status === 'graded' && s.isPublic === true);
  const filteredCommunitySubmissions = communitySubmissions.filter(s => {
    if (communityFilterGrade === 'all') return true;
    return s.grade === communityFilterGrade;
  });

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto pb-28 text-left">
      {/* Header */}
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Creator Akademija Feedback Sustav</span>
        </div>
        <h1 className="font-heading font-[800] text-3xl md:text-5xl tracking-tighter uppercase text-white">
          PREDAJA I <span className="text-primary">OCJENA VIDEA</span>
        </h1>
        <p className="text-[#8B8FA8] text-xs md:text-sm uppercase tracking-widest mt-1">
          {isAdmin 
            ? 'Pregledaj i ocijeni studentske video uratke za seminarska predavanja s ocjenom 1-5 i komentarom.' 
            : 'Predaj svoje uratke, preuzmi povratne informacije mentora ili uči iz javnih radova zajednice.'}
        </p>
      </header>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-1 p-1 bg-[#151E30] rounded-2xl border border-white/5 mb-8">
        {!isAdmin ? (
          <>
            <button
              onClick={() => setActiveTab('novi')}
              className={cn(
                "flex-1 min-w-[120px] py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'novi' ? 'bg-[#3B82F6] text-white font-black shadow-lg shadow-blue-500/20' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Upload className="w-4 h-4" />
              Predaj Video
            </button>
            <button
              onClick={() => setActiveTab('moje')}
              className={cn(
                "flex-1 min-w-[120px] py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'moje' ? 'bg-[#3B82F6] text-white font-black shadow-lg shadow-blue-500/20' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Video className="w-4 h-4" />
              Moje Ocjene ({studentSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={cn(
                "flex-1 min-w-[120px] py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'community' ? 'bg-[#3B82F6] text-white font-black shadow-lg shadow-blue-500/20' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Globe className="w-4 h-4" />
              Javni Radovi ({communitySubmissions.length})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                "flex-1 min-w-[120px] py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'pending' ? 'bg-[#3B82F6] text-white font-black shadow-lg shadow-blue-500/20' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Clock className="w-4 h-4" />
              Na Čekanju ({pendingSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('graded')}
              className={cn(
                "flex-1 min-w-[120px] py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'graded' ? 'bg-[#3B82F6] text-white font-black shadow-lg shadow-blue-500/20' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              Ocijenjeno ({gradedSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={cn(
                "flex-1 min-w-[120px] py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'community' ? 'bg-[#3B82F6] text-white font-black shadow-lg shadow-blue-500/20' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Globe className="w-4 h-4" />
              Javni Radovi ({communitySubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('novi')}
              className={cn(
                "flex-1 min-w-[120px] py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'novi' ? 'bg-[#3B82F6] text-white font-black shadow-lg shadow-blue-500/20' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Upload className="w-4 h-4" />
              Predaj Video
            </button>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. STUDENT SUBMIT FORM TAB ('novi')                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'novi' && (
        <div className="ursa-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-xl font-bold text-white uppercase flex items-center gap-2">
              <Upload className="text-primary w-5 h-5" /> PREDAJ NOVI VIDEO URADAK
            </h2>
            <span className="text-xs text-muted-foreground font-mono">Mentor ocjenjuje 1-5★</span>
          </div>
          
          {submitSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3 font-bold text-sm uppercase tracking-wide animate-pulse">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <p>Video je uspješno predan na ocjenjivanje!</p>
                <p className="text-xs text-emerald-400/80 font-normal">Preusmjeravamo na vaše predaje...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleFileUploadAndSubmit} className="space-y-6">
            {/* Lecture Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                Odaberi Seminar / Lekciju <span className="text-primary">*</span>
              </label>
              <select
                value={selectedLectureId}
                onChange={e => setSelectedLectureId(e.target.value)}
                required
                className="w-full bg-[#0F172A] border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white appearance-none"
              >
                <option value="" className="bg-black text-muted-foreground">-- Izaberi predavanje ili temu --</option>
                <option value="custom" className="bg-black text-primary font-bold">★ Slobodna tema / Vlastiti autorski video</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id} className="bg-black text-white">
                    [{course.category}] {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Video Input Mode Switcher (Link vs File) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                  Video Uradak <span className="text-primary">*</span>
                </label>
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setUploadMode('link')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
                      uploadMode === 'link' ? "bg-[#3B82F6] text-white" : "text-[#8B8FA8] hover:text-white"
                    )}
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> Video Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
                      uploadMode === 'file' ? "bg-[#3B82F6] text-white" : "text-[#8B8FA8] hover:text-white"
                    )}
                  >
                    <FileVideo className="w-3.5 h-3.5" /> Datoteka (.mp4)
                  </button>
                </div>
              </div>

              {uploadMode === 'link' ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    required
                    value={videoLink}
                    onChange={e => setVideoLink(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... ili TikTok / Loom / Google Drive link"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white placeholder:text-muted-foreground/40 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground ml-1">
                    Podržani formati: YouTube, Loom, TikTok, Instagram Reels, Google Drive ili direktni video link.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white/[0.02]">
                    <Upload className="w-8 h-8 text-primary mb-2 opacity-80" />
                    <span className="text-sm font-bold text-white">
                      {uploadFile ? uploadFile.name : 'Kliknite za odabir video datoteke'}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">MP4, WebM ili MOV (maks. 250MB)</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-primary font-bold">
                        <span>Prijenos videa...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes / Description */}
            <div className="space-y-2">
              <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                Bilješke za Mentora (Opcionalno)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Napiši ako želiš mentoru skrenuti pažnju na specifičan dio videa, hook, problem pri kadriranju, ritam montaže ili titlove..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white resize-none placeholder:text-muted-foreground/40 text-sm"
              />
            </div>

            {/* PUBLIC / PRIVATE SHARING CHECKBOX */}
            <div 
              onClick={() => setIsPublic(!isPublic)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 select-none",
                isPublic 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-white" 
                  : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/[0.07]"
              )}
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black uppercase tracking-wider text-white">
                    Podijeli sa zajednicom (Javno)
                  </span>
                  {isPublic ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Javno
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Privatno
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8B8FA8] leading-relaxed">
                  {isPublic ? (
                    <>
                      <strong className="text-emerald-400">Označeno:</strong> Kada mentor ocijeni ovaj video, tvoj rad, ocjena (1-5★) i mentorov komentar bit će vidljivi svim članovima u kartici <strong>"Javni Radovi"</strong> kako bi svi mogli učiti iz primjera.
                    </>
                  ) : (
                    <>
                      <strong className="text-amber-400">Neoznačeno (Privatno):</strong> Samo ti i mentor vidite ovaj video. Kada mentor ocijeni i komentira video, <strong>isključivo ti</strong> ćeš imati uvid u ocjenu i povratne informacije.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base md:text-lg hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-50 shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  PREDAJEM VIDEO...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  PREDAJ VIDEO ZA OCJENJIVANJE
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. STUDENT MY GRADES TAB ('moje')                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'moje' && (
        studentSubmissions.length === 0 ? (
          <div className="ursa-card p-12 text-center border border-white/5 space-y-4">
            <Video className="w-12 h-12 text-[#8B8FA8] mx-auto opacity-40" />
            <h3 className="text-lg font-bold text-white uppercase">Nema predanih videa</h3>
            <p className="text-muted-foreground text-xs md:text-sm max-w-md mx-auto">
              Još nisi predaj niti jedan video za ocjenjivanje. Predaj svoj prvi video uradak i preuzmi ocjenu i savjete od mentora!
            </p>
            <button
              onClick={() => setActiveTab('novi')}
              className="px-6 py-3 bg-[#3B82F6] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 transition-transform"
            >
              Predaj prvi video
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {studentSubmissions.map((sub) => (
              <div key={sub.id} className="ursa-card p-6 md:p-8 border border-white/5 space-y-6 hover:border-white/15 transition-all">
                {/* Header & Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full",
                      sub.status === 'pending' 
                        ? 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    )}>
                      {sub.status === 'pending' ? 'Na čekanju pregleda' : 'Ocijenjeno'}
                    </span>

                    {sub.isPublic ? (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Javno za zajednicu
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Privatno (Samo ti i mentor)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                    <span>Predano: {new Date(sub.createdAt).toLocaleDateString('hr-HR')}</span>
                    {sub.status === 'pending' && (
                      <button 
                        onClick={() => handleDeleteSubmission(sub.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Obriši predaju"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lecture Title & Notes */}
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{sub.lectureTitle}</h3>
                  {sub.description && (
                    <p className="text-xs text-[#8B8FA8] italic bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      "{sub.description}"
                    </p>
                  )}
                </div>

                {/* Video Player */}
                <div className="max-w-2xl">
                  <VideoPlayer url={sub.videoLink} title={sub.lectureTitle} />
                </div>

                {/* Graded Feedback Box */}
                {sub.status === 'graded' ? (
                  <div className="mt-6 p-6 bg-[#101726] border border-[#3B82F6]/20 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-[#3B82F6]" />
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">
                            Povratne informacije mentora ({sub.gradedBy})
                          </h4>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Ocijenjeno: {sub.gradedAt ? new Date(sub.gradedAt).toLocaleDateString('hr-HR') : ''}
                          </span>
                        </div>
                      </div>

                      {/* Stars Rating */}
                      <div className="flex items-center gap-2 bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-4 py-2 rounded-xl">
                        <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Ocjena:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={cn(
                                "w-4 h-4",
                                star <= (sub.grade || 0) 
                                  ? "text-yellow-400 fill-yellow-400" 
                                  : "text-white/20"
                              )} 
                            />
                          ))}
                        </div>
                        <span className="text-lg font-black text-[#3B82F6] ml-1">{sub.grade}/5</span>
                      </div>
                    </div>

                    <p className="text-sm text-[#CCCCCC] whitespace-pre-wrap leading-relaxed">
                      {sub.feedback || 'Mentor nije ostavio pisani komentar.'}
                    </p>

                    <div className="pt-2 text-[11px] text-[#8B8FA8] flex items-center gap-1.5">
                      {sub.isPublic ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ovaj rad je označen kao javan i prikazan je u zajedničkim radovima.</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ovaj rad je privatan — ocjena i komentar vidljivi su isključivo tebi i mentoru.</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4 text-[#3B82F6] animate-spin" />
                    <span>Video je na čekanju. Mentor će ga uskoro pregledati i ocijeniti s komentarom.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. COMMUNITY PUBLIC SHOWCASE TAB ('community')                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'community' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 bg-gradient-to-r from-blue-900/20 via-indigo-950/30 to-purple-900/20 border border-white/10 rounded-3xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
                  <Globe className="text-primary w-5 h-5" /> JAVNI RADOVI & ANALIZE MENTORA
                </h2>
                <p className="text-xs text-[#8B8FA8] mt-1">
                  Pregledaj ocijenjene video uratke koje su članovi podijelili sa zajednicom. Uči iz komentara mentora i primjera!
                </p>
              </div>

              {/* Filter by Grade */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5 self-start md:self-center">
                <span className="text-[11px] font-bold text-muted-foreground px-2 uppercase font-mono">Ocjena:</span>
                <button
                  onClick={() => setCommunityFilterGrade('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors",
                    communityFilterGrade === 'all' ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                  )}
                >
                  Sve
                </button>
                {[5, 4, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => setCommunityFilterGrade(num)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1",
                      communityFilterGrade === num ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    {num} <Star className="w-3 h-3 fill-current text-yellow-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredCommunitySubmissions.length === 0 ? (
            <div className="ursa-card p-12 text-center border border-white/5 space-y-3">
              <Globe className="w-10 h-10 text-[#8B8FA8] mx-auto opacity-40" />
              <p className="text-muted-foreground text-sm font-medium">
                Trenutno nema javnih radova s odabranim filtrom.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredCommunitySubmissions.map((sub) => (
                <div key={sub.id} className="ursa-card p-6 md:p-8 border border-white/5 space-y-6 hover:border-white/15 transition-all">
                  {/* Author and Lecture Info */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={sub.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.username}`} 
                        alt={sub.username} 
                        className="w-10 h-10 rounded-full border border-white/10 object-cover" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{sub.username}</h4>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Javni rad
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                          {sub.lectureTitle} • {new Date(sub.createdAt).toLocaleDateString('hr-HR')}
                        </p>
                      </div>
                    </div>

                    {/* Grade score display */}
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-2xl">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={cn(
                              "w-3.5 h-3.5",
                              star <= (sub.grade || 0) 
                                ? "text-yellow-400 fill-yellow-400" 
                                : "text-white/20"
                            )} 
                          />
                        ))}
                      </div>
                      <span className="text-base font-black text-emerald-400">{sub.grade}/5</span>
                    </div>
                  </div>

                  {/* Video Embed */}
                  <div className="max-w-2xl">
                    <VideoPlayer url={sub.videoLink} title={sub.lectureTitle} />
                  </div>

                  {sub.description && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bilješka studenta:</span>
                      <p className="text-xs text-[#8B8FA8] italic">"{sub.description}"</p>
                    </div>
                  )}

                  {/* Mentor Feedback Review */}
                  {sub.feedback && (
                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          Komentar mentora ({sub.gradedBy || 'Mentor'}):
                        </span>
                      </div>
                      <p className="text-sm text-[#CCCCCC] whitespace-pre-wrap leading-relaxed">{sub.feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MENTOR / ADMIN PENDING TAB ('pending')                     */}
      {/* ------------------------------------------------------------- */}
      {isAdmin && activeTab === 'pending' && (
        pendingSubmissions.length === 0 ? (
          <div className="ursa-card p-12 text-center border border-white/5 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-50" />
            <h3 className="text-lg font-bold text-white uppercase">Sve je ocijenjeno!</h3>
            <p className="text-muted-foreground text-sm">Trenutno nema novih predaja koje čekaju na ocjenjivanje.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSubmissions.map((sub) => (
              <div key={sub.id} className="ursa-card p-6 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/15 transition-all">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={sub.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.username}`} 
                      alt={sub.username} 
                      className="w-9 h-9 rounded-full border border-white/10" 
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{sub.username}</h4>
                        {sub.isPublic ? (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Javno
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Privatno
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                        Predano: {new Date(sub.createdAt).toLocaleDateString('hr-HR')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-primary uppercase">{sub.lectureTitle}</h3>
                    {sub.description && (
                      <p className="text-xs text-[#8B8FA8] italic mt-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        "{sub.description}"
                      </p>
                    )}
                  </div>

                  <a 
                    href={sub.videoLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-bold"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Pogledaj video poveznicu <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Grade Action Button */}
                <div className="flex gap-2 shrink-0 self-start md:self-center">
                  <button 
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setGrade(5);
                      setFeedback('');
                    }}
                    className="px-6 py-3 bg-[#3B82F6] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
                  >
                    <Star className="w-4 h-4 fill-white" />
                    Ocijeni Video
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MENTOR / ADMIN GRADED TAB ('graded')                       */}
      {/* ------------------------------------------------------------- */}
      {isAdmin && activeTab === 'graded' && (
        gradedSubmissions.length === 0 ? (
          <div className="ursa-card p-12 text-center border border-white/5 space-y-3">
            <Clock className="w-10 h-10 text-[#8B8FA8] mx-auto opacity-50" />
            <p className="text-muted-foreground text-sm font-medium">Još niste ocijenili niti jednu video predaju.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gradedSubmissions.map((sub) => (
              <div key={sub.id} className="ursa-card p-6 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/15 transition-all">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={sub.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.username}`} 
                      alt={sub.username} 
                      className="w-9 h-9 rounded-full border border-white/10" 
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{sub.username}</h4>
                        {sub.isPublic ? (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Javno
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Privatno
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                        Ocijenjeno: {sub.gradedAt ? new Date(sub.gradedAt).toLocaleDateString('hr-HR') : ''}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white uppercase">{sub.lectureTitle}</h3>
                  <a href={sub.videoLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#3B82F6] hover:underline">
                    Gledaj video <ExternalLink className="w-3 h-3" />
                  </a>

                  {sub.feedback && (
                    <div className="mt-2 p-3.5 bg-white/5 rounded-xl text-xs text-[#CCCCCC] border border-white/5 space-y-1">
                      <span className="font-bold text-white block">Tvoj komentar:</span>
                      <p className="whitespace-pre-wrap">{sub.feedback}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col items-center justify-center w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Ocjena</span>
                    <span className="text-3xl font-black text-emerald-400 mt-0.5">{sub.grade}</span>
                    <span className="text-[9px] text-muted-foreground">od 5</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setGrade(sub.grade || 5);
                      setFeedback(sub.feedback || '');
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-muted-foreground hover:text-white transition-colors"
                    title="Uredi ocjenu ili komentar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. ADMIN GRADING MODAL                                        */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-background/85 backdrop-blur-xl" onClick={() => setSelectedSubmission(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-[#151E30] border border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[92vh] text-left"
            >
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Mentor Ocjenjivanje</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-1">
                Ocijeni <span className="text-primary">Video Uradak</span>
              </h2>
              
              {/* Submission info header */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-6">
                <span className="text-white font-bold">{selectedSubmission.username}</span>
                <span>•</span>
                <span>{selectedSubmission.lectureTitle}</span>
                <span>•</span>
                {selectedSubmission.isPublic ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Korisnik želi javno dijeljenje
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Privatno (Samo student i ti)
                  </span>
                )}
              </div>

              {/* Video Preview in modal */}
              <div className="mb-6">
                <VideoPlayer url={selectedSubmission.videoLink} title={selectedSubmission.lectureTitle} />
              </div>

              {selectedSubmission.description && (
                <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Bilješka studenta:
                  </span>
                  <p className="text-xs text-[#8B8FA8] italic mt-0.5">"{selectedSubmission.description}"</p>
                </div>
              )}

              <form onSubmit={handleGradeSubmit} className="space-y-6">
                {/* 1 - 5 Star Rating selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase ml-1 flex items-center justify-between">
                    <span>Odaberi Ocjenu (1 - 5)</span>
                    <span className="text-primary font-bold">{grade} od 5 zvjezdica</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGrade(num)}
                        className={cn(
                          "py-3.5 rounded-2xl font-heading font-black text-base md:text-lg transition-all flex flex-col items-center justify-center gap-1 border",
                          grade === num 
                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105" 
                            : "bg-white/5 border-white/5 text-[#8B8FA8] hover:bg-white/10 hover:border-white/10"
                        )}
                      >
                        <span>{num}</span>
                        <Star className={cn("w-4 h-4 fill-current", grade >= num ? "text-yellow-400" : "text-[#8B8FA8]/30")} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mentor Feedback Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase ml-1">
                    Komentar / Detaljne Povratne Informacije <span className="text-primary">*</span>
                  </label>
                  <textarea
                    required
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    rows={5}
                    placeholder="Analiziraj video: ocijeni prve 3 sekunde (hook), ritam i kadriranje, titlove, zvuk/glazbu i daj konkretan savjet za poboljšanje..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white resize-none text-sm placeholder:text-muted-foreground/40 leading-relaxed"
                  />
                </div>

                {/* Privacy Reminder */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-2 text-[11px] text-[#8B8FA8]">
                  {selectedSubmission.isPublic ? (
                    <>
                      <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Ovaj video je postavljen kao <strong>Javan</strong>. Ocjena i komentar bit će vidljivi svim polaznicima u kartici Javni Radovi.</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Ovaj video je postavljen kao <strong>Privatan</strong>. Tvoja ocjena i komentar bit će vidljivi <strong>isključivo ovom studentu</strong>.</span>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={grading}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base md:text-lg hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  {grading ? 'SPREMANJE OCJENE...' : 'SPREMI OCJENU I KOMENTAR (+100 XP Studentu)'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
