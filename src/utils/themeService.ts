// src/utils/themeService.ts
import { UserProfileData } from '@/types/UserProfileData';
import { updateUserProfile } from './userProfileService';

/**
 * Sync the theme between localStorage and the user's profile
 * 
 * @param user Current user profile data
 * @param theme Current theme ('light', 'dark', or 'system')
 * @returns Promise that resolves when the sync is complete
 */
export const syncThemePreference = async (
  user: UserProfileData,
  theme: 'light' | 'dark' | 'system'
): Promise<void> => {
  try {
    // Check if the theme is different from the user's current preference
    if (user.preferences.theme !== theme) {
      // Update user profile
      await updateUserProfile({
        preferences: {
          ...user.preferences,
          theme
        }
      });
    }
  } catch (error) {
    console.error('Error syncing theme preference:', error);
  }
};

/**
 * Initialize theme based on user preferences
 * 
 * @param user Current user profile data
 * @param setTheme Function to set the theme in the theme provider
 */
export const initializeUserTheme = (
  user: UserProfileData,
  setTheme: (theme: 'light' | 'dark' | 'system') => void
): void => {
  // Get saved theme from localStorage
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
  
  // Get user's preferred theme from profile
  const userTheme = user.preferences.theme;
  
  if (userTheme && (!savedTheme || savedTheme !== userTheme)) {
    // User has a theme preference that differs from localStorage
    setTheme(userTheme);
    localStorage.setItem('theme', userTheme);
  } else if (savedTheme && (!userTheme || savedTheme !== userTheme)) {
    // localStorage has a theme that differs from user preference
    syncThemePreference(user, savedTheme);
  }
  // If they're the same or both undefined, no action needed
};