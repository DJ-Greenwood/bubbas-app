'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { auth } from '@/utils/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchUserProfile } from '@/utils/userProfileService';
import { initializeUserTheme } from '@/utils/themeService';

const ThemeToggleNav: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(auth.currentUser);
  
  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Initialize theme based on user preferences
  useEffect(() => {
    const syncUserTheme = async () => {
      if (user) {
        try {
          const userProfile = await fetchUserProfile();
          if (userProfile) {
            initializeUserTheme(userProfile, setTheme);
          }
        } catch (error) {
          console.error('Error loading user theme preferences:', error);
        }
      }
    };
    
    syncUserTheme();
  }, [user, setTheme]);
  
  return <ThemeToggle />;
};

export default ThemeToggleNav;