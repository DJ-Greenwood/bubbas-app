// src/components/Chat/StandardizedChat.tsx

'use client';

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';

// Custom hooks
import { useChatService } from '@/hooks/useChatService';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';

// Import standardized components
import ChatHeader from '@/components/Chat/ChatHeader';
import EnhancedChatInputForm from '@/components/Chat/EnhancedChatInputForm';
import ChatHistory from '@/components/Chat/ChatHistory';
import LimitErrorAlert from '@/components/Chat/LimitErrorAlert';
import SubscriptionUpgradeDialog from '@/components/Chat/SubscriptionUpgradeDialog';

// Types
import { Emotion } from '@/components/emotion/emotionAssets';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

interface StandardizedChatProps {
  mode?: 'emotional' | 'basic' | 'journal';
  headerTitle?: string;
  description?: string;
  initialMessage?: string;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  characterSet?: EmotionCharacterKey;
  showTimestamps?: boolean;
  supportSpeechToText?: boolean;
  maxHeight?: string;
  className?: string;
}

const StandardizedChat: React.FC<StandardizedChatProps> = ({
  mode = 'emotional',
  headerTitle = 'Bubba the AI Assistant',
  description = "Ask Bubba anything! Get help with everyday tasks, creative ideas, information, and more. 💬",
  initialMessage,
  showEmptyState = true,
  emptyStateMessage = "Bubba is waiting for your message...",
  characterSet: propCharacterSet,
  showTimestamps = false,
  supportSpeechToText = false,
  maxHeight = '24rem',
  className = '',
}) => {
  // State
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [emotionIconSize, setEmotionIconSize] = useState<number>(32);
  const [isResetting, setIsResetting] = useState(false);
  
  // Hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const { characterSet: contextCharacterSet, setCharacterSet } = useEmotionSettings();
  
  // Custom hooks for chat functionality and subscription limits
  const { 
    emotion, 
    response, 
    chatHistory,
    usage, 
    isLoading,
    error: chatError,
    initializeChat,
    sendMessage, 
    resetChat 
  } = useChatService({
    mode,
    initialMessage,
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const {
    limitError, 
    setLimitError, 
    checkLimits,
    incrementUsage, 
    getRemainingChats,
    isAuthenticated,
    subscriptionTier
  } = useSubscriptionLimits();
  
  // Set character set if provided as prop
  useEffect(() => {
    if (propCharacterSet && propCharacterSet !== contextCharacterSet) {
      setCharacterSet(propCharacterSet);
    }
  }, [propCharacterSet, contextCharacterSet, setCharacterSet]);
  
  // Load user preferences when authenticated
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        // Fetch user preferences here
        // For example:
        // const userProfile = await fetchUserProfile();
        // if (userProfile?.preferences?.emotionIconSize) {
        //   setEmotionIconSize(userProfile.preferences.emotionIconSize);
        // }
        
        // For now, set a default
        setEmotionIconSize(64);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (isAuthenticated) {
      loadUserPreferences();
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
    if (!await checkLimits()) {
      return;
    }
    
    // Send message to chat service
    const result = await sendMessage(userInput);
    if (!result) {
      console.error("Failed to get response from chat service");
      toast({
        title: "Message Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Increment usage counter
    incrementUsage();
    
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
    limitError, 
    checkLimits, 
    sendMessage, 
    incrementUsage, 
    setLimitError, 
    toast
  ]);

  // Handle reset conversation - prevent loops by using a loading state
  const handleResetConversation = useCallback(async () => {
    // Prevent multiple resets
    if (isResetting) return;
    
    try {
      setIsResetting(true);
      console.log("Resetting conversation...");
      
      await resetChat(mode);
      
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
  }, [isResetting, resetChat, mode, toast]);

  // Get current character set
  const currentCharacterSet = propCharacterSet || contextCharacterSet;

  return (
    <div className={`emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md ${className}`}>
      {/* Chat Header */}
      <ChatHeader 
        subscriptionTier={subscriptionTier} 
        remainingChats={getRemainingChats()}
        headerTitle={headerTitle}
        characterSet={currentCharacterSet}
        description={description} 
      />

      {/* Limit Error Alert */}
      <LimitErrorAlert 
        errorMessage={limitError || chatError} 
        onUpgradeClick={() => setShowUpgradeDialog(true)}
      />

      {/* Chat History */}
      <ChatHistory
        messages={chatHistory}
        characterSet={currentCharacterSet}
        emotionIconSize={emotionIconSize}
        showTimestamps={showTimestamps}
        maxHeight={maxHeight}
        emptyStateMessage={emptyStateMessage}
        showEmptyState={showEmptyState}
        className="mb-4"
      />

      {/* Enhanced Chat Input Form */}
      <EnhancedChatInputForm
        onSubmit={handleSubmit}
        isLoading={isLoading || isResetting}
        isDisabled={!!limitError}
        onResetConversation={handleResetConversation}
        supportSpeechToText={supportSpeechToText}
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

export default StandardizedChat;