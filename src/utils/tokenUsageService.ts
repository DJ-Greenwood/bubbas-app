// src/utils/tokenUsageService.ts
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebaseClient';

// Define tier limits based on your main page
const TIER_LIMITS = {
  free: {
    dailyChatLimit: 10,
    monthlyTokenLimit: 10000,
    features: ['basic_chat', 'basic_mood_tracking', 'local_memory']
  },
  plus: {
    dailyChatLimit: 50,
    monthlyTokenLimit: 50000,
    features: ['extended_chat', 'enhanced_mood_tracking', 'cross_device_memory', 'ai_reflections']
  },
  pro: {
    dailyChatLimit: Infinity,
    monthlyTokenLimit: 200000,
    features: ['unlimited_chat', 'full_history_sync', 'sentiment_feedback', 'advanced_memory']
  }
};

// Get current user tier
export const getUserTier = async (userId: string): Promise<'free' | 'plus' | 'pro'> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return 'free'; // Default tier
    }
    
    const userData = userDoc.data();
    return (userData.subscription?.tier || 'free') as 'free' | 'plus' | 'pro';
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'free'; // Default to free on error
  }
};

// Check if user has reached their tier limits
export const checkUserLimits = async (userId: string): Promise<{
  canUseChat: boolean;
  remainingTokens: number;
  message?: string;
}> => {
  try {
    // Get user tier
    const tier = await getUserTier(userId);
    const limits = TIER_LIMITS[tier];
    
    // Get today's usage
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = today.substring(0, 7); // YYYY-MM
    
    // Get daily chat count
    const chatsRef = collection(db, 'journals', userId, 'entries');
    const todayQuery = query(
      chatsRef,
      where('createdAt', '>=', today),
      where('createdAt', '<', today + 'T23:59:59.999Z')
    );
    const chatSnapshot = await getDocs(todayQuery);
    const chatCount = chatSnapshot.size;
    
    // Get monthly token usage
    const usageRef = doc(db, 'users', userId, 'stats', 'tokenUsage');
    const usageDoc = await getDoc(usageRef);
    
    let monthlyTokens = 0;
    
    if (usageDoc.exists()) {
      const usageData = usageDoc.data();
      monthlyTokens = usageData.monthly?.[currentMonth]?.totalTokens || 0;
    }
    
    // Check limits
    const reachedChatLimit = chatCount >= limits.dailyChatLimit;
    const reachedTokenLimit = monthlyTokens >= limits.monthlyTokenLimit;
    
    const remainingTokens = Math.max(0, limits.monthlyTokenLimit - monthlyTokens);
    
    if (reachedChatLimit) {
      return {
        canUseChat: false,
        remainingTokens,
        message: `You've reached your daily chat limit for the ${tier} tier. Consider upgrading for more access.`
      };
    }
    
    if (reachedTokenLimit) {
      return {
        canUseChat: false,
        remainingTokens: 0,
        message: `You've reached your monthly token limit for the ${tier} tier. Consider upgrading for more access.`
      };
    }
    
    return {
      canUseChat: true,
      remainingTokens
    };
  } catch (error) {
    console.error('Error checking user limits:', error);
    return {
      canUseChat: true, // Default to allowing usage on error
      remainingTokens: 1000
    };
  }
};

// Record token usage after a chat
export const recordTokenUsage = async (
  userId: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number
): Promise<void> => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = today.substring(0, 7); // YYYY-MM
    
    // Reference to the user's token usage document
    const usageRef = doc(db, 'users', userId, 'stats', 'tokenUsage');
    
    // Get existing usage data
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      // Create new usage document if it doesn't exist
      await setDoc(usageRef, {
        daily: {
          [today]: {
            promptTokens,
            completionTokens,
            totalTokens,
            lastUpdated: now.toISOString()
          }
        },
        monthly: {
          [currentMonth]: {
            promptTokens,
            completionTokens,
            totalTokens,
            lastUpdated: now.toISOString()
          }
        },
        lifetime: {
          promptTokens,
          completionTokens,
          totalTokens,
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
        totalTokens: 0
      };
      
      // Monthly data
      const monthlyData = usageData.monthly?.[currentMonth] || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      };
      
      // Lifetime data
      const lifetimeData = usageData.lifetime || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      };
      
      // Update with new values
      await updateDoc(usageRef, {
        [`daily.${today}.promptTokens`]: dailyData.promptTokens + promptTokens,
        [`daily.${today}.completionTokens`]: dailyData.completionTokens + completionTokens,
        [`daily.${today}.totalTokens`]: dailyData.totalTokens + totalTokens,
        [`daily.${today}.lastUpdated`]: now.toISOString(),
        
        [`monthly.${currentMonth}.promptTokens`]: monthlyData.promptTokens + promptTokens,
        [`monthly.${currentMonth}.completionTokens`]: monthlyData.completionTokens + completionTokens,
        [`monthly.${currentMonth}.totalTokens`]: monthlyData.totalTokens + totalTokens,
        [`monthly.${currentMonth}.lastUpdated`]: now.toISOString(),
        
        'lifetime.promptTokens': lifetimeData.promptTokens + promptTokens,
        'lifetime.completionTokens': lifetimeData.completionTokens + completionTokens,
        'lifetime.totalTokens': lifetimeData.totalTokens + totalTokens,
        'lifetime.lastUpdated': now.toISOString()
      });
    }
    
    // Also record individual chat for history
    const usageHistoryRef = collection(db, 'users', userId, 'stats', 'tokenUsage', 'history');
    const historyDoc = doc(usageHistoryRef);
    
    await setDoc(historyDoc, {
      timestamp: now.toISOString(),
      promptTokens,
      completionTokens,
      totalTokens
    });
    
  } catch (error) {
    console.error('Error recording token usage:', error);
  }
};

// Get user's usage statistics
export const getUserUsageStats = async (userId: string): Promise<{
  daily: Record<string, any>;
  monthly: Record<string, any>;
  lifetime: Record<string, any>;
}> => {
  try {
    const usageRef = doc(db, 'users', userId, 'stats', 'tokenUsage');
    const usageDoc = await getDoc(usageRef);
    
    if (!usageDoc.exists()) {
      return {
        daily: {},
        monthly: {},
        lifetime: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
    }
    
    const usageData = usageDoc.data();
    return {
      daily: usageData.daily || {},
      monthly: usageData.monthly || {},
      lifetime: usageData.lifetime || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  } catch (error) {
    console.error('Error getting user usage stats:', error);
    return {
      daily: {},
      monthly: {},
      lifetime: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }
};