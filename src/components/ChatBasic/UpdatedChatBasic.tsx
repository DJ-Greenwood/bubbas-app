"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchUserProfile } from '@/utils/userProfileService';
import { saveJournalEntry } from '@/utils/firebaseDataService';

// Import custom hooks
import useChatService from '@/hooks/useChatService';
import useSubscriptionLimits, { SubscriptionTier } from '@/hooks/useSubscriptionLimits';

// Import reusable components
import ChatHeader from '@/components/Chat/ChatHeader';
import ChatInputForm from '@/components/Chat/ChatInputForm';
import ChatResponseDisplay from '@/components/Chat/ChatResponseDisplay';
import LimitErrorAlert from '@/components/Chat/LimitErrorAlert';
import SubscriptionUpgradeDialog from '@/components/Chat/SubscriptionUpgradeDialog';

const UpdatedChatBasic = () => {
  // Get chat service functionality from custom hook
  const { 
    emotion, 
    response, 
    usage, 
    isLoading, 
    initializeChat,
    sendMessage, 
    resetChat 
  } = useChatService();
  
  // Get subscription limit functionality from custom hook
  const {
    limitError, 
    setLimitError, 
    checkLimits,
    incrementUsage, 
    getRemainingChats,
    isAuthenticated,
    subscriptionTier
  } = useSubscriptionLimits();
  
  // Local state
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [emotionIconSize, setEmotionIconSize] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  // Initialize chat only once when component mounts
  useEffect(() => {
    // Define a function to initialize the chat
    const initialize = async () => {
      await initializeChat('emotional');
    };
    
    // Call it immediately
    initialize();
    
    // Empty dependency array ensures this only runs once
  }, []);

  // Load user preferences when authenticated
  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const userProfile = await fetchUserProfile();
        if (userProfile?.preferences?.emotionIconSize) {
          setEmotionIconSize(userProfile.preferences.emotionIconSize);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (isAuthenticated) {
      fetchUserPreferences();
    }
  }, [isAuthenticated]);

  // Handle user message submission
  const handleSubmit = useCallback(async (userInput: string) => {
    console.log("Submitting message:", userInput);
    
    // Check for limit errors first
    if (limitError) {
      setShowUpgradeDialog(true);
      return;
    }
    
    // Check if user has reached their usage limits
    if (!checkLimits()) {
      return;
    }
    
    // Send message to chat service
    const result = await sendMessage(userInput);
    if (!result) return;
    
    // Increment usage counter
    incrementUsage();
    
    // Save the conversation if user is authenticated
    if (isAuthenticated) {
      try {
        await saveJournalEntry(
          userInput,
          result.reply,
          result.emotion,
          { 
            promptTokens: result.usage.promptTokens || 0, 
            completionTokens: result.usage.completionTokens || 0, 
            totalTokens: result.usage.totalTokens || 0 
          }
        );
        
        console.log("Chat saved to journal successfully");
      } catch (saveError) {
        console.error("Error saving conversation:", saveError);
        toast({
          title: "Save Error",
          description: "Your chat couldn't be saved. Please try again.",
          variant: "destructive"
        });
      }
    }
    
    // Check if response contains limit message
    if (result.reply.includes("limit") && result.reply.includes("upgrade")) {
      setLimitError(result.reply);
      toast({
        title: "Usage Limit Reached",
        description: "You've reached your usage limit. Please upgrade your plan for more access.",
        variant: "destructive"
      });
    }
  }, [
    limitError, checkLimits, sendMessage, incrementUsage, 
    isAuthenticated, setLimitError, toast, setShowUpgradeDialog
  ]);

  // Handle reset conversation - prevent loops by using a loading state
  const handleResetConversation = useCallback(async () => {
    // Prevent multiple resets
    if (isResetting) return;
    
    try {
      setIsResetting(true);
      console.log("Resetting conversation...");
      
      await resetChat('emotional');
      
      toast({
        title: "Conversation Reset",
        description: "Your chat with Bubba has been reset.",
      });
    } catch (error) {
      console.error("Error resetting conversation:", error);
      toast({
        title: "Reset Error",
        description: "Failed to reset the conversation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  }, [isResetting, resetChat, toast]);

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      {/* Chat Header */}
      <ChatHeader 
        subscriptionTier={subscriptionTier} 
        remainingChats={getRemainingChats()}
        description="Ask Bubba anything! Get help with everyday tasks, creative ideas, information, and more. 💬" 
      />

      {/* Limit Error Alert */}
      <LimitErrorAlert 
        errorMessage={limitError} 
        onUpgradeClick={() => setShowUpgradeDialog(true)}
      />

      {/* Chat Response Display */}
      <div className="mb-4 min-h-32">
        <ChatResponseDisplay 
          response={response}
          emotion={emotion}
          emotionIconSize={emotionIconSize}
          usage={usage}
        />
      </div>

      {/* Chat Input Form */}
      <ChatInputForm
        onSubmit={handleSubmit}
        isLoading={isLoading || isResetting}
        isDisabled={!!limitError}
        onResetConversation={handleResetConversation}
      />

      {/* Subscription Upgrade Dialog */}
      <SubscriptionUpgradeDialog 
        isOpen={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentTier={subscriptionTier}
      />
    </div>
  );
};

export default UpdatedChatBasic;