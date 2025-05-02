// src/utils/subscriptionService.ts
'use client';

import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebaseClient';
import { useState, useEffect } from 'react';

// Define subscription tiers and their limits
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    description: 'Basic access with limited features',
    limits: {
      dailyLimit: 10,
      monthlyTokenLimit: 10000,
      sttMinutes: 5,
      ttsMinutes: 5,
      maxJournalEntries: 50
    },
    features: [
      'Chat with Bubba (Limited Daily)',
      'Basic Mood Tracking',
      'Local-only Memory',
      'Optional Encouraging Texts'
    ],
    price: 'Free'
  },
  plus: {
    name: 'Plus',
    description: 'Enhanced AI experience with more memory and insights',
    limits: {
      dailyLimit: 30,
      monthlyTokenLimit: 50000,
      sttMinutes: 30,
      ttsMinutes: 30,
      maxJournalEntries: 500
    },
    features: [
      'Extended Chat Sessions',
      'Enhanced Mood Tracking & Daily Reflections',
      'Memory Sync Across Devices',
      'AI-Generated Reflection Summaries',
      'Optional Encouraging Texts'
    ],
    price: '$5.99/month'
  },
  pro: {
    name: 'Pro',
    description: 'Full experience with advanced emotional analysis',
    limits: {
      dailyLimit: 100,
      monthlyTokenLimit: 200000,
      sttMinutes: 120,
      ttsMinutes: 120,
      maxJournalEntries: 'Unlimited'
    },
    features: [
      'Unlimited Conversations',
      'Full Chat & Journal History Sync',
      'AI Sentiment Feedback & Emotional Voice Insights',
      'Advanced Memory & Long-Term Reflection Trends',
      'Optional Encouraging Texts'
    ],
    price: '$9.99/month'
  }
};

// Subscription tier types
export type SubscriptionTier = 'free' | 'plus' | 'pro';

// Interface for subscription data
export interface SubscriptionData {
  tier: SubscriptionTier;
  name: string;
  description: string;
  limits: {
    dailyLimit: number;
    monthlyTokenLimit: number;
    sttMinutes: number;
    ttsMinutes: number;
    maxJournalEntries: number | string;
  };
  features: string[];
  price: string;
  activationDate?: string;
  expirationDate?: string;
  status?: 'active' | 'trial' | 'expired';
  trialEnds?: string;
}

// Get the user's current subscription tier
export const getUserTier = async (): Promise<SubscriptionData> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Important: Include the tier property here!
      return { 
        ...SUBSCRIPTION_TIERS.free,
        tier: 'free' 
      };
    }
    
    const userData = userDoc.data();
    const tier = (userData.subscription?.tier || 'free') as SubscriptionTier;
    const tierData = SUBSCRIPTION_TIERS[tier];
    
    // Add subscription dates from user data
    return {
      ...tierData,
      tier,
      activationDate: userData.subscription?.activationDate || '',
      expirationDate: userData.subscription?.expirationDate || '',
      status: userData.subscription?.status || 'active'
    };
  } catch (error) {
    console.error('Error getting user tier:', error);
    // Important: Include the tier property here!
    return { 
      ...SUBSCRIPTION_TIERS.free,
      tier: 'free' 
    };
  }
};

// Update the user's subscription tier
export const updateSubscriptionTier = async (
  tier: SubscriptionTier,
  expirationDate?: string
): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    const now = new Date().toISOString();
    const userRef = doc(db, 'users', user.uid);
    
    await updateDoc(userRef, {
      'subscription.tier': tier,
      'subscription.activationDate': now,
      'subscription.expirationDate': expirationDate || '',
      'subscription.status': 'active'
    });
    
    return true;
  } catch (error) {
    console.error('Error updating subscription tier:', error);
    return false;
  }
};

// Start a free trial for a tier
export const startFreeTrial = async (tier: 'plus' | 'pro'): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial
    
    const userRef = doc(db, 'users', user.uid);
    
    await updateDoc(userRef, {
      'subscription.tier': tier,
      'subscription.activationDate': now.toISOString(),
      'subscription.expirationDate': trialEndDate.toISOString(),
      'subscription.status': 'trial',
      'subscription.trialEnds': trialEndDate.toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error starting free trial:', error);
    return false;
  }
};

// Check if a feature is available for the user's current tier
export const isFeatureAvailable = async (
  featureName: string
): Promise<boolean> => {
  try {
    const tier = await getUserTier();
    
    // Special case for features that all tiers have
    if (featureName === 'chat' || featureName === 'journal') {
      return true;
    }
    
    // Feature availability based on tier
    switch (featureName) {
      case 'memory':
        return true; // All tiers have some form of memory
      case 'cross_device_sync':
        return tier.tier !== 'free';
      case 'ai_reflections':
        return tier.tier !== 'free';
      case 'unlimited_history':
        return tier.tier === 'pro';
      case 'emotional_insights':
        return tier.tier === 'pro';
      case 'tts':
        return true; // All tiers have some TTS, but different limits
      case 'stt':
        return true; // All tiers have some STT, but different limits
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking feature availability:', error);
    return false;
  }
};

// Hook to monitor user's subscription in real-time
export const useSubscription = () => {
  // Important: Initialize with the tier property!
  const [subscription, setSubscription] = useState<SubscriptionData>({
    ...SUBSCRIPTION_TIERS.free,
    tier: 'free'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setError('No authenticated user');
      return () => {};
    }
    
    const userRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const tier = (userData.subscription?.tier || 'free') as SubscriptionTier;
          const tierData = SUBSCRIPTION_TIERS[tier];
          
          setSubscription({
            ...tierData,
            tier,
            activationDate: userData.subscription?.activationDate || '',
            expirationDate: userData.subscription?.expirationDate || '',
            status: userData.subscription?.status || 'active'
          });
        } else {
          // Important: Include the tier property here!
          setSubscription({
            ...SUBSCRIPTION_TIERS.free,
            tier: 'free'
          });
        }
        
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error getting subscription:', err);
        setError('Failed to load subscription data');
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, []);
  
  return { subscription, loading, error };
};

// Calculate days remaining in subscription or trial
export const getDaysRemaining = (expirationDate?: string): number => {
  if (!expirationDate) return 0;
  
  const expDate = new Date(expirationDate);
  const now = new Date();
  
  // Return 0 if expired
  if (expDate <= now) return 0;
  
  // Calculate days difference
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};