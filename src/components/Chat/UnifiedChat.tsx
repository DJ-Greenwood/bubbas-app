// src/components/Chat/UnifiedChat.tsx

'use client';

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';

// Custom hooks
import { useChatService, ChatMessage } from '@/hooks/useChatService';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';

// Import reusable components
import ChatHeader from '@/components/Chat/ChatHeader';
import ChatInputForm from '@/components/Chat/ChatInputForm';
import ChatResponseDisplay from '@/components/Chat/ChatResponseDisplay';
import LimitErrorAlert from '@/components/Chat/LimitErrorAlert';
import SubscriptionUpgradeDialog from '@/components/Chat/SubscriptionUpgradeDialog';

// Types
import { Emotion } from '@/components/emotion/emotionAssets';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

// User Preferences
import { fetchUserProfile } from '@/utils/userProfileService'; // Hypothetical service to fetch user profile


interface UnifiedChatProps {
  mode?: 'emotional' | 'basic' | 'journal';
  headerTitle?: string;
  description?: string;
  initialMessage?: string;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  characterSet?: EmotionCharacterKey;
}

const UnifiedChat: React.FC<UnifiedChatProps> = ({
  mode = 'emotional',
  headerTitle = 'Bubba the AI Assistant',
  description = "Ask Bubba anything! Get help with everyday tasks, creative ideas, information, and more. 💬",
  initialMessage,
  showEmptyState = true,
  emptyStateMessage = "Bubba is waiting for your message...",
  characterSet: propCharacterSet,
}) => {
  // State
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [emotionIconSize, setEmotionIconSize] = useState<number | null>(null);
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
        // This could be from a user profile service or similar
        
        // For example:
        const userProfile = await fetchUserProfile();
            if (userProfile?.preferences?.emotionIconSize) {
            setEmotionIconSize(userProfile.preferences.emotionIconSize);
        } else {
            // Default to a standard size if not set
            setEmotionIconSize(64);
        }

        
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

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      {/* Chat Header */}
      <ChatHeader 
        subscriptionTier={subscriptionTier} 
        remainingChats={getRemainingChats()}
        headerTitle={headerTitle}
        characterSet={propCharacterSet || contextCharacterSet}
        description={description} 
      />

      {/* Limit Error Alert */}
      <LimitErrorAlert 
        errorMessage={limitError || chatError} 
        onUpgradeClick={() => setShowUpgradeDialog(true)}
      />

      {/* Chat History Display */}
      <div className="chat-history mt-4 space-y-4 max-h-96 overflow-y-auto p-2 mb-4">
        {chatHistory.map((message, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-100 ml-8' 
                : 'bg-white mr-8'
            }`}
          >
            <div className="font-medium mb-1">
              {message.role === 'user' ? 'You:' : 'Bubba:'}
            </div>
            <div>{message.content}</div>
          </div>
        ))}
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

export default UnifiedChat;