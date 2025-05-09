// src/hooks/useSubscriptionLimits.ts

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/utils/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { getTokenUsageStats, checkTokenLimits } from '@/utils/TokenDataService';
import { SUBSCRIPTION_TIERS, useSubscription, SubscriptionTier } from '@/utils/subscriptionService';

export const useSubscriptionLimits = () => {
  // State
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [dailyChatsUsed, setDailyChatsUsed] = useState<number>(0);
  const [monthlyTokensUsed, setMonthlyTokensUsed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Hooks
  const { subscription } = useSubscription();
  const { toast } = useToast();
  
  // Load current usage statistics
  const loadUsageStats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const stats = await getTokenUsageStats();
      
      setDailyChatsUsed(stats.limits.dailyUsed);
      setMonthlyTokensUsed(stats.limits.monthlyUsed);
      
      // Check if user has reached their limits
      if (stats.limits.dailyRemaining <= 0) {
        setLimitError(`You've reached your daily chat limit of ${stats.limits.dailyLimit}. This will reset at midnight.`);
      } else if (stats.limits.monthlyRemaining <= 0) {
        setLimitError(`You've reached your monthly token limit of ${stats.limits.monthlyLimit}. This will reset at the beginning of the month.`);
      } else {
        setLimitError(null);
      }
    } catch (error) {
      console.error('Error loading usage stats:', error);
      // Don't set limit error on failure to load
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Check if the user has reached their limits before sending a message
  const checkLimits = useCallback(async (): Promise<boolean> => {
    try {
      const { canUseService, message } = await checkTokenLimits();
      
      if (!canUseService) {
        setLimitError(message ?? null);
        
        toast({
          title: "Usage Limit Reached",
          description: message,
          variant: "destructive"
        });
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking limits:', error);
      // Default to allowing on error
      return true;
    }
  }, [toast]);
  
  // Increment usage counter after successful message
  const incrementUsage = useCallback(() => {
    setDailyChatsUsed(prev => prev + 1);
    
    // Check if we're approaching limits
    const currentTier = subscription.tier;
    const dailyLimit = SUBSCRIPTION_TIERS[currentTier].limits.dailyLimit;
    
    if (dailyChatsUsed >= dailyLimit - 3 && dailyChatsUsed < dailyLimit) {
      // Approaching daily limit
      toast({
        title: "Approaching Daily Limit",
        description: `You have ${dailyLimit - dailyChatsUsed} chats remaining today.`,
        variant: "default"
      });
    }
  }, [dailyChatsUsed, subscription.tier, toast]);
  
  // Get remaining chats for display
  const getRemainingChats = useCallback((): number | string => {
    const currentTier = subscription.tier;
    const dailyLimit = SUBSCRIPTION_TIERS[currentTier].limits.dailyLimit;
    
    if (currentTier === 'pro') {
      return "Unlimited";
    }
    
    return Math.max(0, dailyLimit - dailyChatsUsed);
  }, [dailyChatsUsed, subscription.tier]);
  
  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      
      if (user) {
        loadUsageStats();
      }
    });
    
    return () => unsubscribe();
  }, [loadUsageStats]);
  
  // Refresh usage stats periodically
  useEffect(() => {
    if (isAuthenticated) {
      loadUsageStats();
      
      // Refresh every 5 minutes
      const intervalId = setInterval(loadUsageStats, 5 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, loadUsageStats]);
  
  return {
    // State
    limitError,
    setLimitError,
    isAuthenticated,
    dailyChatsUsed,
    monthlyTokensUsed,
    isLoading,
    subscriptionTier: subscription.tier,
    
    // Methods
    checkLimits,
    incrementUsage,
    getRemainingChats,
    loadUsageStats
  };
};