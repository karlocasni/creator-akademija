import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { AnimatePresence } from 'framer-motion';
import PostModal from '../feed/PostModal';

export const bottomNavEventTarget = new EventTarget();

const navItems = [
  { label: 'Zajednica', icon: 'home', path: '/feed' },
  { label: 'Tečajevi', icon: 'play_circle', path: '/lectures' },
  { label: 'Predaja', icon: 'upload', path: '/submissions' },
  { label: 'Kalendar', icon: 'calendar_month', path: '/calendar' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // FAB handler: open PostModal directly when on Feed; navigate to Feed first
  // then open the modal when on any other route. Because BottomNav lives outside
  // the route tree the modal mounts in the same paint cycle as the navigation,
  // so the transition feels instant with no visible gap.
  const handleFab = () => {
    if (location.pathname !== '/feed') {
      navigate('/feed');
    }
    setShowModal(true);
  };

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
    {/* Fixed viewport-bottom bar — full width, always visible */}
    <div
      id="bottom-nav-container"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] flex flex-col items-center",
        "transition-all duration-300 ease-in-out",
        isHidden ? "opacity-0 translate-y-full" : "opacity-100 translate-y-0"
      )}
    >
      {/* gradient fill so content doesn't bleed through beneath the pill */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" />

      {/* pill nav — sits above the safe-area with proper bottom padding */}
      <nav
        className="relative w-full max-w-md mx-auto bg-[#151E30]/90 backdrop-blur-xl border border-white/5 rounded-full px-6 flex items-center justify-between shadow-2xl pointer-events-auto"
        style={{
          marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          paddingTop: '8px',
          paddingBottom: '8px',
        }}
      >
        {/* First two nav items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-300",
                isActive ? "text-[#3B82F6]" : "text-[#8B8FA8] hover:text-white"
              )}
              title={item.label}
            >
              <div className={cn(
                "flex items-center justify-center p-2 rounded-full",
                isActive ? "bg-[#3B82F6]/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : ""
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

        {/* Center FAB — elevated above the pill */}
        <div className="relative flex flex-col items-center justify-center" style={{ marginTop: '-28px' }}>
          <button
            onClick={handleFab}
            aria-label="Nova objava"
            className="w-14 h-14 bg-[#3B82F6] rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(59,130,246,0.4)] text-white active:scale-95 transition-transform"
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
                isActive ? "text-[#3B82F6]" : "text-[#8B8FA8] hover:text-white"
              )}
              title={item.label}
            >
              <div className={cn(
                "flex items-center justify-center p-2 rounded-full",
                isActive ? "bg-[#3B82F6]/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : ""
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
