"use client";
import { useState, useEffect } from "react";
import { auth } from '@/utils/firebaseClient';
import { onAuthStateChanged } from "firebase/auth";
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { Emotion } from '@/components/emotion/emotionAssets';
import { setUserUID } from '@/utils/encryption';
import { getPassPhrase } from '@/utils/chatServices';
import { useSubscription } from '@/utils/subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Send, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';
import { saveJournalEntry, getUserDoc } from '@/utils/firebaseDataService';
import { resetConversation, askQuestion } from '@/utils/chatServices';
import ResponseCard from '../Journal/JournalResponses/ResponseCard';

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

const UpdatedChatBasicService = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [usage, setUsage] = useState<OpenAIUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyChatsUsed, setDailyChatsUsed] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [passPhrase, setPassPhrase] = useState<string | null>(null);
  const { subscription } = useSubscription();
  const { toast } = useToast();

  // Initialize Bubbas in basic mode and check user auth
  useEffect(() => {
    // Initialize the chatService
    resetConversation("You are Bubba, a helpful AI assistant.");
    
    // Listen for auth state and set user
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUserUID(firebaseUser.uid);
        
        try {
          // Get passphrase
          const phrase = await getPassPhrase();
          if (phrase) {
            setPassPhrase(phrase);
          }
          
          // Get user stats to determine daily usage
          const userDoc = await getUserDoc(firebaseUser.uid);
          const chatsToday = userDoc?.usage?.chatsToday || 0;
          setDailyChatsUsed(chatsToday);
        } catch (error) {
          console.error("Error initializing:", error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    // First check if user has reached their usage limits
    if (limitError) {
      setShowUpgradeDialog(true);
      return;
    }
    
    // Check daily chat limits based on subscription
    if ((subscription.tier === 'free' && dailyChatsUsed >= 10) ||
        (subscription.tier === 'plus' && dailyChatsUsed >= 30)) {
      const limitMessage = `You've reached your daily chat limit for your ${subscription.tier} plan. Please upgrade for more chats.`;
      setLimitError(limitMessage);
      toast({
        title: "Usage Limit Reached",
        description: limitMessage,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setEmotion(null);
    setResponse("");
    setUsage(null);

    try {
      // Detect emotion from user input
      const detectedEmotion = await detectEmotion(userInput);
      setEmotion(detectedEmotion);

      // Get response from chat service
      const result = await askQuestion(userInput);
      setResponse(result.reply || "");
      setUsage(result.usage || null);
      
      // Increment the daily usage counter
      setDailyChatsUsed(prev => prev + 1);

      // Save the conversation if user is authenticated
      const user = auth.currentUser;
      if (user) {
        try {
          await saveJournalEntry(
            userInput,
            result.reply,
            detectedEmotion,
            { 
              promptTokens: result.usage.promptTokens, 
              completionTokens: result.usage.completionTokens, 
              totalTokens: result.usage.totalTokens 
            }
          );
        } catch (saveError) {
          console.error("Error saving conversation:", saveError);
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
    } catch (error) {
      console.error("Error:", error);
      setResponse("Oops! Something went wrong. Bubba is trying again.");
      toast({
        title: "Error",
        description: "There was a problem processing your message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setUserInput(""); // Clear input after sending
    }
  };

  // Get remaining chats for the day
  const getRemainingChats = () => {
    if (subscription.tier === 'free') {
      return Math.max(0, 10 - dailyChatsUsed);
    }
    if (subscription.tier === 'plus') {
      return Math.max(0, 30 - dailyChatsUsed);
    }
    return "Unlimited"; // Pro tier
  };

  // Reset conversation 
  const handleResetConversation = () => {
    resetConversation("You are Bubba, a helpful AI assistant.");
    setResponse("");
    setEmotion(null);
    setUsage(null);
    toast({
      title: "Conversation Reset",
      description: "Your chat with Bubba has been reset.",
    });
  };

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <img
          src='/assets/images/emotions/Bubba/default.jpg'
          alt="Bubba the AI"
          className="w-16 h-16 object-cover rounded-full"
        />
        <div>
          <h2 className="text-lg font-semibold">Bubba the AI Assistant</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {subscription.tier === 'free' ? 'Free' : subscription.tier === 'plus' ? 'Plus' : 'Pro'}
            </span>
            <span className="text-xs text-gray-500">
              {getRemainingChats() === "Unlimited" 
                ? "Unlimited chats" 
                : `${getRemainingChats()} chats remaining today`}
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-gray-600 mb-4 text-sm">
        Ask Bubba anything! Get help with everyday tasks, creative ideas, information, and more. 💬
      </p>

      {limitError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Usage Limit Reached</AlertTitle>
          <AlertDescription>{limitError}</AlertDescription>
        </Alert>
      )}

      {/* Response area */}
      <div className="mb-4 min-h-32">
        {response ? (
          <div className="flex gap-3 items-start">
            {emotion && (
              <div className="flex-shrink-0 mt-1">
                <EmotionIcon emotion={emotion} size={32} />
              </div>
            )}
            <ResponseCard 
              response={response}
              className="flex-grow" input={userInput}            />
          </div>
        ) : (
          <div className="text-gray-400 italic text-center py-8">
            Bubba is waiting for your message...
          </div>
        )}
        
        {usage && (
          <div className="text-xs text-gray-500 mt-2 text-right">
            Tokens used: {usage.totalTokens} ({usage.promptTokens} prompt, {usage.completionTokens} completion)
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Message Bubba..."
          className="w-full p-3 pr-24 resize-none rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={3}
          disabled={isLoading || !!limitError}
        />
        <div className="absolute right-2 bottom-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleResetConversation}
            title="Reset conversation"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !userInput.trim() || !!limitError}
            className="px-3 py-2"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                <span>Thinking</span>
              </div>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" /> Send
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              You've reached your daily chat limit. Upgrade your subscription to continue chatting with Bubba!
            </p>
            <SubscriptionSelector 
              onClose={() => setShowUpgradeDialog(false)} 
              currentTier={subscription.tier}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdatedChatBasicService;