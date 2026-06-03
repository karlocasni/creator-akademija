import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuth } from '../../contexts/AuthContext';

export default function TopBar() {
  const { profile } = useAuth();
  
  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2">
        <Link to="/feed" className="font-heading text-lg tracking-tight uppercase flex items-center gap-1">
          <span className="text-white font-bold">CREATOR</span> <span className="text-[#F5A500] font-marker font-normal tracking-normal text-xl mt-0.5">AKADEMIJA</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <Link
          to="/messages"
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Poruke"
        >
          <MessageCircle className="w-[22px] h-[22px]" />
        </Link>
        <Link to="/profile">
          <div className="lvl-badge">
            LVL {profile?.level ?? 1}
          </div>
        </Link>
      </div>
    </header>
  );
}
