// src/utils/userProfileService.ts
'use client';

import { db, auth } from '@/utils/firebaseClient';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfileData } from '@/types/UserProfileData';
import { encryptData } from '@/utils/encryption';

// Create new user profile
export async function createNewUserProfile(uid: string, email: string, passphrase: string) {
  const now = new Date().toISOString();

  const userProfile: UserProfileData = {
    email,
    createdAt: now,
    agreedTo: {
      terms: now,
      privacy: now,
      ethics: now,
    },
    preferences: {
      username: '',
      phoneNumber: '',
      tone: 'neutral',
      theme: 'light',
      emotionCharacterSet: 'Bubba',
      emotionIconSize: '64',
      localStorageEnabled: true,
      security:{
      passPhrase: encryptData({ key: passphrase }, passphrase),
      }
    },
    usage: {
      tokens: {
        lifetime: 0,
        monthly: {},
      },
      voiceChars: {
        tts: { lifetime: 0, monthly: {} },
        stt: { lifetime: 0, monthly: {} },
      },
    },
    subscription: {
      tier: 'free',
      activationDate: now,
      expirationDate: '',
    },
    features: {
      memory: true,
      tts: true,
      stt: true,
      emotionalInsights: true,
    },
  };

  const userProfileRef = doc(db, 'users', uid);
  await setDoc(userProfileRef, userProfile);

  console.log(`✅ Created new user profile for UID: ${uid}`);
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