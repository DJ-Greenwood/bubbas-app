// src/utils/TokenUsageIntegration.ts
'use client';

import { recordTokenUsage, useUsageLimitsWarning } from './recordTokens';
import { getTokenUsageStats } from './tokenTrackingService';
import { useSubscription } from './subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

/**
 * This is a demonstration of how to integrate all token usage services
 * for a complete dashboard solution
 */

// Hook for monitoring token usage in a component
export const useTokenUsageMonitoring = () => {
  const [usageStats, setUsageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const { checkAndWarn } = useUsageLimitsWarning();
  
  // Load initial stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const stats = await getTokenUsageStats();
        setUsageStats(stats);
        
        // Check if user is approaching limits and warn them
        await checkAndWarn();
      } catch (error) {
        console.error('Error loading token usage stats:', error);
        toast({
          title: 'Error',
          description: 'Failed to load usage statistics',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
    
    // Refresh every 5 minutes
    const intervalId = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Calculate percentages for progress bars
  const dailyUsagePercent = usageStats ? 
    Math.min(100, Math.round((usageStats.limits.dailyUsed / usageStats.limits.dailyLimit) * 100)) : 0;
  
  const monthlyUsagePercent = usageStats ? 
    Math.min(100, Math.round((usageStats.limits.monthlyUsed / usageStats.limits.monthlyLimit) * 100)) : 0;
  
  // Check if approaching limits
  const isApproachingDailyLimit = dailyUsagePercent >= 80;
  const isApproachingMonthlyLimit = monthlyUsagePercent >= 80;
  
  // Function to record token usage from API calls
  const recordApiUsage = async (
    usage: { 
      promptTokens: number; 
      completionTokens: number; 
      totalTokens: number 
    },
    chatType: 'emotion' | 'basic' | 'journal' | 'other' = 'basic',
    userPrompt?: string,
    journalEntryId?: string | null,
    model?: string
  ) => {
    try {
      // This function will update all three tracking systems:
      // - Firebase cloud function for backend tracking
      // - tokenPersistenceService for dashboard analytics
      // - tokenTrackingService for usage limits
      await recordTokenUsage(
        usage,
        chatType,
        journalEntryId,
        userPrompt?.substring(0, 50),
        model
      );
      
      // Update local stats
      if (usageStats) {
        setUsageStats((prev: any) => ({
          ...prev,
          lifetime: {
            ...prev.lifetime,
            promptTokens: prev.lifetime.promptTokens + usage.promptTokens,
            completionTokens: prev.lifetime.completionTokens + usage.completionTokens,
            totalTokens: prev.lifetime.totalTokens + usage.totalTokens,
            count: prev.lifetime.count + 1
          },
          limits: {
            ...prev.limits,
            dailyUsed: prev.limits.dailyUsed + 1,
            dailyRemaining: Math.max(0, prev.limits.dailyRemaining - 1),
            monthlyUsed: prev.limits.monthlyUsed + usage.totalTokens,
            monthlyRemaining: Math.max(0, prev.limits.monthlyRemaining - usage.totalTokens)
          }
        }));
      }
      
      // Check limits after recording usage
      await checkAndWarn();
      
      return true;
    } catch (error) {
      console.error('Error recording API usage:', error);
      return false;
    }
  };
  
  // Example usage in a chat component:
  // 1. Call checkAndWarn() before making an API request to check if user has exceeded limits
  // 2. If checkAndWarn() returns true, proceed with API request
  // 3. After API response, call recordApiUsage() with the token counts
  
  return {
    usageStats,
    loading,
    subscription,
    dailyUsagePercent,
    monthlyUsagePercent,
    isApproachingDailyLimit,
    isApproachingMonthlyLimit,
    recordApiUsage,
    checkLimits: checkAndWarn
  };
};

// Example usage:
/*
const ChatComponent = () => {
  const { 
    usageStats, 
    loading, 
    recordApiUsage, 
    checkLimits 
  } = useTokenUsageMonitoring();
  
  const handleSendMessage = async (userMessage: string) => {
    // First check if user has exceeded limits
    const canProceed = await checkLimits();
    if (!canProceed) {
      // User has exceeded limits, don't proceed with API call
      return;
    }
    
    // Make API call to get response
    const response = await fetchAIResponse(userMessage);
    
    // Record token usage
    await recordApiUsage(
      {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      'basic',
      userMessage,
      null,
      'gpt-4o'
    );
    
    // Continue with chat UI update
    // ...
  };
  
  return (
    <div>
      {loading ? (
        <div>Loading usage stats...</div>
      ) : (
        <div>
          <p>Daily usage: {usageStats.limits.dailyUsed} / {usageStats.limits.dailyLimit}</p>
          <p>Monthly tokens: {usageStats.limits.monthlyUsed} / {usageStats.limits.monthlyLimit}</p>
        </div>
      )}
      
      {/* Chat UI components */ //}
 //   </div>
 // );
//};
//