// src/utils/userProfileService.ts
import { auth, db } from './firebaseClient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Types
export interface UserProfileData {
  email: string;
  username?: string;
  phoneNumber?: string;
  createdAt: string;
  passPhrase: string;
  agreedTo: { terms: string; privacy: string; ethics: string; };
  preferences: { tone: string; theme: string; emotionCharacterSet: string; emotionIconSize: string; localStorageEnabled?: boolean; };
  usage: { tokens: { lifetime: number; monthly: any; }; voiceChars: { tts: any; stt: any; }; };
  subscription: { tier: string; activationDate: string; expirationDate: string; };
  features: { memory: boolean; tts: boolean; stt: boolean; emotionalInsights: boolean; };
}

// Fetch user profile
export const fetchUserProfile = async (): Promise<UserProfileData | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const userRef = doc(db, 'users', currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfileData;
  }

  return null;
};

// Update user profile
export const updateUserProfile = async (updates: Partial<UserProfileData>): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const userRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userRef, updates);
};
