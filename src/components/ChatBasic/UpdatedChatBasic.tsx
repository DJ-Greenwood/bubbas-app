'use client';

import React, { useState, useEffect, useRef } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from '@/utils/firebaseClient';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets'; 
import { setUserUID, getPassPhrase, decryptData } from '@/utils/encryption';
import { JournalEntry } from '@/types/JournalEntry';
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/utils/subscriptionService";
import { saveJournalEntry, getJournalEntries, getUserEmotionCharacterSet } from '@/utils/firebaseDataService';
import { askQuestion, startEmotionalSupportSession } from '@/utils/chatServices';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { EmotionCharacterKey } from '@/types/emotionCharacters';



// 💡 Added imports for HTML components used in JSX
import ChatHeader from '@/components/Chat/ChatHeader';
import LimitErrorAlert from '@/components/Chat/LimitErrorAlert';
import ChatResponseDisplay from '@/components/Chat/ChatResponseDisplay';
import ChatInputForm from '@/components/Chat/ChatInputForm';
import SubscriptionUpgradeDialog from '@/components/Chat/SubscriptionUpgradeDialog';

const UpdatedChatBasic = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
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
  
  const [userCharacterSet, setUserCharacterSet] = useState<EmotionCharacterKey>('Bubba' as EmotionCharacterKey);

  // Initialize Bubbas in emotional support mode
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
        
        // Get user's preferred character set
        const userPrefCharacterSet = await getUserEmotionCharacterSet();
        if (userPrefCharacterSet) {
          setUserCharacterSet(userPrefCharacterSet);
          setCharacterSet(userPrefCharacterSet);
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
      const loaded = await getJournalEntries("active");
      console.log(`✅ Loaded ${loaded.length} journal entries`);
      
      // Decrypt entry content for display in JournalCard
      const decryptedEntries = await Promise.all(
        loaded.map(async (entry) => {
          try {
            if (!entry.encryptedUserText || !entry.encryptedBubbaReply) {
              throw new Error("Entry missing encrypted fields");
            }
            
            const userText = await decryptData(entry.encryptedUserText);
            const bubbaReply = await decryptData(entry.encryptedBubbaReply);
            
            return {
              ...entry,
              userText,
              bubbaReply
            };
          } catch (error) {
            console.error(`Failed to decrypt entry ${entry.timestamp}:`, error);
            return {
              ...entry,
              userText: '[Failed to decrypt]',
              bubbaReply: '[Failed to decrypt]'
            };
          }
        })
      );
      
      setJournalEntries(decryptedEntries);
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

      // Get response from chat service
      console.log("Asking question to chat service...");
      const { reply, usage } = await askQuestion(trimmedInput);
      setResponse(reply);
      
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
        // Check if we have a passphrase before trying to save
        if (!passPhrase) {
          console.error("Cannot save journal entry: No passphrase available");
          toast({
            title: "Encryption Error",
            description: "Unable to save this conversation due to missing encryption key.",
            variant: "destructive"
          });
        } else {
          // Save to journal if we have passphrase and not hitting limits
          try {
            console.log("Saving journal entry with character set:", userCharacterSet);
            
            await saveJournalEntry(
              trimmedInput,
              reply,
              detectedEmotion,
              { 
                promptTokens: usage.promptTokens || 0, 
                completionTokens: usage.completionTokens || 0, 
                totalTokens: usage.totalTokens || 0 
              }
            );
            console.log("✅ Journal entry saved successfully");
            
            // Reload journal entries to show the new entry
            await loadJournalEntries();
          } catch (saveError) {
            console.error("Error saving journal entry:", saveError);
            toast({
              title: "Save Error",
              description: "Failed to save this conversation. Please try again.",
              variant: "destructive"
            });
          }
        }
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
      {/* Chat Header */}
      <ChatHeader 
        subscriptionTier={subscription.tier} 
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