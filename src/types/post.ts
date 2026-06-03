import { Timestamp } from 'firebase/firestore';

export interface FirestoreChat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAvatars: Record<string, string>;
  lastMessage: string;
  lastMessageTime: Timestamp | null;
  lastMessageSenderId: string;
}

export interface FirestoreChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface UserProfile {
  uid?: string;
  username: string;
  email: string;
  status: 'active' | 'inactive';
  phone_number?: string;
  avatar_url?: string;
  createdAt: string;
  updatedAt?: string;
  xp: number;
  level: number;
  isAdmin?: boolean;
  offsetDays?: number;
  bio?: string;
  gender?: 'male' | 'female';
  loggedWorkouts?: {
    weekStart: string;
    days: string[];
  };
  macroCalc?: {
    weight: number;
    height: number;
    age: number;
    gender: string;
    activity: number;
    goal: string;
  };
  instagram?: string;
  tiktok?: string;
  youtube?: string;
}

export interface FirestorePost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  imageUrl: string | null;
  videoUrl?: string | null;
  likes: string[];
  commentsCount: number;
  createdAt: Timestamp;
  title?: string;
  pinned?: boolean;
  category?: string;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  message: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video';
  createdAt: Timestamp;
  isWinner?: boolean;
}

export interface FirestoreComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: Timestamp;
}
