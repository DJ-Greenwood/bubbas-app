// src/utils/emotionSettingsSync.ts
'use client';

import { useEffect } from 'react';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { UserProfileData } from '@/types/UserProfileData';


export function useSyncEmotionSettings(
  userProfile: UserProfileData,
  onUpdateProfile: (updates: Partial<UserProfileData>) => void
) {
  const { emotionIconSize, characterSet, setEmotionIconSize, setCharacterSet } = useEmotionSettings();

  // Sync from profile to context on initial load
  useEffect(() => {
    // Only update if the values are different to avoid loops
    if (userProfile.preferences.emotionIconSize && 
        userProfile.preferences.emotionIconSize !== emotionIconSize) {
      setEmotionIconSize(userProfile.preferences.emotionIconSize);
    }
    
    if (userProfile.preferences.emotionCharacterSet && 
        userProfile.preferences.emotionCharacterSet !== characterSet) {
      setCharacterSet(userProfile.preferences.emotionCharacterSet as any);
    }
  }, [userProfile.preferences, setEmotionIconSize, setCharacterSet]);

  // Sync from context to profile when context changes
  useEffect(() => {
    // Update the user profile when context changes
    onUpdateProfile({
      preferences: {
        ...userProfile.preferences,
        emotionIconSize: emotionIconSize,
        emotionCharacterSet: characterSet
      }
    });
  }, [emotionIconSize, characterSet]);

  return { emotionIconSize, characterSet };
}

