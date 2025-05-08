// src/types/UserProfileData.ts
import { Timestamp } from 'firebase/firestore';
import { EmotionCharacterKey } from './emotionCharacters';

export interface UserProfileData {
  uid: string;
  email: string;
  createdAt: Timestamp | Date;
  subscription: {
    tier: 'free' | 'plus' | 'pro';
    activationDate: Timestamp | Date;
    expirationDate?: Timestamp | Date;
    canceledAt?: Timestamp | Date;
    trialEndsAt?: Timestamp | Date;
    status: 'active' | 'canceled' | 'past_due';
  };
  features: {
    emotionalInsights: boolean;
    memory: boolean;
    tts: boolean;
    stt: boolean;
  };
  preferences: {
    username?: string;
    phoneNumber?: string;
    security?:{
      passPhrase?: string;
      userauthority?: 'user' | 'admin' | 'superadmin';
    }
    timezone?: string;
    localStorageEnabled?: boolean;
    emotionCharacterSet?: EmotionCharacterKey;
    emotionIconSize?: number;
    // Theme preferences
    theme?: 'light' | 'dark' | 'system';
    // TTS preferences
    ttsVoice?: string;
    ttsRate?: number;
    ttsPitch?: number;
    ttsAutoplay?: boolean;
  };
  usage: {
    totalTokens: number;
    monthlyTokens: number;
    resetDate: Timestamp | Date;
    chatsToday: number;
    lastChatDate: Timestamp | Date;
  };
}

export interface UserProfileUpdate {
  subscription?: Partial<UserProfileData['subscription']>;
  features?: Partial<UserProfileData['features']>;
  preferences?: Partial<UserProfileData['preferences']>;
  usage?: Partial<UserProfileData['usage']>;
}