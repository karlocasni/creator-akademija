import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import PostModal from './PostModal';

export default function CreatePost() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="px-4 mb-6">
        <div 
          className="bg-[#111116] p-6 cursor-text" 
          style={{ borderRadius: '20px', boxShadow: 'rgba(245, 165, 0, 0.15) 0px 0px 15px' }}
          onClick={() => setShowModal(true)}
        >
          <div className="mb-4">
            <div className="w-full bg-[#1A1A22] border-none text-sm text-[#4A4A5A] rounded-xl p-4 min-h-[80px] flex items-start text-left cursor-text">
              Što ti je na umu, kreativče? Podijeli hook ili pobjedu...
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              className="bg-[#F5A500] text-[#0A0A0F] font-heading font-bold px-8 py-2.5 rounded-full text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
            >
              Objavi
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && <PostModal isOpen={showModal} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}
