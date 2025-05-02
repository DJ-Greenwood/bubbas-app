// src/utils/tokenTrackingService.ts
'use client';

import { doc, getDoc, setDoc, updateDoc, collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseClient';
import { getUserTier } from './subscriptionService';

// Interface for token usage data
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp?: string;
}

// Record token usage for a single chat/journal entry
export const recordTokenUsage = async (usage: TokenUsage): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return false;
    }

    const uid = user.uid;
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM

    // Reference to the user's token usage document
    const usageRef = doc(db, 'users', uid, 'stats', 'tokenUsage');
    
    // Get existing usage data
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      // Create new usage document if it doesn't exist
      await setDoc(usageRef, {
        daily: {
          [today]: {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            count: 1,
            lastUpdated: now.toISOString()
          }
        },
        monthly: {
          [currentMonth]: {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            count: 1,
            lastUpdated: now.toISOString()
          }
        },
        lifetime: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          count: 1,
          lastUpdated: now.toISOString()
        }
      });
    } else {
      // Update existing usage document
      const usageData = usageDoc.data();
      
      // Daily data
      const dailyData = usageData.daily?.[today] || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        count: 0
      };
      
      // Monthly data
      const monthlyData = usageData.monthly?.[currentMonth] || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        count: 0
      };
      
      // Lifetime data
      const lifetimeData = usageData.lifetime || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        count: 0
      };
      
      // Update with new values
      await updateDoc(usageRef, {
        [`daily.${today}.promptTokens`]: dailyData.promptTokens + usage.promptTokens,
        [`daily.${today}.completionTokens`]: dailyData.completionTokens + usage.completionTokens,
        [`daily.${today}.totalTokens`]: dailyData.totalTokens + usage.totalTokens,
        [`daily.${today}.count`]: dailyData.count + 1,
        [`daily.${today}.lastUpdated`]: now.toISOString(),
        
        [`monthly.${currentMonth}.promptTokens`]: monthlyData.promptTokens + usage.promptTokens,
        [`monthly.${currentMonth}.completionTokens`]: monthlyData.completionTokens + usage.completionTokens,
        [`monthly.${currentMonth}.totalTokens`]: monthlyData.totalTokens + usage.totalTokens,
        [`monthly.${currentMonth}.count`]: monthlyData.count + 1,
        [`monthly.${currentMonth}.lastUpdated`]: now.toISOString(),
        
        'lifetime.promptTokens': lifetimeData.promptTokens + usage.promptTokens,
        'lifetime.completionTokens': lifetimeData.completionTokens + usage.completionTokens,
        'lifetime.totalTokens': lifetimeData.totalTokens + usage.totalTokens,
        'lifetime.count': lifetimeData.count + 1,
        'lifetime.lastUpdated': now.toISOString()
      });
    }
    
    // Also record individual usage in history collection
    const historyRef = collection(db, 'users', uid, 'tokenHistory');
    await addDoc(historyRef, {
      ...usage,
      timestamp: serverTimestamp(),
      created: now.toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error recording token usage:', error);
    return false;
  }
};

// Get detailed token usage statistics for the user
export const getTokenUsageStats = async (): Promise<{
  daily: Record<string, any>;
  monthly: Record<string, any>;
  lifetime: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    count: number;
  };
  limits: {
    dailyRemaining: number;
    monthlyRemaining: number;
    dailyUsed: number;
    monthlyUsed: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM
    
    // Get tier limits
    const tier = await getUserTier();
    const { dailyLimit, monthlyTokenLimit } = tier.limits;
    
    // Get usage data
    const usageRef = doc(db, 'users', user.uid, 'stats', 'tokenUsage');
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      return {
        daily: {},
        monthly: {},
        lifetime: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          count: 0
        },
        limits: {
          dailyRemaining: dailyLimit,
          monthlyRemaining: monthlyTokenLimit,
          dailyUsed: 0,
          monthlyUsed: 0,
          dailyLimit,
          monthlyLimit: monthlyTokenLimit
        }
      };
    }
    
    const usageData = usageDoc.data();
    const dailyUsage = usageData.daily?.[today]?.totalTokens || 0;
    const dailyCount = usageData.daily?.[today]?.count || 0;
    const monthlyUsage = usageData.monthly?.[currentMonth]?.totalTokens || 0;
    
    return {
      daily: usageData.daily || {},
      monthly: usageData.monthly || {},
      lifetime: usageData.lifetime || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        count: 0
      },
      limits: {
        dailyRemaining: Math.max(0, dailyLimit - dailyCount),
        monthlyRemaining: Math.max(0, monthlyTokenLimit - monthlyUsage),
        dailyUsed: dailyCount,
        monthlyUsed: monthlyUsage,
        dailyLimit,
        monthlyLimit: monthlyTokenLimit
      }
    };
  } catch (error) {
    console.error('Error getting token usage stats:', error);
    throw error;
  }
};

// Check if the user has exceeded their limits for the current period
export const checkTokenLimits = async (): Promise<{
  canUseService: boolean;
  message?: string;
  limits?: {
    dailyRemaining: number;
    monthlyRemaining: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
}> => {
  try {
    const stats = await getTokenUsageStats();
    const { limits } = stats;
    
    // Check if daily limit is exceeded
    if (limits.dailyRemaining <= 0) {
      return {
        canUseService: false,
        message: `You've reached your daily chat limit. This will reset at midnight.`,
        limits
      };
    }
    
    // Check if monthly token limit is exceeded
    if (limits.monthlyRemaining <= 0) {
      return {
        canUseService: false,
        message: `You've reached your monthly token limit. Consider upgrading your plan for more tokens.`,
        limits
      };
    }
    
    return {
      canUseService: true,
      limits
    };
  } catch (error) {
    console.error('Error checking token limits:', error);
    // Default to allowing service on error
    return { canUseService: true };
  }
};

// Get token usage summary for display on profile
export const getTokenUsageSummary = async (): Promise<{
  daily: { used: number; limit: number; percent: number };
  monthly: { used: number; limit: number; percent: number };
  lifetime: number;
}> => {
  try {
    const stats = await getTokenUsageStats();
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    
    const dailyUsed = stats.daily[today]?.count || 0;
    const monthlyUsed = stats.monthly[currentMonth]?.totalTokens || 0;
    const lifetimeTokens = stats.lifetime.totalTokens || 0;
    
    return {
      daily: {
        used: dailyUsed,
        limit: stats.limits.dailyLimit,
        percent: Math.min(100, Math.round((dailyUsed / stats.limits.dailyLimit) * 100) || 0)
      },
      monthly: {
        used: monthlyUsed,
        limit: stats.limits.monthlyLimit,
        percent: Math.min(100, Math.round((monthlyUsed / stats.limits.monthlyLimit) * 100) || 0)
      },
      lifetime: lifetimeTokens
    };
  } catch (error) {
    console.error('Error getting usage summary:', error);
    return {
      daily: { used: 0, limit: 0, percent: 0 },
      monthly: { used: 0, limit: 0, percent: 0 },
      lifetime: 0
    };
  }
};