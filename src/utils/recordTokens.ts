// src/utils/recordTokens.ts
'use client';

import { httpsCallable } from "firebase/functions";
import { functions } from './firebaseClient';
import { useToast } from "@/hooks/use-toast";
import React from "react";

// Structure of token usage data
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Firebase Cloud Function for recording token usage
const recordTokenUsageFunction = httpsCallable(functions, "recordTokenUsage");

// Firebase Cloud Function for checking token limits
const checkTokenLimitsFunction = httpsCallable(functions, "checkTokenLimits");

// Record token usage after a successful API call
export const recordTokenUsage = async (usage: TokenUsage): Promise<boolean> => {
  if (!usage || typeof usage.totalTokens !== 'number') {
    console.error('Invalid token usage data:', usage);
    return false;
  }
  
  try {
    await recordTokenUsageFunction({ usage });
    return true;
  } catch (error) {
    console.error('Error recording token usage:', error);
    return false;
  }
};

// Check if the user has exceeded their tier limits
export const checkUsageLimits = async (): Promise<{
  canProceed: boolean;
  message?: string;
  limits?: {
    dailyRemaining: number;
    monthlyRemaining: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
}> => {
  try {
    const result = await checkTokenLimitsFunction();
    const data = result.data as any;
    
    return {
      canProceed: data.canUseService,
      message: data.message,
      limits: data.limits
    };
  } catch (error) {
    console.error('Error checking usage limits:', error);
    // Default to allowing usage on error
    return { canProceed: true };
  }
};

// Hook for showing limit warnings
export const useUsageLimitsWarning = () => {
  const { toast } = useToast();
  
  const checkAndWarn = async (): Promise<boolean> => {
    try {
      const limitCheck = await checkUsageLimits();
      
      // If user has exceeded limits, show a blocking error
      if (!limitCheck.canProceed) {
        toast({
          title: "Usage Limit Reached",
          description: limitCheck.message || "You've reached your usage limit. Please upgrade your plan for more access.",
          variant: "destructive"
        });
        return false;
      }
      
      // If user is approaching limits, show a warning
      if (limitCheck.limits) {
        const { dailyRemaining, monthlyRemaining, dailyLimit, monthlyLimit } = limitCheck.limits;
        const dailyPercentUsed = ((dailyLimit - dailyRemaining) / dailyLimit) * 100;
        const monthlyPercentUsed = ((monthlyLimit - monthlyRemaining) / monthlyLimit) * 100;
        
        // Warn at 80% usage
        if (dailyPercentUsed >= 80 || monthlyPercentUsed >= 80) {
          toast({
            title: "Approaching Usage Limit",
            description: dailyPercentUsed >= 80
              ? `You've used ${Math.round(dailyPercentUsed)}% of your daily chat limit.`
              : `You've used ${Math.round(monthlyPercentUsed)}% of your monthly token limit.`,
            variant: "default"
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking limits:', error);
      return true; // Allow usage on error
    }
  };
  
  return { checkAndWarn };
};

// Custom hook for getting usage statistics
export const useUsageStats = () => {
  const [isChecking, setIsChecking] = React.useState(false);
  
  const getRemainingUsage = async (): Promise<{
    dailyRemaining: number;
    monthlyRemaining: number;
    dailyLimit: number;
    monthlyLimit: number;
  } | null> => {
    setIsChecking(true);
    try {
      const limitCheck = await checkUsageLimits();
      return limitCheck.limits || null;
    } catch (error) {
      console.error('Error getting remaining usage:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  };
  
  return { getRemainingUsage, isChecking };
};