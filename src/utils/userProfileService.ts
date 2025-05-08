// src/utils/userProfileService.ts
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebaseClient';
import { UserProfileData } from '@/types/UserProfileData';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

/**
 * Fetch the user profile from Firestore
 */
export const fetchUserProfile = async (): Promise<UserProfileData | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User is not authenticated');
    }
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfileData;
    } else {
      console.error('No user profile found');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Update user profile in Firestore
 */
export const updateUserProfile = async (updates: Partial<UserProfileData>): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User is not authenticated');
    }
    
    const userRef = doc(db, 'users', user.uid);
    
    // Add last updated timestamp
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(userRef, updatesWithTimestamp);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (user: string, trimmedEmail: string, trimmedPassphrase: string): Promise<UserProfileData> => {
  if (!user) {
    throw new Error('User is not authenticated');
  }  
 
  try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User is not authenticated');
      }
      
      const now = Timestamp.now();
      
      // Default user profile data
      const newUserProfile: UserProfileData = {
        uid: user.uid,
        email: trimmedEmail,

        createdAt: now,
        subscription: {
          tier: 'free',
          activationDate: now,
          status: 'active'
        },
        features: {
          emotionalInsights: true,
          memory: false,
          tts: false,
          stt: false
        },
        preferences: {
          username: '', // Empty string as default
          phoneNumber: '', // Empty string as default
          security: {
            passPhrase: trimmedPassphrase,  
          },
          timezone: 'UTC', // Default timezone
          localStorageEnabled: true, // Default to enabled
          emotionCharacterSet: 'Bubba', // Default character
          emotionIconSize: 32, // Default size
          theme: 'system', // Default theme
          ttsVoice: '', // Empty by default
          ttsRate: 1.0, // Default speech rate
          ttsPitch: 1.0, // Default pitch
          ttsAutoplay: false // Default to not auto-play
        },
        usage: {
          totalTokens: 0,
          monthlyTokens: 0,
          resetDate: now,
          chatsToday: 0,
          lastChatDate: now
        }
      } as UserProfileData;
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, newUserProfile);
      
      return newUserProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
};

/**
 * Enable or disable a specific feature for the user
 */
export const toggleFeature = async (featureName: keyof UserProfileData['features'], enabled: boolean): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User is not authenticated');
    }
    
    const userRef = doc(db, 'users', user.uid);
    
    await updateDoc(userRef, {
      [`features.${featureName}`]: enabled,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Error toggling ${featureName} feature:`, error);
    throw error;
  }
};

/**
 * Update TTS preferences
 */
export const updateTTSPreferences = async (
  preferences: {
    ttsVoice?: string;
    ttsRate?: number;
    ttsPitch?: number;
    ttsAutoplay?: boolean;
  }
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User is not authenticated');
    }
    
    const userRef = doc(db, 'users', user.uid);
    
    // Create an update object with only the provided preferences
    const updates: Record<string, any> = {};
    
    Object.entries(preferences).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[`preferences.${key}`] = value;
      }
    });
    
    // Add updated timestamp
    updates.updatedAt = serverTimestamp();
    
    // Only update if there are changes
    if (Object.keys(updates).length > 1) { // > 1 because we always have updatedAt
      await updateDoc(userRef, updates);
    }
  } catch (error) {
    console.error('Error updating TTS preferences:', error);
    throw error;
  }
};

/**
 * Update theme preference
 */
export const updateThemePreference = async (
  theme: 'light' | 'dark' | 'system'
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User is not authenticated');
    }
    
    const userRef = doc(db, 'users', user.uid);
    
    await updateDoc(userRef, {
      'preferences.theme': theme,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating theme preference:', error);
    throw error;
  }
};