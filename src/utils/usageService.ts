// src/utils/usageService.ts
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  Timestamp,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db, auth } from './firebaseClient';
import { saveTokenUsage, TokenUsage } from './TokenDataService';
import { UserProfileData } from '@/types/UserProfileData';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from './subscriptionService';

interface UsageSummary {
  chatsToday: number;
  dailyLimit: number | 'Unlimited';
  dailyRemaining: number | 'Unlimited';
  percentageUsed: number;
  tokensThisMonth: number;
  tokenLimit: number | 'Unlimited';
  tokensRemaining: number | 'Unlimited';
  lastResetDate: string;
  nextResetDate: string;
}

/**
 * Get current usage and limits for the user
 */
export const getUserUsageSummary = async (): Promise<UsageSummary | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    // Get user profile to check subscription tier
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data() as UserProfileData;
    const tier = userData.subscription?.tier || 'free';
    
    // Get tier limits
    const tierLimits = SUBSCRIPTION_TIERS[tier as SubscriptionTier].limits;
    
    // Calculate chats remaining
    const chatsToday = userData.usage?.chatsToday || 0;
    const dailyLimit = tier === 'pro' ? 'Unlimited' : tierLimits.dailyLimit;
    
    const dailyRemaining = dailyLimit === 'Unlimited' 
      ? 'Unlimited' 
      : Math.max(0, dailyLimit - chatsToday);
      
    const percentageUsed = dailyLimit === 'Unlimited' 
      ? 0 
      : Math.min(100, Math.round((chatsToday / dailyLimit) * 100));
    
    // Calculate tokens usage
    const tokensThisMonth = userData.usage?.monthlyTokens || 0;
    const tokenLimit = tier === 'pro' 
      ? 'Unlimited' 
      : tierLimits.monthlyTokenLimit;
      
    const tokensRemaining =
      tokenLimit === 'Unlimited'
        ? 'Unlimited'
        : Math.max(0, (tokenLimit as number) - tokensThisMonth);

    const percentageUsedTokens =
      tokenLimit === 'Unlimited'
        ? 0
        : Math.min(100, (tokensThisMonth / (tokenLimit as number)) * 100);
    
    // Calculate reset dates
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // For daily limit, reset is tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // For monthly limit, reset is first day of next month
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const formattedNextResetDate = firstDayNextMonth.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    // Get last reset date from user profile
    const lastResetDate = userData.usage?.resetDate 
      ? (userData.usage.resetDate instanceof Timestamp 
          ? userData.usage.resetDate.toDate().toISOString() 
          : userData.usage.resetDate.toISOString())
      : now.toISOString();
    
    return {
      chatsToday,
      dailyLimit,
      dailyRemaining,
      percentageUsed: percentageUsedTokens,
      tokensThisMonth,
      tokenLimit: tokenLimit as number | 'Unlimited',
      tokensRemaining,
      lastResetDate,
      nextResetDate: formattedNextResetDate
    };
  } catch (error) {
    console.error("Error getting usage summary:", error);
    return null;
  }
};

/**
 * Track token usage and update user profile
 */
export const trackTokenUsage = async (
  usage: TokenUsage,
  chatType: 'emotion' | 'basic' | 'journal' | 'other' = 'emotion',
  journalEntryId?: string,
  userPrompt?: string
): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return false;
    }
    
    // Save detailed token usage record
    await saveTokenUsage(
      usage,
      chatType,
      journalEntryId,
      userPrompt
    );
    
    // Update aggregate token stats in user profile
    const userRef = doc(db, 'users', user.uid);
    
    // Check if we need to reset monthly counter
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.error("User document not found");
      return false;
    }
    
    const userData = userSnap.data() as UserProfileData;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let lastResetDate = now;
    if (userData.usage?.resetDate) {
      lastResetDate = userData.usage.resetDate instanceof Timestamp 
        ? userData.usage.resetDate.toDate() 
        : userData.usage.resetDate;
    }
    
    const lastResetMonth = lastResetDate.getMonth();
    const lastResetYear = lastResetDate.getFullYear();
    
    // If we're in a new month compared to the last reset, zero out the monthly counter
    if (currentMonth !== lastResetMonth || currentYear !== lastResetYear) {
      await updateDoc(userRef, {
        'usage.monthlyTokens': usage.totalTokens,
        'usage.resetDate': serverTimestamp()
      });
    } else {
      // Otherwise just increment the existing counter
      await updateDoc(userRef, {
        'usage.monthlyTokens': increment(usage.totalTokens)
      });
    }
    
    // Check if we're approaching the limit and should warn the user
    // This could be implemented based on your notification system
    
    return true;
  } catch (error) {
    console.error("Error tracking token usage:", error);
    return false;
  }
};

/**
 * Check if user has exceeded their token limit
 */
export const checkTokenLimit = async (): Promise<{
  hasReachedLimit: boolean;
  message?: string;
  tokenLimit?: number | 'Unlimited';
  tokensUsed?: number;
  tokensRemaining?: number | 'Unlimited';
}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return { hasReachedLimit: false };
    }
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error("User document not found");
      return { hasReachedLimit: false };
    }
    
    const userData = userSnap.data() as UserProfileData;
    const tier = userData.subscription?.tier || 'free';
    const tierLimits = SUBSCRIPTION_TIERS[tier as SubscriptionTier].limits;
    
    // Pro tier has unlimited tokens
    if (tier === 'pro') {
      return {
        hasReachedLimit: false,
        tokenLimit: 'Unlimited',
        tokensUsed: userData.usage?.monthlyTokens || 0,
        tokensRemaining: 'Unlimited'
      };
    }
    
    const tokenLimit = tierLimits.monthlyTokenLimit;
    const tokensUsed = userData.usage?.monthlyTokens || 0;
    const tokensRemaining =
      tokenLimit === 'Unlimited'
        ? 'Unlimited'
        : Math.max(0, (typeof tokenLimit === 'number' ? tokenLimit : 0) - tokensUsed);
    
    // Check if user is over limit
    if (typeof tokenLimit === 'number' && tokensUsed >= tokenLimit) {
      return {
        hasReachedLimit: true,
        message: `You've reached your monthly token limit of ${tokenLimit} for your ${tier} plan. Please upgrade for more access.`,
        tokenLimit: tokenLimit as number | 'Unlimited',
        tokensUsed,
        tokensRemaining: 0
      };
    }
    
    // Check if user is approaching limit (80% or more)
    if (typeof tokenLimit === 'number') {
      const percentUsed = (tokensUsed / tokenLimit) * 100;
      if (percentUsed >= 80) {
        return {
          hasReachedLimit: false,
          message: `You're approaching your monthly token limit (${Math.round(percentUsed)}% used). You have ${tokensRemaining} tokens remaining for this month.`,
          tokenLimit,
          tokensUsed,
          tokensRemaining
        };
      }
    }
    
    return {
      hasReachedLimit: false,
      tokenLimit: tokenLimit as number | 'Unlimited',
      tokensUsed,
      tokensRemaining
    };
  } catch (error) {
    console.error("Error checking token limit:", error);
    return { hasReachedLimit: false };
  }
};

/**
 * Reset daily chat counter
 */
export const resetDailyChatCounter = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return false;
    }
    
    const userRef = doc(db, 'users', user.uid);
    
    await updateDoc(userRef, {
      'usage.chatsToday': 0,
      'usage.lastChatDate': serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error resetting daily chat counter:", error);
    return false;
  }
};

/**
 * Get user's chat history for analytics/dashboard
 */
export const getUserChatHistory = async (
  limit: number = 10,
  offset: number = 0
): Promise<any[]> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return [];
    }
    
    // Query journal entries
    const journalRef = collection(db, 'users', user.uid, 'journal');
    const journalQuery = query(
      journalRef,
      orderBy('timestamp', 'desc'),
    );
    
    const snapshot = await getDocs(journalQuery);
    
    if (snapshot.empty) {
      return [];
    }
    
    // Get entries with pagination (client-side paging since Firestore doesn't have offset)
    const entries = [];
    let count = 0;
    
    for (const doc of snapshot.docs) {
      if (count >= offset && entries.length < limit) {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      }
      count++;
      
      if (entries.length >= limit) {
        break;
      }
    }
    
    return entries;
  } catch (error) {
    console.error("Error getting chat history:", error);
    return [];
  }
};