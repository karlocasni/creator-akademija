import { Timestamp } from 'firebase/firestore';

export interface FirestoreNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: 'mention' | 'new_lesson' | 'new_challenge' | 'new_training' | 'like' | 'comment' | 'challenge_winner' | 'general';
  message: string;
  postId?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: Timestamp;
}
