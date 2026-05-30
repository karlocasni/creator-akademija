import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import PostModal from './PostModal';

export default function CreatePost() {
  const { user, profile } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!user) return null;

  const avatarUrl =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`;

  return (
    <>
      <div className="ursa-card flex items-center gap-3 p-3">
        <img
          src={avatarUrl}
          className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
          alt="Moj avatar"
        />
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 bg-white/5 rounded-full px-4 py-2.5 text-muted-foreground text-sm cursor-pointer hover:bg-white/10 transition-colors text-left"
        >
          Što ti je na umu, kreativče? Podijeli hook ili pobjedu...
        </button>
      </div>

      <AnimatePresence>
        {showModal && <PostModal isOpen={showModal} onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </>
  );
}
