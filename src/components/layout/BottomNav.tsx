import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlaySquare, Sparkles, Calendar, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import PostModal from '../feed/PostModal';

const navItems = [
  { label: 'Zajednica', icon: Home, path: '/feed' },
  { label: 'Tečajevi', icon: PlaySquare, path: '/lectures' },
  { label: 'Alati', icon: Sparkles, path: '/tools' },
  { label: 'Kalendar', icon: Calendar, path: '/calendar' },
];

export default function BottomNav() {
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#161616]/90 backdrop-blur-xl z-50 px-4 md:px-8 border-t border-white/5 pb-safe flex items-center justify-center">
        <div className="max-w-md w-full flex justify-between items-center relative">
          {/* First two nav items */}
          {navItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 transition-all flex-1',
                  isActive ? 'text-primary' : 'text-white/50 hover:text-white/80',
                )}
              >
                <div className="relative p-1.5 flex flex-col items-center">
                  <item.icon
                    className={cn(
                      'w-6 h-6 transition-all duration-300',
                      isActive
                        ? 'stroke-[2.5px] drop-shadow-[0_0_8px_rgba(212,255,0,0.5)]'
                        : 'stroke-2',
                    )}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}

          {/* Center FAB */}
          <div className="relative -top-5 flex flex-col items-center justify-center z-50 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              aria-label="Nova objava"
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-[0_0_20px_rgba(212,255,0,0.3)] hover:shadow-[0_0_30px_rgba(212,255,0,0.5)] transition-shadow"
            >
              <Plus className="w-7 h-7 text-black stroke-[2.5px]" />
            </motion.button>
          </div>

          {/* Last two nav items */}
          {navItems.slice(2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 transition-all flex-1',
                  isActive ? 'text-primary' : 'text-white/50 hover:text-white/80',
                )}
              >
                <div className="relative p-1.5 flex flex-col items-center">
                  <item.icon
                    className={cn(
                      'w-6 h-6 transition-all duration-300',
                      isActive
                        ? 'stroke-[2.5px] drop-shadow-[0_0_8px_rgba(212,255,0,0.5)]'
                        : 'stroke-2',
                    )}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {showModal && <PostModal isOpen={showModal} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}
