'use client';

import React, { useState, useEffect, useRef } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, functions } from '@/utils/firebaseClient';
import { httpsCallable } from "firebase/functions";
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets'; 

import { setUserUID, getPassPhrase } from '@/utils/encryption';
import JournalCard from '@/components/JournalChat/Journal/JournalCard';
import { JournalEntry } from '@/types/JournalEntry';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/utils/subscriptionService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

// Import the new journalService instead of firebaseDataService
import { 
  getJournalEntries,
  getUserEmotionCharacterSet,
  saveJournalEntry
} from '@/utils/journalService';

// Connect to Firebase Functions directly using httpsCallable
const callStartEmotionalSupportSession = httpsCallable(functions, "startEmotionalSupportSession");
const callContinueConversation = httpsCallable(functions, "continueConversation");

const UpdatedEmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<(JournalEntry & { userText?: string; bubbaReply?: string })[]>([]);
  const [passPhrase, setPassPhrase] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const { setCharacterSet } = useEmotionSettings();
  const hasInitialized = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  
  const [userCharacterSet, setUserCharacterSet] = useState<EmotionCharacterKey>('Bubba' as EmotionCharacterKey);

  // Initialize Bubbas in emotional support mode
  useEffect(() => {
    if (!hasInitialized.current) {
      const initializeChat = async () => {
        try {
          console.log("Initializing emotional chat session...");
          
          // Call the new Firebase Function directly
          const response = await callStartEmotionalSupportSession({
            userId: user?.uid // This will be checked on the server
          });
          
          // Type assertion for TypeScript
          const data = response.data as {
            reply: string;
            usage: {
              promptTokens: number;
              completionTokens: number;
              totalTokens: number;
            };
            emotion: string;
            sessionId: string;
          };
          
          // Store the reply and the sessionId for future use
          sessionIdRef.current = data.sessionId;
          const initialMessage = data.reply;
          
          // Set the initial emotion based on the returned emotion
          setEmotion(data.emotion as Emotion);
          
          // Update UI with the initial message
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
  }, [toast, user]);

  // Listen for auth state and set user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("User authenticated:", firebaseUser.uid);
        setUser(firebaseUser);
        setUserUID(firebaseUser.uid); // Set user UID for encryption
        
      } else {
        console.log("No user authenticated");
        setUser(null);
        setUserUID(""); // Clear user UID
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch passphrase and user character set
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      
      try {
        // Get passphrase first - this is critical for encryption
        const phrase = await getPassPhrase();
        if (phrase) {
          setPassPhrase(phrase);
          console.log("✅ Passphrase successfully loaded");
        } else {
          console.error("No passphrase returned from getPassPhrase()");
          toast({
            title: "Encryption Error",
            description: "Failed to retrieve your encryption key. Journal entries cannot be saved.",
            variant: "destructive"
          });
        }
        
        // Get user's preferred character set using the new service
        const userPrefCharacterSet = await getUserEmotionCharacterSet();
        if (userPrefCharacterSet) {
          setUserCharacterSet(userPrefCharacterSet as EmotionCharacterKey);
          setCharacterSet(userPrefCharacterSet as EmotionCharacterKey);
          console.log(`✅ User character set loaded: ${userPrefCharacterSet}`);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        toast({
          title: "Data Loading Error",
          description: "Failed to retrieve your settings. Some features may be limited.",
          variant: "destructive"
        });
      }
    };
    
    init();
  }, [user, toast, setCharacterSet]);

  // Load journal entries when both user and passphrase are available
  useEffect(() => {
    if (user && passPhrase) {
      loadJournalEntries();
    }
  }, [user, passPhrase]);

  const loadJournalEntries = async () => {
    if (!user || !passPhrase) {
      console.log("Cannot load journal entries - missing user or passphrase");
      return;
    }
    
    try {
      console.log("Loading journal entries...");
      
      // Use the new journalService - client-side decryption is already handled inside
      const loaded = await getJournalEntries("active");
      console.log(`✅ Loaded ${loaded.length} journal entries`);
      
      // The entries are already decrypted by the journalService
      setJournalEntries(loaded);
    } catch (error) {
      console.error("Failed to load journal entries:", error);
      toast({
        title: "Loading Error",
        description: "Failed to load your previous conversations.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;
    
    // Check if user has reached limit
    if (limitError) {
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
    
    setLimitError(null);

    try {
      // Detect emotion from user input
      console.log("Detecting emotion from input...");
      const detectedEmotion = await detectEmotion(trimmedInput);
      setEmotion(detectedEmotion);

      // Get response using the continueConversation function
      if (!sessionIdRef.current) {
        throw new Error("No active session ID");
      }
      
      console.log("Continuing conversation with session ID:", sessionIdRef.current);
      const response = await callContinueConversation({
        sessionId: sessionIdRef.current,
        message: trimmedInput,
        userId: user?.uid // Will be validated on server
      });
      
      // Type assertion for TypeScript
      const data = response.data as {
        reply: string;
        usage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        };
      };
      
      const reply = data.reply;
      
      // Update chat history with AI response
      setChatHistory([
        ...updatedHistory,
        { role: "assistant", content: reply }
      ]);
      
      // Check if this was a limit error message
      if (reply.includes("limit") && reply.includes("upgrade")) {
        setLimitError(reply);
        toast({
          title: "Usage Limit Reached",
          description: "You've reached your usage limit. Please upgrade your plan for more access.",
          variant: "destructive"
        });
      } else if (user) {
        // Save journal entry using the new journalService
        try {
          await saveJournalEntry(
            trimmedInput,
            reply,
            detectedEmotion,
            {
              promptTokens: data.usage.promptTokens,
              completionTokens: data.usage.completionTokens,
              totalTokens: data.usage.totalTokens
            }
          );
          
          console.log("✅ Journal entry saved");
          
          // Refresh journal entries
          if (passPhrase) {
            await loadJournalEntries();
          }
        } catch (saveError) {
          console.error("Failed to save journal entry:", saveError);
          // Continue with the conversation even if saving fails
        }
      }
    } catch (error) {
      console.error("Failed to submit:", error);
      
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

  // Check if the user has reached their daily chat limit
  const isDailyLimitReached = () => {
    if (subscription.tier === 'free' && journalEntries.length >= 10) {
      return true;
    }
    if (subscription.tier === 'plus' && journalEntries.length >= 30) {
      return true;
    }
    return false;
  };

  // Get remaining chats for the day
  const getRemainingChats = () => {
    if (subscription.tier === 'free') {
      return Math.max(0, 10 - journalEntries.length % 10);
    }
    if (subscription.tier === 'plus') {
      return Math.max(0, 30 - journalEntries.length % 30);
    }
    return "Unlimited"; // Pro tier
  };

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        <img src={`/assets/images/emotions/${userCharacterSet}/default.jpg`} alt="Bubba the AI" className="w-16 h-16 object-cover rounded" />
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

      {/* Chat history display */}
      <div className="chat-history mt-4 space-y-4 max-h-96 overflow-y-auto p-2">
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

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <textarea
          className="w-full p-3 rounded border text-base"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="How was your day? What's been on your mind?"
          rows={4}
          disabled={isLoading || !!limitError || isDailyLimitReached()}
        />
        <div className="flex justify-between">
          <button
            type="submit"
            disabled={isLoading || !!limitError || isDailyLimitReached()}
            className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Listening..." : "Send"}
          </button>
          
          <div className="text-xs text-gray-500 self-end">
            {subscription.tier === 'free' ? (
              <span>{getRemainingChats()}/10 daily chats remaining</span>
            ) : subscription.tier === 'plus' ? (
              <span>{getRemainingChats()}/30 daily chats remaining</span>
            ) : (
              <span>Unlimited chats (Pro)</span>
            )}
          </div>
        </div>
      </form>

      {emotion && (
        <div className="emotion-display mt-4 flex items-center gap-2">
          <strong>Detected Emotion:</strong> <EmotionIcon emotion={emotion} characterSet={userCharacterSet as EmotionCharacterKey} />
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
          <SubscriptionSelector 
            onClose={() => setShowUpgradeDialog(false)} 
            currentTier={subscription.tier} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdatedEmotionChat;