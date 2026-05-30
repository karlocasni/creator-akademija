import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Leaderboard from '../feed/Leaderboard';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

// All possible Zajednica tabs
const ALL_ZAJEDNICA_TABS = [
  { label: 'Creator Hub', path: '/feed', adminOnly: false },
  { label: 'XP Rang Lista', path: '/leaderboard', adminOnly: false },
  { label: 'Kolege Kreatori', path: '/members', adminOnly: false },
];

// Routes where the Zajednica tab bar should be visible
const ZAJEDNICA_PATHS = ['/feed', '/leaderboard', '/members'];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const isAdmin = profile?.isAdmin === true;
  const ZAJEDNICA_TABS = ALL_ZAJEDNICA_TABS.filter(t => !t.adminOnly || isAdmin);
  const isZajednica = ZAJEDNICA_PATHS.some((p) => location.pathname === p);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <Navbar />

      {/* Mobile-only Zajednica sticky secondary tab bar */}
      {isZajednica && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-[#161616]/95 backdrop-blur-xl border-b border-white/5">
          <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
            {ZAJEDNICA_TABS.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 border',
                  location.pathname === tab.path
                    ? 'bg-primary text-black border-primary'
                    : 'border-white/20 text-muted-foreground hover:border-white/40 hover:text-white',
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content — extra top padding on mobile when Zajednica tab bar is visible (14px TopBar + ~42px tabs) */}
      <div className={cn(
        'flex-1 pb-20 md:pt-16',
        isZajednica ? 'pt-[7rem]' : 'pt-14',
      )}>
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 flex gap-6 items-start">
          <main className="flex-1 min-w-0">{children}</main>

          <aside className="hidden lg:flex flex-col gap-4 w-80 flex-shrink-0 sticky top-20">
            <Leaderboard />
          </aside>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
