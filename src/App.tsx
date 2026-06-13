import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Landing from './pages/Landing';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { UploadProvider } from './contexts/UploadContext';
import UploadToast from './components/ui/UploadToast';

const AppShell = lazy(() => import('./components/layout/AppShell'));
const Feed = lazy(() => import('./pages/Feed'));
const Lectures = lazy(() => import('./pages/Lectures'));
const Tools = lazy(() => import('./pages/Tools'));
const ViralHookGenerator = lazy(() => import('./pages/ViralHookGenerator'));
const TrendTracker = lazy(() => import('./pages/TrendTracker'));
const VideoIdeaGenerator = lazy(() => import('./pages/VideoIdeaGenerator'));
const HookVault = lazy(() => import('./pages/HookVault'));
const Challenge = lazy(() => import('./pages/Challenges'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Profile = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard'));
const Members = lazy(() => import('./pages/Members'));
const CreatorPage = lazy(() => import('./pages/CreatorPage'));
const Submissions = lazy(() => import('./pages/Submissions'));
const Paywall = lazy(() => import('./pages/Paywall'));

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [direction, setDirection] = useState(0);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const PATH_ORDER = ['/feed', '/lectures', '/submissions', '/calendar', '/profile', '/messages', '/members'];
    const curPath = location.pathname;
    const prevPath = prevPathRef.current;
    if (curPath !== prevPath) {
      const curIndex = PATH_ORDER.findIndex(p => curPath.startsWith(p));
      const prevIndex = PATH_ORDER.findIndex(p => prevPath.startsWith(p));
      if (curIndex !== -1 && prevIndex !== -1) {
        setDirection(curIndex > prevIndex ? 1 : -1);
      } else {
        setDirection(curPath > prevPath ? 1 : -1);
      }
      prevPathRef.current = curPath;
    }
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Enforce landing page for unauthenticated users
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Enforce paywall for inactive user profiles
  if (profile && profile.status === 'inactive' && !profile.isAdmin) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <Paywall />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AppShell>
        {/* resetKey ensures ErrorBoundary clears on each route change */}
        <ErrorBoundary resetKey={location.pathname}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? 30 : -30,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (dir: number) => ({
                  x: dir > 0 ? -30 : 30,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="w-full"
            >
              <Routes location={location}>
            <Route path="/feed" element={<Feed />} />
            <Route path="/lectures" element={<Lectures />} />
            <Route path="/tools" element={<Navigate to="/submissions" replace />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/tools/hook-generator" element={<ViralHookGenerator />} />
            <Route path="/tools/trend-tracker" element={<TrendTracker />} />
            <Route path="/tools/video-ideas" element={<VideoIdeaGenerator />} />
            <Route path="/tools/hook-vault" element={<HookVault />} />
            <Route path="/challenge" element={<Challenge />} />
            <Route path="/calendar" element={<Calendar />} />
            
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profile/u/:username" element={<Profile />} />
            <Route path="/creator/:creatorId" element={<CreatorPage />} />
            
             <Route path="/messages" element={<Messages />} />
             <Route path="/messages/:chatId" element={<Messages />} />
             
             <Route path="/leaderboard" element={<Navigate to="/profile" replace />} />
             <Route path="/members" element={<Members />} />
             <Route path="*" element={<Navigate to="/feed" replace />} />
          </Routes>
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </AppShell>
    </Suspense>
  );
}

function App() {
  return (
    <UploadProvider>
      <AppRoutes />
      <UploadToast />
    </UploadProvider>
  );
}

export default App;
