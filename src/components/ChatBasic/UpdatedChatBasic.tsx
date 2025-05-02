"use client";
import { useState, useEffect } from "react";
import chatService from '../../utils/firebaseChatService';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { Emotion } from '@/components/emotion/emotionAssets';
import { saveTokenUsage } from '@/utils/tokenPersistenceService';
import { useSubscription } from '@/utils/subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

const UpdatedChatBasic = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [usage, setUsage] = useState<OpenAIUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]); // Replace 'any[]' with the appropriate type if known.
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { subscription } = useSubscription();
  const { toast } = useToast();


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    // First check if user has reached their usage limits
    if (limitError) {
      setShowUpgradeDialog(true);
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
      const result = await chatService.askQuestion(userInput);
      setResponse(result.reply || "");
      setUsage(result.usage || null);

      // Save token usage in separate collection (independent of journal entries)
      if (result.usage) {
        await saveTokenUsage(
          result.usage, 
          'basic', 
          undefined, // No journal entry ID for Basic Chat
          userInput // Include truncated prompt for reference
        );
      }

      // Check for quota limits in response
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
      setResponse("Oops! Something went wrong. Bubbas is trying again.");
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

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        <img
          src='/assets/images/emotions/Bubba/default.jpg'
          alt="Bubba the AI"
          className="w-20 h-20 object-cover rounded"
        />
        Bubba the AI Emotional Support Companion
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
          {subscription.tier === 'free' ? 'Free' : subscription.tier === 'plus' ? 'Plus' : 'Pro'}
        </span>
      </h2>
      <p className="text-gray-600">
        Let Bubba help you reflect on your day, express how you're feeling, or unwind for the weekend. 💬
      </p>

      {limitError && (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Usage Limit Reached</AlertTitle>
          <AlertDescription>
            {limitError}
            <button 
              onClick={() => setShowUpgradeDialog(true)}
              className="text-white underline ml-2"
            >
              Upgrade now
            </button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <textarea
          className="w-full p-3 rounded border text-base"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="How was your day? What's been on your mind?"
          rows={4}
          disabled={isLoading}
        />
        <div className="flex justify-between">
          <button
            type="submit"
            disabled={isLoading}
            className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {isLoading ? "Listening..." : "Send"}
          </button>
          
          <div className="text-xs text-gray-500 self-end">
            {subscription.tier === 'free' ? (
              <span>{10 - journalEntries.length % 10}/10 daily chats remaining</span>
            ) : subscription.tier === 'plus' ? (
              <span>{30 - journalEntries.length % 30}/30 daily chats remaining</span>
            ) : (
              <span>Unlimited chats (Pro)</span>
            )}
          </div>
        </div>
      </form>

      {emotion && (
        <div className="emotion-display mt-4">
          <strong>Detected Emotion:</strong> <EmotionIcon emotion={emotion} />
        </div>
      )}

      {response && (
        <div className="response-display mt-4 relative bg-white p-4 rounded shadow">
          <strong>Bubbas response:</strong> <div className="mt-2">{response}</div>

          {usage && (
            <div className="text-xs text-gray-500 absolute bottom-2 right-2">
              Tokens: {usage.totalTokens} (Prompt: {usage.promptTokens}, Completion: {usage.completionTokens})
            </div>
          )}
        </div>
      )}

      {/* Subscription upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
          </DialogHeader>
          <SubscriptionSelector onClose={() => setShowUpgradeDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdatedChatBasic;