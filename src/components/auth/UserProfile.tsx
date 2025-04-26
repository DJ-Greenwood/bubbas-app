// src/app/UserProfile.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../utils/firebaseClient';

// Import modular cards
import PersonalInfoCard from './cards/PersonalInfoCard';
import AgreementsCard from './cards/AgreementsCard';
import PreferencesCard from './cards/PreferencesCard';
import SubscriptionCard from './cards/SubscriptionCard';
import EmotionalInsightsCard from './cards/EmotionalInsightsCard';
import MemoryFeatureCard from './cards/MemoryFeatureCard';
import TTSFeatureCard from './cards/TTSFeatureCard';
import STTFeatureCard from './cards/STTFeatureCard';

// UserProfileData Interface
export interface UserProfileData {
  email: string;
  username?: string;
  phoneNumber?: string;
  createdAt: string;
  passPhrase: string;
  agreedTo: { terms: string; privacy: string; ethics: string; };
  preferences: { tone: string; theme: string; startPage: string; localStorageEnabled?: boolean; };
  usage: { tokens: { lifetime: number; monthly: any; }; voiceChars: { tts: any; stt: any; }; };
  subscription: { tier: string; activationDate: string; expirationDate: string; };
  features: { memory: boolean; tts: boolean; stt: boolean; emotionalInsights: boolean; };
}

const UserProfilePage = () => {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setUserProfile(userSnap.data() as UserProfileData);
      }
      setLoading(false);
    };

    fetchUserProfile();
  }, []);

  const handleProfileUpdate = async (updates: Partial<UserProfileData>) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, updates);

    setUserProfile(prev => prev ? ({ ...prev, ...updates }) : prev);
  };

  if (loading) return <div className="text-center mt-20">Loading profile...</div>;
  if (!userProfile) return <div className="text-center mt-20">Profile not found.</div>;

  return (
    <div className="bg-gray-100 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">User Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PersonalInfoCard user={userProfile} />
          <AgreementsCard user={userProfile} />
          <PreferencesCard user={userProfile} onUpdate={handleProfileUpdate} />
          <SubscriptionCard user={userProfile} />

          {/* Feature Cards based on user features */}
          {userProfile.features.emotionalInsights && <EmotionalInsightsCard user={userProfile} />}
          {userProfile.features.memory && <MemoryFeatureCard user={userProfile} />}
          {userProfile.features.tts && <TTSFeatureCard user={userProfile} />}
          {userProfile.features.stt && <STTFeatureCard user={userProfile} />}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;