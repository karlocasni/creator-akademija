import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreChat, FirestoreChatMessage } from '../../types/post';
import { toast } from '../../lib/dialog';

/** Mirrors the message size limit in firestore.rules. */
const MESSAGE_MAX = 4000;

interface ChatRoomProps {
  chatId: string;
}

export default function ChatRoom({ chatId }: ChatRoomProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chat, setChat] = useState<FirestoreChat | null>(null);
  const [chatMissing, setChatMissing] = useState(false);
  const [messages, setMessages] = useState<FirestoreChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChat(null);
    setChatMissing(false);
    setLoadError(null);
    return onSnapshot(
      doc(db, 'chats', chatId),
      (snap) => {
        if (snap.exists()) {
          setChat({ id: snap.id, ...snap.data() } as FirestoreChat);
          setChatMissing(false);
        } else {
          setChat(null);
          setChatMissing(true);
        }
      },
      (err) => {
        console.warn('[ChatRoom] Chat snapshot error:', err.code);
        setLoadError(
          err.code === 'permission-denied'
            ? 'Nemaš pristup ovom razgovoru.'
            : 'Razgovor se nije mogao učitati. Provjeri vezu.',
        );
      },
    );
  }, [chatId]);

  useEffect(() => {
    setMessages([]);
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
    );
    return onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) } as FirestoreChatMessage)),
        );
      },
      (err) => {
        // Also fires for a chat that doesn't exist (the rules can't confirm participation)
        console.warn('[ChatRoom] Messages snapshot error:', err.code);
      },
    );
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || sending || !chat) return;
    if (trimmed.length > MESSAGE_MAX) {
      toast(`Poruka je preduga (max ${MESSAGE_MAX} znakova).`, 'error');
      return;
    }
    setSending(true);
    setText('');
    try {
      // Rules: senderId must be the caller and the caller a participant
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text: trimmed,
        timestamp: serverTimestamp(),
        read: false,
      });
      // Rules: chat updates may only touch the lastMessage* fields
      updateDoc(doc(db, 'chats', chatId), {
        lastMessage: trimmed.slice(0, 300),
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
      }).catch((err) => console.warn('[ChatRoom] Could not update chat preview:', err));
    } catch (err) {
      console.error('Greška pri slanju poruke:', err);
      setText(trimmed);
      toast('Poruka nije poslana. Pokušaj ponovno.', 'error');
    } finally {
      setSending(false);
    }
  };

  const otherId = chat?.participants?.find((id) => id !== user?.uid) ?? '';
  const otherName = chat?.participantNames?.[otherId] ?? 'Korisnik';
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(otherName)}`;
  const otherAvatar = chat?.participantAvatars?.[otherId] || fallbackAvatar;
  const unavailable = loadError || (chatMissing ? 'Razgovor ne postoji.' : null);

  return (
    <div className="flex flex-col bg-background/50 rounded-3xl overflow-hidden border border-white/5" style={{ height: 'calc(100dvh - 11rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-background/80 backdrop-blur-xl flex-shrink-0">
        <button
          onClick={() => navigate('/messages')}
          aria-label="Natrag na poruke"
          className="text-muted-foreground hover:text-white transition-colors p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {chat && (
          <Link to={`/profile/${otherId}`} className="flex items-center gap-3">
            <img
              src={otherAvatar}
              className="w-9 h-9 rounded-full border border-white/10 object-cover"
              alt={otherName}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
              }}
            />
            <span className="font-bold text-white text-sm hover:text-primary transition-colors">{otherName}</span>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {unavailable ? (
          <div className="flex flex-col items-center text-center mt-16 gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm text-red-300">{unavailable}</p>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm mt-16">Nema poruka</p>
        ) : null}
        {!unavailable && messages.map((msg) => {
          const isOwn = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isOwn
                    ? 'bg-primary text-black font-medium rounded-br-sm'
                    : 'bg-white/10 text-white rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 bg-background/80 backdrop-blur-xl flex gap-2 flex-shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MESSAGE_MAX}
          disabled={!chat || !!unavailable}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Nova poruka..."
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:border-primary focus:outline-none text-white placeholder:text-muted-foreground/50 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending || !chat || !!unavailable}
          aria-label="Pošalji poruku"
          className="p-2.5 bg-primary text-black rounded-full disabled:opacity-50 hover:scale-105 active:scale-95 transition-transform"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
