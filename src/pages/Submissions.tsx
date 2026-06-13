import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { createNotification } from '../lib/notifications';
import { cn } from '../lib/utils';
import { Upload, Video, CheckCircle2, AlertCircle, Clock, Award, MessageSquare, ChevronRight, X, Star, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Lecture {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
}

interface VideoSubmission {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  lectureId: string;
  lectureTitle: string;
  videoLink: string;
  description?: string;
  status: 'pending' | 'graded';
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  createdAt: string;
}

export default function Submissions() {
  const { user: currentUser, profile, updateLocalProfile } = useAuth();
  const isAdmin = profile?.isAdmin === true;

  const [courses, setCourses] = useState<Lecture[]>([]);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'novi' | 'moje' | 'pending' | 'graded'>(isAdmin ? 'pending' : 'novi');

  // Form states (Student)
  const [selectedLectureId, setSelectedLectureId] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Grading states (Mentor)
  const [selectedSubmission, setSelectedSubmission] = useState<VideoSubmission | null>(null);
  const [grade, setGrade] = useState<number>(5);
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    // Load courses for selection
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
    }, (err) => {
      console.warn('[Submissions] Courses fetch error, using mock fallback:', err);
      import('../lib/firebase-mock').then(({ SEED_COURSES }) => {
        setCourses(SEED_COURSES as any[]);
      });
    });

    // Load submissions
    const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoSubmission));
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

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !profile) return;
    if (!selectedLectureId || !videoLink) return;

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      const selectedCourse = courses.find(c => c.id === selectedLectureId);
      const submissionData = {
        userId: currentUser.uid,
        username: profile.username,
        userAvatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
        lectureId: selectedLectureId,
        lectureTitle: selectedCourse ? selectedCourse.title : 'Nepoznat seminar',
        videoLink: videoLink.trim(),
        description: description.trim(),
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      // Add to database
      await addDoc(collection(db, 'submissions'), submissionData);

      // Increment student's weeklyGoal post count
      const newPostCount = (profile.weeklyPostCount || 0) + 1;
      updateLocalProfile({ weeklyPostCount: newPostCount });

      setSubmitSuccess(true);
      setSelectedLectureId('');
      setVideoLink('');
      setDescription('');
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Došlo je do pogreške pri predaji videa.');
    } finally {
      setSubmitting(false);
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
        gradedBy: profile.username,
        gradedAt: new Date().toISOString()
      }, { merge: true });

      // Award XP to the student (+100 XP for video completion!)
      const studentRef = doc(db, 'profiles', selectedSubmission.userId);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        await setDoc(studentRef, {
          xp: (studentData.xp || 0) + 100
        }, { merge: true });
      }

      // Send notification to student
      await createNotification({
        recipientId: selectedSubmission.userId,
        senderId: currentUser?.uid || 'system',
        senderName: profile.username,
        senderAvatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
        type: 'comment',
        message: `Mentor ${profile.username} je ocijenio tvoj video za predavanje: ${selectedSubmission.lectureTitle} (Ocijena: ${grade}/5)`,
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

  const studentSubmissions = submissions.filter(s => s.userId === currentUser?.uid);
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');

  return (
    <div className="p-4 md:p-10 max-w-4xl mx-auto pb-28 text-left">
      {/* Header */}
      <header className="mb-8">
        <h1 className="font-heading font-[800] text-3xl md:text-5xl tracking-tighter uppercase text-white">
          PREDAJA I <span className="text-primary">OCJENA VIDEA</span>
        </h1>
        <p className="text-[#8B8FA8] text-xs md:text-sm uppercase tracking-widest mt-1">
          {isAdmin 
            ? 'Pregledaj i ocijeni studentske video uratke za seminarska predavanja.' 
            : 'Predaj svoje uratke, prati tjedne ciljeve i preuzmi povratne informacije od mentora.'}
        </p>
      </header>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-[#111116] rounded-2xl border border-white/5 mb-8">
        {!isAdmin ? (
          <>
            <button
              onClick={() => setActiveTab('novi')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'novi' ? 'bg-[#F5A500] text-black font-black' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Upload className="w-4 h-4" />
              Predaj Video
            </button>
            <button
              onClick={() => setActiveTab('moje')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'moje' ? 'bg-[#F5A500] text-black font-black' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Video className="w-4 h-4" />
              Moje Ocjene ({studentSubmissions.length})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'pending' ? 'bg-[#F5A500] text-black font-black' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <Clock className="w-4 h-4" />
              Na Čekanju ({pendingSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('graded')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                activeTab === 'graded' ? 'bg-[#F5A500] text-black font-black' : 'text-[#8B8FA8] hover:text-white'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              Ocijenjeno ({gradedSubmissions.length})
            </button>
          </>
        )}
      </div>

      {/* Student Form Tab */}
      {activeTab === 'novi' && (
        <div className="ursa-card p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold text-white uppercase flex items-center gap-2">
            <Upload className="text-primary w-5 h-5" /> PREDAJ NOVI VIDEO URADAK
          </h2>
          
          {submitSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 font-bold text-sm uppercase tracking-wide animate-pulse">
              <CheckCircle2 className="w-5 h-5" /> Video je uspješno predan! Tvoj tjedni cilj je povećan.
            </div>
          )}

          <form onSubmit={handleStudentSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-muted-foreground uppercase ml-1">Odaberi Seminar / Lekciju</label>
              <select
                value={selectedLectureId}
                onChange={e => setSelectedLectureId(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white appearance-none"
              >
                <option value="" className="bg-black text-muted-foreground">-- Izaberi predavanje --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id} className="bg-black text-white">
                    [{course.category}] {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-muted-foreground uppercase ml-1">Video Link (YouTube, Vimeo, TikTok, etc.)</label>
              <input
                type="url"
                required
                value={videoLink}
                onChange={e => setVideoLink(e.target.value)}
                placeholder="https://youtu.be/..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-muted-foreground uppercase ml-1">Bilješke za Mentora (Opcionalno)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Napiši ako želiš mentoru skrenuti pažnju na specifičan dio videa, hook, problem pri editiranju i slično..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white resize-none placeholder:text-muted-foreground/50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-black rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50"
            >
              {submitting ? 'PREDAJEM...' : 'PREDAJ VIDEO URADAK'}
            </button>
          </form>
        </div>
      )}

      {/* Student Grades Tab */}
      {activeTab === 'moje' && (
        studentSubmissions.length === 0 ? (
          <div className="ursa-card p-12 text-center border border-white/5">
            <Video className="w-10 h-10 text-[#8B8FA8] mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-sm font-medium">Još nisi predaj niti jedan video za ocjenjivanje.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {studentSubmissions.map((sub) => (
              <div key={sub.id} className="ursa-card p-6 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/15 transition-all">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                      sub.status === 'pending' ? 'bg-[#F5A500]/20 text-[#F5A500]' : 'bg-emerald-500/20 text-emerald-400'
                    )}>
                      {sub.status === 'pending' ? 'Na čekanju' : 'Ocijenjeno'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Predano: {new Date(sub.createdAt).toLocaleDateString('hr-HR')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white uppercase">{sub.lectureTitle}</h3>
                  {sub.description && (
                    <p className="text-xs text-muted-foreground italic">" {sub.description} "</p>
                  )}

                  <a 
                    href={sub.videoLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1.5 text-xs text-[#F5A500] hover:underline"
                  >
                    Gledaj predani video <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {sub.status === 'graded' && sub.feedback && (
                    <div className="mt-4 p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#F5A500]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Komentar mentora ({sub.gradedBy}):</span>
                      </div>
                      <p className="text-sm text-[#8B8FA8] whitespace-pre-wrap">{sub.feedback}</p>
                    </div>
                  )}
                </div>

                {sub.status === 'graded' && (
                  <div className="flex flex-col items-center justify-center shrink-0 w-24 h-24 bg-[#F5A500]/10 border border-[#F5A500]/30 rounded-2xl">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-none">Ocjena</span>
                    <span className="text-4xl font-black text-[#F5A500] mt-1">{sub.grade}</span>
                    <span className="text-[9px] text-[#8B8FA8] mt-0.5">od 5</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Mentor Pending Tab */}
      {activeTab === 'pending' && (
        pendingSubmissions.length === 0 ? (
          <div className="ursa-card p-12 text-center border border-white/5">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-sm font-medium">Odlično! Nema novih video predaja na čekanju za ocjenjivanje.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingSubmissions.map((sub) => (
              <div key={sub.id} className="ursa-card p-6 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={sub.userAvatar} alt={sub.username} className="w-8 h-8 rounded-full border border-white/10" />
                    <div>
                      <h4 className="font-bold text-sm text-white">{sub.username}</h4>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Predano: {new Date(sub.createdAt).toLocaleDateString('hr-HR')}</p>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#F5A500] uppercase mt-2">{sub.lectureTitle}</h3>
                  {sub.description && (
                    <p className="text-xs text-[#8B8FA8] italic">"{sub.description}"</p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <a 
                    href={sub.videoLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors flex items-center gap-1.5"
                  >
                    Gledaj <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button 
                    onClick={() => setSelectedSubmission(sub)}
                    className="px-4 py-2.5 bg-[#F5A500] text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform"
                  >
                    Ocjeni
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Mentor Graded Tab */}
      {activeTab === 'graded' && (
        gradedSubmissions.length === 0 ? (
          <div className="ursa-card p-12 text-center border border-white/5">
            <Clock className="w-10 h-10 text-[#8B8FA8] mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-sm font-medium">Još niste ocijenili niti jednu video predaju.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gradedSubmissions.map((sub) => (
              <div key={sub.id} className="ursa-card p-6 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={sub.userAvatar} alt={sub.username} className="w-8 h-8 rounded-full border border-white/10" />
                    <div>
                      <h4 className="font-bold text-sm text-white">{sub.username}</h4>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ocijenjeno: {sub.gradedAt ? new Date(sub.gradedAt).toLocaleDateString('hr-HR') : ''}</p>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white uppercase mt-2">{sub.lectureTitle}</h3>
                  <a href={sub.videoLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#F5A500] hover:underline">
                    Gledaj video <ExternalLink className="w-3 h-3" />
                  </a>

                  {sub.feedback && (
                    <div className="mt-2 p-3 bg-white/5 rounded-xl text-xs text-[#8B8FA8]">
                      <span className="font-bold text-white">Povratne informacije:</span> {sub.feedback}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center shrink-0 w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                  <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Ocjena</span>
                  <span className="text-3xl font-black text-emerald-400 mt-0.5">{sub.grade}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Grading Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setSelectedSubmission(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#111116] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
                Ocijeni <span className="text-primary">Video</span>
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">
                Korisnik: {selectedSubmission.username} | {selectedSubmission.lectureTitle}
              </p>

              <form onSubmit={handleGradeSubmit} className="space-y-6 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase ml-1">Odaberi Ocjenu (1 - 5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGrade(num)}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-heading font-black text-lg transition-all flex items-center justify-center gap-1",
                          grade === num 
                            ? "bg-primary text-black shadow-lg shadow-primary/20" 
                            : "bg-white/5 text-[#8B8FA8] hover:bg-white/10"
                        )}
                      >
                        {num} <Star className={cn("w-4 h-4 fill-current", grade === num ? "text-black" : "text-[#8B8FA8]")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase ml-1">Komentar / Povratne informacije</label>
                  <textarea
                    required
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    rows={5}
                    placeholder="Unesi povratne informacije, savjete, ocijeni hook, kadriranje, titlove, audio i slično..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:border-primary focus:outline-none transition-colors text-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={grading}
                  className="w-full py-4 bg-primary text-black rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50"
                >
                  {grading ? 'SPREMANJE...' : 'SPREMI OCJENU (+100 XP Studentu)'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
