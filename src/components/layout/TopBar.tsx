import { Flame, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';

export default function TopBar() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#161616]/90 backdrop-blur-xl z-50 px-4 flex items-center justify-between border-b border-white/5">
      <Link
        to="/feed"
        className="flex items-center gap-1.5 font-extrabold text-base tracking-tighter text-white uppercase"
      >
        CREATOR <span className="text-primary font-permanent-marker normal-case tracking-normal text-lg">Akademija</span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          to="/feed?search=true"
          className="p-2 text-white/60 hover:text-white transition-colors"
          aria-label="Pretraži"
        >
          <Search className="w-5 h-5" />
        </Link>
        <NotificationBell />
      </div>
    </header>
  );
}
