'use client';

import React, { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from '@/utils/firebaseClient';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets'; 
import { setUserUID } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/chatServices';
import JournalCard from '@/components/JournalChat/Journal/JournalCard';
import enhancedChatService from '@/utils/enhancedChatService';
import * as chatService from '@/utils/chatServices';
import { JournalEntry } from '@/types/JournalEntry';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/utils/subscriptionService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';

const UpdatedEmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [passPhrase, setPassPhrase] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const { showLimitWarning } = enhancedChatService.useTokenWarning();

  // Initialize Bubbas in emotional support mode
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const { reply, usage, emotion } = await enhancedChatService.startEmotionalSupportSession();
        setResponse(reply);
        setEmotion(emotion);
        
        // Check if this was a limit error message
        if (reply.includes("limit") && reply.includes("upgrade")) {
          setLimitError(reply);
        }
      } catch (error) {
        console.error("Failed to initialize chat service:", error);
        toast({
          title: "Initialization Error",
          description: "There was a problem starting the chat. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    initializeChat();
  }, [toast]);

  // Listen for auth state and set user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserUID(firebaseUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch passphrase
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      
      try {
        const phrase = await fetchPassPhrase();
        if (phrase) {
          setPassPhrase(phrase);
        }
      } catch (error) {
        console.error("Failed to fetch passphrase:", error);
      }
    };
    
    init();
  }, [user]);

  // Load journal entries when both user and passphrase are available
  useEffect(() => {
    if (user && passPhrase) {
      loadJournalEntries();
    }
  }, [user, passPhrase]);

  const loadJournalEntries = async () => {
    if (!user || !passPhrase) return;
    
    try {
      const loaded = await chatService.loadChats('active', passPhrase, user.uid);
      setJournalEntries(loaded);
    } catch (error) {
      console.error("Failed to load journal entries:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    // First check if user can proceed based on their limits
    const canProceed = await showLimitWarning();
    if (!canProceed) {
      setShowUpgradeDialog(true);
      return;
    }

    setIsLoading(true);
    setResponse("");
    setLimitError(null);

    try {
      // Detect emotion from user input
      const detectedEmotion = await detectEmotion(userInput);
      setEmotion(detectedEmotion);

      // Get response from enhanced chat service
      const { reply, usage } = await enhancedChatService.askQuestion(userInput, passPhrase);
      setResponse(reply);
      
      // Check if this was a limit error message
      if (reply.includes("limit") && reply.includes("upgrade")) {
        setLimitError(reply);
      } else {
        // No need to manually save chat, as enhancedChatService handles it
        // Just reload journal entries to show the new entry
        if (user && passPhrase) {
          await loadJournalEntries();
        }
      }
    } catch (error) {
      console.error("Failed to submit:", error);
      setResponse("Oops! Something went wrong. Bubba is trying again.");
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

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        <img src='/assets/images/emotions/Bubba/default.jpg' alt="Bubba the AI" className="w-16 h-16 object-cover rounded" />
        Bubba the AI Emotional Chat
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
            disabled={isLoading || !!limitError}
            className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Listening..." : "Send"}
          </button>
          
          <div className="text-xs text-gray-500 self-end">
            {subscription.tier === 'free' ? (
              <span>{10 - (journalEntries.length % 10)}/10 daily chats remaining</span>
            ) : subscription.tier === 'plus' ? (
              <span>{30 - (journalEntries.length % 30)}/30 daily chats remaining</span>
            ) : (
              <span>Unlimited chats (Pro)</span>
            )}
          </div>
        </div>
      </form>

      {emotion && (
        <div className="emotion-display mt-4 flex items-center gap-2">
          <strong>Detected Emotion:</strong> <EmotionIcon emotion={emotion} size={64} />
        </div>
      )}

      {response && !limitError && (
        <div className="response-display mt-4 p-4 bg-white rounded-lg shadow">
          <strong>Bubba:</strong> {response}
        </div>
      )}

      {/* Journal entries section */}
      {journalEntries.length > 0 && (
        <div className="journal mt-8 border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">📝 Your Conversation History</h3>
            <div className="text-sm text-gray-600">
              {subscription.tier === 'free' 
                ? `${journalEntries.length}/50 entries stored` 
                : subscription.tier === 'plus'
                ? `${journalEntries.length}/500 entries stored`
                : `${journalEntries.length} entries stored (unlimited)`}
            </div>
          </div>
          <div className="space-y-4">
            {journalEntries.slice(0, 5).map((entry) => (
              <JournalCard
                key={entry.timestamp}
                entry={entry}
                onEdit={undefined}
                onSoftDelete={undefined}
              />
            ))}
            {journalEntries.length > 5 && (
              <button
                onClick={() => window.location.href = '/journal'}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                View all {journalEntries.length} entries in Journal
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Subscription upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Unlock higher usage limits and more features
            </DialogDescription>
          </DialogHeader>
          <SubscriptionSelector onClose={() => setShowUpgradeDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdatedEmotionChat;