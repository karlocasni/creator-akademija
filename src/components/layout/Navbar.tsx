import { Link, useLocation } from 'react-router-dom';
import { Flame, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import XPBadge from '../ui/XPBadge';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const location = useLocation();
  const { profile } = useAuth();

  const avatarSrc =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`;

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 glass z-50 px-6 items-center justify-between">
      <Link
        to="/feed"
        className="flex items-center gap-2 font-extrabold text-xl tracking-tighter text-white flex-shrink-0 uppercase"
      >
        CREATOR <span className="text-primary font-permanent-marker normal-case tracking-normal text-2xl">Akademija</span>
      </Link>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to="/messages"
          className={`p-2 rounded-full transition-colors ${
            location.pathname.startsWith('/messages')
              ? 'text-primary'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          aria-label="Poruke"
        >
          <MessageCircle className="w-5 h-5" />
        </Link>
        <NotificationBell />
        <Link to="/profile" className="hover:scale-105 transition-transform">
          {profile && <XPBadge xp={profile.xp ?? 0} compact />}
        </Link>
        <Link to="/profile" className="w-8 h-8 rounded-full bg-accent border border-white/10 overflow-hidden flex-shrink-0 hover:border-primary/50 transition-colors">
          <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
        </Link>
      </div>
    </nav>
  );
}
