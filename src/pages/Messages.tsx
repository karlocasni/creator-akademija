import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { FirestoreChat } from '../types/post';
import ChatRoom from '../components/chat/ChatRoom';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const [chats, setChats] = useState<FirestoreChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreChat));
      data.sort((a, b) => {
        const aMs = a.lastMessageTime instanceof Timestamp ? a.lastMessageTime.toMillis() : 0;
        const bMs = b.lastMessageTime instanceof Timestamp ? b.lastMessageTime.toMillis() : 0;
        return bMs - aMs;
      });
      setChats(data);
      setLoading(false);
    });
  }, [user]);

  if (chatId) {
    return (
      <div className="max-w-2xl mx-auto">
        <ChatRoom chatId={chatId} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-20">
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-white">
          PORUKE
        </h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest mt-1">
          Privatne konverzacije
        </p>
      </header>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ursa-card p-4 animate-pulse h-20" />
          ))}
        </div>
      )}

      {!loading && chats.length === 0 && (
        <div className="text-center py-20">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-semibold">Nema poruka</p>
          <p className="text-muted-foreground/60 text-sm mt-1">
            Pokreni razgovor klikom na "Pošalji poruku" pored tuđeg posta
          </p>
        </div>
      )}

      <div className="space-y-2">
        {chats.map((chat) => {
          const otherId = chat.participants.find((id) => id !== user?.uid) ?? '';
          const otherName = chat.participantNames?.[otherId] ?? 'Korisnik';
          const otherAvatar =
            chat.participantAvatars?.[otherId] ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherName}`;

          return (
            <button
              key={chat.id}
              onClick={() => navigate(`/messages/${chat.id}`)}
              className="w-full ursa-card p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
            >
              <img
                src={otherAvatar}
                className="w-12 h-12 rounded-full flex-shrink-0 border border-white/10"
                alt={otherName}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherName}`;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{otherName}</p>
                <p className="text-muted-foreground text-xs truncate mt-0.5">
                  {chat.lastMessage || 'Nova poruka'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
