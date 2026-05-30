import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { UploadProvider } from './contexts/UploadContext';
import UploadToast from './components/ui/UploadToast';

const AppShell = lazy(() => import('./components/layout/AppShell'));
const Feed = lazy(() => import('./pages/Feed'));
const Lectures = lazy(() => import('./pages/Lectures'));
const Tools = lazy(() => import('./pages/Tools'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Profile = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard'));
const Members = lazy(() => import('./pages/Members'));

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121216]">
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

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#121216]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AppShell>
        {/* resetKey ensures ErrorBoundary clears on each route change */}
        <ErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/feed" element={<Feed />} />
            <Route path="/lectures" element={<Lectures />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/calendar" element={<Calendar />} />
            
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profile/u/:username" element={<Profile />} />
            
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:chatId" element={<Messages />} />
            
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/members" element={<Members />} />
            <Route path="*" element={<Navigate to="/feed" replace />} />
          </Routes>
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
