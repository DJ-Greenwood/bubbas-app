// src/hooks/useSubscriptionWithUsage.ts
import { useState, useEffect } from 'react';
import { useSubscription, SubscriptionTier, SUBSCRIPTION_TIERS } from '@/utils/subscriptionService';
import { getUserUsageSummary } from '@/utils/usageService';
import useChatLimits from './useChatLimits';

interface SubscriptionWithUsage {
  // Subscription info
  tier: SubscriptionTier;
  name: string;
  description: string;
  limits: {
    dailyLimit: number | 'Unlimited';
    monthlyTokenLimit: number | 'Unlimited';
    sttMinutes: number;
    ttsMinutes: number;
    maxJournalEntries: number | string;
  };
  features: string[];
  price: string;
  
  // Usage info
  isLoading: boolean;
  hasReachedChatLimit: boolean;
  hasReachedTokenLimit: boolean;
  chatsToday: number;
  chatsRemaining: number | string;
  chatLimitPercentage: number;
  tokensThisMonth: number;
  tokensRemaining: number | string;
  tokenLimitPercentage: number;
  
  // Methods
  checkAndIncrementUsage: () => Promise<boolean>;
  trackTokenUsage: (usage: any, chatType?: string) => Promise<boolean>;
  canUpgrade: boolean;
  shouldShowUpgrade: boolean;
}

export function useSubscriptionWithUsage(): SubscriptionWithUsage {
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  
  const {
    isLoading: isLimitsLoading,
    hasReachedLimit,
    hasReachedTokenLimit,
    chatsUsedToday,
    chatsRemainingToday,
    limitPercentage,
    tokensUsedThisMonth,
    tokensRemainingThisMonth,
    tokenPercentage,
    checkAndIncrementUsage,
    trackTokenUsage
  } = useChatLimits();
  
  // Load usage summary
  useEffect(() => {
    const loadUsageSummary = async () => {
      try {
        setIsLoadingUsage(true);
        const summary = await getUserUsageSummary();
        setUsageSummary(summary);
      } catch (error) {
        console.error('Error loading usage summary:', error);
      } finally {
        setIsLoadingUsage(false);
      }
    };
    
    loadUsageSummary();
    // Refresh every 5 minutes
    const interval = setInterval(loadUsageSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Check if user can upgrade
  const canUpgrade = subscription.tier !== 'pro';
  
  // Determine if we should show upgrade suggestion
  // (> 80% of limits used or limits reached)
  const shouldShowUpgrade = canUpgrade && (
    hasReachedLimit || 
    hasReachedTokenLimit || 
    limitPercentage > 80 || 
    tokenPercentage > 80
  );
  
  return {
    // Subscription info
    tier: subscription.tier,
    name: subscription.name,
    description: subscription.description,
    limits: {
      ...subscription.limits,
      monthlyTokenLimit: subscription.limits.monthlyTokenLimit === 'Unlimited' ? 'Unlimited' : Number(subscription.limits.monthlyTokenLimit),
    },
    features: subscription.features,
    price: subscription.price,
    
    // Usage info
    isLoading: subscriptionLoading || isLimitsLoading || isLoadingUsage,
    hasReachedChatLimit: hasReachedLimit,
    hasReachedTokenLimit: hasReachedTokenLimit,
    chatsToday: chatsUsedToday,
    chatsRemaining: chatsRemainingToday,
    chatLimitPercentage: limitPercentage,
    tokensThisMonth: tokensUsedThisMonth,
    tokensRemaining: tokensRemainingThisMonth,
    tokenLimitPercentage: tokenPercentage,
    
    // Methods
    checkAndIncrementUsage,
    trackTokenUsage,
    canUpgrade,
    shouldShowUpgrade
  };
}

export default useSubscriptionWithUsage;