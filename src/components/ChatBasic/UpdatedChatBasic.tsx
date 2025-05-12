'use client';

import React, { useState, useEffect, useRef } from "react";
import { useSubscription } from "@/utils/subscriptionService";
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets';
import { askQuestion, startEmotionalSupportSession } from '@/utils/chatServices';
import { saveJournalEntry } from '@/utils/firebaseDataService';
import { useToast } from "@/hooks/use-toast";
import useChatLimits from "@/hooks/useChatLimits";
import { User } from "firebase/auth";
import EmotionIcon from '@/components/emotion/EmotionIcon';

// UI Components (you'll need to implement these)
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';

interface ChatWithLimitsProps {
  user: User | null;
  passPhrase: string | null;
}

const ChatWithLimits: React.FC<ChatWithLimitsProps> = ({ user, passPhrase }) => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();
  const { characterSet } = useEmotionSettings();
  const hasInitialized = useRef(false);
  
  // Use our custom chatLimits hook
  const {
    isLoading: isLimitLoading,
    hasReachedLimit,
    hasReachedTokenLimit,
    limitMessage,
    tokenLimitMessage,
    chatsUsedToday,
    chatsRemainingToday,
    limitPercentage,
    tokensUsedThisMonth,
    tokensRemainingThisMonth,
    tokenPercentage,
    checkAndIncrementUsage,
    trackTokenUsage
  } = useChatLimits();
  
  const { subscription } = useSubscription();

  // Initialize chat when component mounts
  useEffect(() => {
    if (!hasInitialized.current) {
      const initializeChat = async () => {
        try {
          console.log("Initializing emotional chat session...");
          await startEmotionalSupportSession();
          const initialMessage = "Hi there! I'm Bubba, your AI emotional support companion. How are you feeling today?";
          setResponse(initialMessage);
          
          // Initialize chat history with system message
          setChatHistory([{ role: "assistant", content: initialMessage }]);
          hasInitialized.current = true;
        } catch (error) {
          console.error("Failed to initialize chat service:", error);
          hasInitialized.current = false;
          toast({
            title: "Initialization Error",
            description: "There was a problem starting the chat. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      initializeChat();
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;
    
    // Check if we've reached the chat or token limit
    if (hasReachedLimit || hasReachedTokenLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    // Check and increment usage counter, return if limit reached
    const canProceed = await checkAndIncrementUsage();
    if (!canProceed) {
      setShowUpgradeDialog(true);
      return;
    }

    setIsLoading(true);
    
    // Update chat history with user input
    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: trimmedInput }
    ];
    setChatHistory(updatedHistory);

    try {
      // Detect emotion from user input
      console.log("Detecting emotion from input...");
      const detectedEmotion = await detectEmotion(trimmedInput);
      setEmotion(detectedEmotion);

      // Get response from chat service
      console.log("Asking question to chat service...");
      const { reply, usage } = await askQuestion(trimmedInput);
      setResponse(reply);
      
      // Update chat history with AI response
      setChatHistory([
        ...updatedHistory,
        { role: "assistant", content: reply }
      ]);
      
      // Track token usage first
      const tokenUsage = { 
        promptTokens: usage.promptTokens || 0, 
        completionTokens: usage.completionTokens || 0, 
        totalTokens: usage.totalTokens || 0 
      };
      
      await trackTokenUsage(tokenUsage, 'emotion');
      
      // Save to journal if we have all required data
      if (user && passPhrase) {
        try {
          console.log("Saving journal entry with character set:", characterSet);
          
          await saveJournalEntry(
            trimmedInput,
            reply,
            detectedEmotion,
            tokenUsage
          );
          console.log("✅ Journal entry saved successfully");
        } catch (saveError) {
          console.error("Error saving journal entry:", saveError);
          toast({
            title: "Save Error",
            description: "Failed to save this conversation. Please try again.",
            variant: "destructive"
          });
        }
      } else if (!passPhrase && user) {
        console.error("Cannot save journal entry: No passphrase available");
        toast({
          title: "Encryption Error",
          description: "Unable to save this conversation due to missing encryption key.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Failed to submit:", error);
      setResponse("Oops! Something went wrong. Bubba is trying again.");
      
      // Update chat history with error message
      setChatHistory([
        ...updatedHistory,
        { role: "assistant", content: "Oops! Something went wrong. Bubba is trying again." }
      ]);
      
      toast({
        title: "Error",
        description: "There was a problem processing your message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  };

  const resetConversation = async () => {
    try {
      setResponse("");
      setEmotion(null);
      setChatHistory([]);
      hasInitialized.current = false;
      
      // Re-initialize chat
      console.log("Initializing new emotional chat session...");
      await startEmotionalSupportSession();
      const initialMessage = "Hi there! I'm starting a new chat session. How are you feeling now?";
      setResponse(initialMessage);
      
      // Initialize chat history with system message
      setChatHistory([{ role: "assistant", content: initialMessage }]);
      
      toast({
        title: "Conversation Reset",
        description: "Started a new conversation with Bubba.",
      });
    } catch (error) {
      console.error("Failed to reset conversation:", error);
      toast({
        title: "Reset Error",
        description: "There was a problem resetting the conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img src={`/assets/images/emotions/${characterSet}/default.jpg`} alt="Bubba the AI" className="w-12 h-12 object-cover rounded" />
          <div>
            <h2 className="font-semibold">Bubba the AI</h2>
            <div className="text-xs flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded ${
                subscription.tier === 'free' ? 'bg-gray-100 text-gray-800' :
                subscription.tier === 'plus' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {subscription.tier === 'free' ? 'Free' : 
                 subscription.tier === 'plus' ? 'Plus' : 'Pro'}
              </span>
              
              {!isLimitLoading && chatsRemainingToday !== "Unlimited" && (
                <span className="text-gray-500">
                  {chatsRemainingToday} chats remaining
                </span>
              )}
            </div>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetConversation} 
          disabled={isLoading}
        >
          New Chat
        </Button>
      </div>
      
      {/* Usage Limit Progress Bars (only show for non-Pro users) */}
      {subscription.tier !== 'pro' && (
        <div className="mb-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Daily chats: {chatsUsedToday} / {
                subscription.tier === 'free' ? '10' : 
                subscription.tier === 'plus' ? '30' : 'Unlimited'
              }</span>
              <span>{limitPercentage}%</span>
            </div>
            <Progress value={limitPercentage} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Monthly tokens: {tokensUsedThisMonth.toLocaleString()} / {
                subscription.tier === 'free' ? '10,000' : 
                subscription.tier === 'plus' ? '50,000' : 'Unlimited'
              }</span>
              <span>{tokenPercentage}%</span>
            </div>
            <Progress value={tokenPercentage} className="h-2" />
          </div>
        </div>
      )}

      {/* Limit Error Alerts */}
      {hasReachedLimit && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chat Limit Reached</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{limitMessage}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-2 bg-white"
            >
              Upgrade Now
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {hasReachedTokenLimit && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Token Limit Reached</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{tokenLimitMessage}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-2 bg-white"
            >
              Upgrade Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Chat history display */}
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

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Textarea
          className="w-full p-3 rounded border text-base"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="How are you feeling today?"
          rows={4}
          disabled={isLoading || hasReachedLimit}
        />
        <div className="flex justify-between items-center">
          <Button
            type="submit"
            disabled={isLoading || hasReachedLimit || !userInput.trim()}
            className={`bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? "Listening..." : "Send"}
          </Button>
          
          {emotion && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Detected Emotion:</span>
              <EmotionIcon emotion={emotion} characterSet={characterSet} size={32} />
            </div>
          )}
        </div>
      </form>

      {/* Subscription upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Unlock higher usage limits and more features
            </DialogDescription>
          </DialogHeader>
          <SubscriptionSelector 
            onClose={() => setShowUpgradeDialog(false)} 
            currentTier={subscription.tier} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatWithLimits;