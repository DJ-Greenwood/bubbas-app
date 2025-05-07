import { useState, useEffect } from "react";
import { useSubscription } from '@/utils/subscriptionService';
import { useToast } from "@/hooks/use-toast";
import { getUserDoc, getCurrentUserUid } from '@/utils/firebaseDataService';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '@/utils/firebaseClient';
import { updateUserProfile } from '@/utils/userProfileService';

// Import or define the SubscriptionTier type
export type SubscriptionTier = 'free' | 'plus' | 'pro';

export const useSubscriptionLimits = () => {
  const [dailyChatsUsed, setDailyChatsUsed] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { subscription } = useSubscription();
  const { toast } = useToast();

  // Load daily chat usage when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get the current user's daily usage
        const uid = getCurrentUserUid();
        const userDoc = await getUserDoc(uid);
        if (userDoc?.usage?.chatsToday) {
          setDailyChatsUsed(userDoc.usage.chatsToday);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    // Check authentication state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        loadUserData();
      } else {
        setIsAuthenticated(false);
        // Reset state for unauthenticated users
        setDailyChatsUsed(0);
      }
    });

    return () => unsubscribe();
  }, []);

  // Get daily limit based on subscription tier
  const getDailyLimit = (): number => {
    switch (subscription.tier) {
      case 'free':
        return 10;
      case 'plus':
        return 30;
      case 'pro':
      default:
        return Infinity;
    }
  };

  // Check if user can send more messages
  const checkLimits = (): boolean => {
    const dailyLimit = getDailyLimit();
    
    // Pro tier has unlimited chats
    if (dailyLimit === Infinity) return true;
    
    // Check if user has reached their limit
    if (dailyChatsUsed >= dailyLimit) {
      const limitMessage = `You've reached your daily chat limit for your ${subscription.tier} plan. Please upgrade for more chats.`;
      setLimitError(limitMessage);
      toast({
        title: "Usage Limit Reached",
        description: limitMessage,
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  // Increment usage count after a successful chat
  const incrementUsage = (): void => {
    setDailyChatsUsed(prev => prev + 1);
  };

  // Calculate remaining chats for the day
  const getRemainingChats = (): number | string => {
    const dailyLimit = getDailyLimit();
  
    if (dailyLimit === Infinity) {
      return "Unlimited";
    }
    
    return Math.max(0, dailyLimit - dailyChatsUsed);
  };

  return {
    dailyChatsUsed,
    setDailyChatsUsed,
    limitError,
    setLimitError,
    isAuthenticated,
    checkLimits,
    incrementUsage,
    getRemainingChats,
    subscriptionTier: subscription.tier as SubscriptionTier
  };
};

export default useSubscriptionLimits;