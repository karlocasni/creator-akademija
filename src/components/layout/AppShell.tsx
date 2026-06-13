import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
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
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />

      {/* Content */}
      <div className={cn(
        'flex-1 pb-32'
      )}>
        <div className="max-w-[1000px] mx-auto px-4">
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
