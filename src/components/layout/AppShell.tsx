import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';



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
        'flex-1 pb-36'
      )}>
        <div className="max-w-[1000px] mx-auto px-4">
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
