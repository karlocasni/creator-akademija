import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function CommunityTabs() {
  const location = useLocation();
  const { profile } = useAuth();
  const isAdmin = profile?.isAdmin === true;
  const isCreator = profile?.isCreator === true;

  const tabs = [
    { label: 'Creator Hub', path: '/feed' }
  ];

  if (isAdmin || isCreator) {
    tabs.push({ label: 'Članovi', path: '/members' });
  }

  return (
    <nav className="flex px-4 border-b border-[rgba(255,255,255,0.06)] overflow-x-auto hide-scrollbar bg-[#0E1420] mb-4">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              "px-4 py-3 whitespace-nowrap text-sm font-manrope-600 transition-colors",
              isActive 
                ? "text-[#3B82F6] font-[700] active-tab-border" 
                : "text-[#8B8FA8] font-[500] hover:text-[#3B82F6]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
