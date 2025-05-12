// src/hooks/useChatLimits.ts
import { useState, useEffect } from "react";
import { useSubscription } from '@/utils/subscriptionService';
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, getDoc, increment, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from '@/utils/firebaseClient';
import { UserProfileData } from '@/types/UserProfileData';
import { fetchUserProfile, updateUserProfile } from '@/utils/userProfileService';
import { TokenUsage } from '@/utils/TokenDataService';

interface ChatLimits {
  isLoading: boolean;
  hasReachedLimit: boolean;
  hasReachedTokenLimit: boolean;
  limitMessage: string | null;
  tokenLimitMessage: string | null;
  chatsUsedToday: number;
  chatsRemainingToday: number | string;
  limitPercentage: number;
  tokensUsedThisMonth: number;
  tokensRemainingThisMonth: number | string;
  tokenPercentage: number;
  checkAndIncrementUsage: () => Promise<boolean>;
  trackTokenUsage: (usage: TokenUsage, chatType?: string) => Promise<boolean>;
}

export const useChatLimits = (): ChatLimits => {
  const [isLoading, setIsLoading] = useState(true);
  const [chatsUsedToday, setChatsUsedToday] = useState(0);
  const [tokensUsedThisMonth, setTokensUsedThisMonth] = useState(0);
  const [hasReachedLimit, setHasReachedLimit] = useState(false);
  const [hasReachedTokenLimit, setHasReachedTokenLimit] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [tokenLimitMessage, setTokenLimitMessage] = useState<string | null>(null);
  const { subscription } = useSubscription();
  const { toast } = useToast();

  // Load initial usage data
  useEffect(() => {
    const loadUsageData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setIsLoading(false);
          return;
        }

        const userProfile = await fetchUserProfile();
        
        if (!userProfile) {
          console.error("User profile not found");
          setIsLoading(false);
          return;
        }

        // Check if we need to reset daily counters
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastChatDate = userProfile.usage?.lastChatDate 
          ? (userProfile.usage.lastChatDate instanceof Date 
              ? userProfile.usage.lastChatDate.toISOString().split('T')[0] 
              : userProfile.usage.lastChatDate.toDate().toISOString().split('T')[0])
          : null;

        let currentChatsToday = userProfile.usage?.chatsToday || 0;

        // Reset counter if it's a new day
        if (lastChatDate !== today) {
          currentChatsToday = 0;
          // Update the profile with reset counter
          await updateUserProfile({
            usage: {
              ...userProfile.usage,
              chatsToday: 0,
              lastChatDate: serverTimestamp() as any
            }
          });
        }

        // Get monthly token usage
        const currentTokensUsed = userProfile.usage?.monthlyTokens || 0;
        setTokensUsedThisMonth(currentTokensUsed);

        // Check if we need to reset monthly token counter
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const lastResetDate = userProfile.usage?.resetDate 
          ? (userProfile.usage.resetDate instanceof Date 
              ? userProfile.usage.resetDate 
              : userProfile.usage.resetDate.toDate())
          : null;
        
        // Reset monthly counter if we're in a new month
        if (lastResetDate && 
            (lastResetDate.getMonth() !== currentMonth || 
             lastResetDate.getFullYear() !== currentYear)) {
          // Update the profile with reset monthly counter
          await updateUserProfile({
            usage: {
              ...userProfile.usage,
              monthlyTokens: 0,
              resetDate: serverTimestamp() as any
            }
          });
          setTokensUsedThisMonth(0);
        }

        setChatsUsedToday(currentChatsToday);
        
        // Check if user has reached their chat limit
        const dailyLimit = getDailyLimit(subscription.tier);
        if (dailyLimit !== "Unlimited" && currentChatsToday >= dailyLimit) {
          setHasReachedLimit(true);
          setLimitMessage(`You've reached your daily limit of ${dailyLimit} chats for your ${subscription.tier} plan. Please upgrade for more access.`);
        }

        // Check if user has reached their token limit
        const monthlyTokenLimit = getMonthlyTokenLimit(subscription.tier);
        if (monthlyTokenLimit !== "Unlimited" && currentTokensUsed >= monthlyTokenLimit) {
          setHasReachedTokenLimit(true);
          setTokenLimitMessage(`You've reached your monthly token limit of ${monthlyTokenLimit.toLocaleString()} tokens for your ${subscription.tier} plan. Please upgrade for more access.`);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading usage data:", error);
        setIsLoading(false);
      }
    };

    loadUsageData();
  }, [subscription.tier, toast]);

  // Get daily chat limit based on subscription tier
  const getDailyLimit = (tier: string): number | "Unlimited" => {
    switch (tier) {
      case 'free':
        return 10;
      case 'plus':
        return 30;
      case 'pro':
      default:
        return "Unlimited";
    }
  };
  
  // Get monthly token limit based on subscription tier
  const getMonthlyTokenLimit = (tier: string): number | "Unlimited" => {
    switch (tier) {
      case 'free':
        return 10000;
      case 'plus':
        return 50000;
      case 'pro':
      default:
        return "Unlimited";
    }
  };

  // Calculate chats remaining for today
  const chatsRemainingToday = (): number | string => {
    const dailyLimit = getDailyLimit(subscription.tier);
    
    if (dailyLimit === "Unlimited") {
      return "Unlimited";
    }
    
    return Math.max(0, dailyLimit - chatsUsedToday);
  };

  // Calculate tokens remaining for the month
  const tokensRemainingThisMonth = (): number | string => {
    const monthlyLimit = getMonthlyTokenLimit(subscription.tier);
    
    if (monthlyLimit === "Unlimited") {
      return "Unlimited";
    }
    
    return Math.max(0, monthlyLimit - tokensUsedThisMonth);
  };

  // Calculate percentage of chat limit used
  const limitPercentage = (): number => {
    const dailyLimit = getDailyLimit(subscription.tier);
    
    if (dailyLimit === "Unlimited" || dailyLimit === 0) {
      return 0;
    }
    
    return Math.min(100, Math.round((chatsUsedToday / dailyLimit) * 100));
  };
  
  // Calculate percentage of token limit used
  const tokenPercentage = (): number => {
    const monthlyLimit = getMonthlyTokenLimit(subscription.tier);
    
    if (monthlyLimit === "Unlimited" || monthlyLimit === 0) {
      return 0;
    }
    
    return Math.min(100, Math.round((tokensUsedThisMonth / monthlyLimit) * 100));
  };

  // Check if user can send more messages and increment the counter if allowed
  const checkAndIncrementUsage = async (): Promise<boolean> => {
    if (isLoading) {
      return false;
    }

    const dailyLimit = getDailyLimit(subscription.tier);
    const monthlyTokenLimit = getMonthlyTokenLimit(subscription.tier);
    
    // Pro tier has unlimited chats and tokens
    if (dailyLimit === "Unlimited" && monthlyTokenLimit === "Unlimited") {
      await incrementUsageCounter();
      return true;
    }
    
    // Check if user has reached their chat limit
    if (dailyLimit !== "Unlimited" && chatsUsedToday >= dailyLimit) {
      const message = `You've reached your daily limit of ${dailyLimit} chats for your ${subscription.tier} plan. Please upgrade for more access.`;
      setHasReachedLimit(true);
      setLimitMessage(message);
      
      toast({
        title: "Chat Limit Reached",
        description: message,
        variant: "destructive"
      });
      
      return false;
    }
    
    // Check if user has reached their token limit
    if (monthlyTokenLimit !== "Unlimited" && tokensUsedThisMonth >= monthlyTokenLimit) {
      const message = `You've reached your monthly token limit of ${monthlyTokenLimit.toLocaleString()} tokens for your ${subscription.tier} plan. Please upgrade for more access.`;
      setHasReachedTokenLimit(true);
      setTokenLimitMessage(message);
      
      toast({
        title: "Token Limit Reached",
        description: message,
        variant: "destructive"
      });
      
      return false;
    }
    
    // Increment counter and allow the message
    await incrementUsageCounter();
    return true;
  };

  // Increment the usage counter in Firestore
  const incrementUsageCounter = async (): Promise<void> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const userRef = doc(db, 'users', user.uid);
      const today = new Date();
      
      // Update the chat count and last chat date
      await updateDoc(userRef, {
        'usage.chatsToday': increment(1),
        'usage.lastChatDate': today
      });
      
      // Update local state
      setChatsUsedToday(prev => prev + 1);
      
      // Check if we've hit the limit after incrementing
      const dailyLimit = getDailyLimit(subscription.tier);
      if (dailyLimit !== "Unlimited" && chatsUsedToday + 1 >= dailyLimit) {
        setHasReachedLimit(true);
        setLimitMessage(`You've reached your daily limit of ${dailyLimit} chats for your ${subscription.tier} plan. Please upgrade for more access.`);
      }
    } catch (error) {
      console.error("Error incrementing usage counter:", error);
      toast({
        title: "Error",
        description: "Failed to update usage counter. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Track token usage from a chat interaction
  const trackTokenUsage = async (
    usage: TokenUsage,
    chatType: string = 'emotion'
  ): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated");
        return false;
      }
      
      // Track token usage in Firestore
      const userRef = doc(db, 'users', user.uid);
      
      // Update the token usage counters
      await updateDoc(userRef, {
        'usage.monthlyTokens': increment(usage.totalTokens)
      });
      
      // Update local state
      setTokensUsedThisMonth(prev => prev + usage.totalTokens);
      
      // Save detailed token usage to separate collection
      const timestamp = new Date().toISOString();
      const tokenUsageRef = doc(db, 'users', user.uid, 'token_usage', timestamp);
      
      await setDoc(tokenUsageRef, {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        timestamp,
        chatType,
        created: serverTimestamp()
      });
      
      // Check if we've hit the token limit after incrementing
      const monthlyTokenLimit = getMonthlyTokenLimit(subscription.tier);
      if (monthlyTokenLimit !== "Unlimited" && 
          tokensUsedThisMonth + usage.totalTokens >= monthlyTokenLimit) {
        setHasReachedTokenLimit(true);
        setTokenLimitMessage(`You've reached your monthly token limit of ${monthlyTokenLimit.toLocaleString()} tokens for your ${subscription.tier} plan. Please upgrade for more access.`);
      }
      
      return true;
    } catch (error) {
      console.error("Error tracking token usage:", error);
      toast({
        title: "Error",
        description: "Failed to track token usage. Your usage stats may be incomplete.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    isLoading,
    hasReachedLimit,
    hasReachedTokenLimit,
    limitMessage,
    tokenLimitMessage,
    chatsUsedToday,
    chatsRemainingToday: chatsRemainingToday(),
    limitPercentage: limitPercentage(),
    tokensUsedThisMonth,
    tokensRemainingThisMonth: tokensRemainingThisMonth(),
    tokenPercentage: tokenPercentage(),
    checkAndIncrementUsage,
    trackTokenUsage
  };
};

export default useChatLimits;