import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { AnimatePresence } from 'framer-motion';
import PostModal from '../feed/PostModal';

export const bottomNavEventTarget = new EventTarget();

const navItems = [
  { label: 'Zajednica', icon: 'home', path: '/feed' },
  { label: 'Tečajevi', icon: 'play_circle', path: '/lectures' },
  { label: 'Alati', icon: 'auto_awesome', path: '/tools' },
  { label: 'Kalendar', icon: 'calendar_month', path: '/calendar' },
];

export default function BottomNav() {
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleHide = () => setIsHidden(true);
    const handleShow = () => setIsHidden(false);

    bottomNavEventTarget.addEventListener('hide', handleHide);
    bottomNavEventTarget.addEventListener('show', handleShow);

    return () => {
      bottomNavEventTarget.removeEventListener('hide', handleHide);
      bottomNavEventTarget.removeEventListener('show', handleShow);
    };
  }, []);

  return (
    <>
      <div 
        id="bottom-nav-container" 
        className={cn(
          "fixed bottom-4 left-4 right-4 z-[100] flex justify-center pointer-events-none transition-all duration-300 ease-in-out",
          isHidden ? "opacity-0 translate-y-24" : "opacity-100 translate-y-0"
        )}
      >
        <nav className="bg-[#111116]/90 backdrop-blur-xl border border-white/5 rounded-full px-6 py-2 flex items-center justify-between w-full max-w-md shadow-2xl pointer-events-auto relative">
          
          {/* First two nav items */}
          {navItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300",
                  isActive ? "text-[#F5A500]" : "text-[#8B8FA8] hover:text-white"
                )}
                title={item.label}
              >
                <div className={cn(
                  "flex items-center justify-center p-2 rounded-full",
                  isActive ? "bg-[#F5A500]/10 shadow-[0_0_15px_rgba(245,165,0,0.3)]" : ""
                )}>
                  <span 
                    className="material-symbols-outlined" 
                    style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : {}}
                  >
                    {item.icon}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* Center FAB */}
          <div className="relative flex flex-col items-center justify-center -translate-y-6">
            <button
              onClick={() => setShowModal(true)}
              aria-label="Nova objava"
              className="w-14 h-14 bg-[#F5A500] rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(245,165,0,0.4)] text-[#0A0A0F] active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-3xl font-bold">add</span>
            </button>
          </div>

          {/* Last two nav items */}
          {navItems.slice(2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300",
                  isActive ? "text-[#F5A500]" : "text-[#8B8FA8] hover:text-white"
                )}
                title={item.label}
              >
                <div className={cn(
                  "flex items-center justify-center p-2 rounded-full",
                  isActive ? "bg-[#F5A500]/10 shadow-[0_0_15px_rgba(245,165,0,0.3)]" : ""
                )}>
                  <span 
                    className="material-symbols-outlined" 
                    style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : {}}
                  >
                    {item.icon}
                  </span>
                </div>
              </Link>
            );
          })}
          
        </nav>
      </div>

      <AnimatePresence>
        {showModal && <PostModal isOpen={showModal} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}
