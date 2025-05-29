'use client';

import React, { useState, useEffect, useRef } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
// ERROR: Assuming '@/utils/firebaseClient' exists and exports 'auth' and 'functions'.
// It's different from '@/lib/firebase/config' used elsewhere.
import { auth, functions } from '@/utils/firebaseClient';
import { httpsCallable } from "firebase/functions";

// Assuming these components and types exist at these paths.
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { EmotionDetector } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets';
// ERROR: setUserUID from '@/components/context/AuthContext' might be problematic.
// The provided 'auth-provider.tsx' (which seems to be the AuthContext)
// doesn't export setUserUID directly.
import { setUserUID } from '@/components/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// JournalCard is imported but its usage is commented out.
import JournalCard from '@/components/JournalChat/Journal/JournalCard';
import { JournalEntry } from '@/types/JournalEntry'; // Assuming this type definition exists
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Assuming these custom hooks and services exist and function as expected.
import { useSubscription } from "@/utils/subscriptionService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SubscriptionSelector from '@/components/auth/SubscriptionSelector';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';
import { EmotionCharacterKey } from '@/types/emotionCharacters'; // Assuming this type definition exists

// Import the new journalService instead of firebaseDataService
// Assuming these functions from journalService exist and function as expected.
import {
  getUserEmotionCharacterSet,
  saveJournalEntry
} from '@/utils/journalService';

// Connect to Firebase Functions directly using httpsCallable
const callStartEmotionalSupportSession = httpsCallable(functions, "startEmotionalSupportSession");
const callContinueConversation = httpsCallable(functions, "continueConversation");

// Consider renaming component to UpdatedEmotionChatPersist to match a potential filename convention
const UpdatedEmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null); // Emotion type from emotionAssets
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null); // Firebase User type
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription(); // Assuming subscription has a 'tier' property
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const { setCharacterSet } = useEmotionSettings(); // This is from context
  const hasInitialized = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  // Local state for userCharacterSet, initialized to 'Bubba'.
  // This is passed to EmotionIcon, but setCharacterSet from context is called with userPrefCharacterSet.
  // This might lead to inconsistency if userPrefCharacterSet is different.
  const [userCharacterSet, setUserCharacterSet_local] = useState<EmotionCharacterKey>('Bubba' as EmotionCharacterKey); // Renamed to avoid confusion with context setter

  useEffect(() => {
    if (!hasInitialized.current && user) { // Ensure user is available before initializing
      const initializeChat = async () => {
        try {
          console.log("Initializing emotional chat session...");
          // userId is correctly passed, server-side validation is mentioned.
          const response = await callStartEmotionalSupportSession({
            userId: user?.uid
          });

          // Type assertion for TypeScript
          const data = response.data as {
            reply: string;
            usage: { // Assuming this usage structure is consistent with what the function returns
              promptTokens: number;
              completionTokens: number;
              totalTokens: number;
            };
            emotion: string; // Assuming this will be a valid Emotion key
            sessionId: string;
          };

          sessionIdRef.current = data.sessionId;
          const initialMessage = data.reply;
          setEmotion(data.emotion as Emotion); // Potential runtime error if data.emotion is not a valid Emotion
          setChatHistory([{ role: "assistant", content: initialMessage }]);
          hasInitialized.current = true;
        } catch (error) {
          console.error("Failed to initialize chat service:", error);
          // hasInitialized.current = false; // This is redundant if it starts as false or already set to false.
          toast({
            title: "Initialization Error",
            description: "There was a problem starting the chat. Please try again.",
            variant: "destructive"
          });
        }
      };
      initializeChat();
    }
  // FIX: Add 'user' to the dependency array, as initializeChat depends on it.
  // If 'toast' function reference is stable, it's okay, otherwise include it too.
  }, [toast, user]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("User authenticated:", firebaseUser.uid);
        setUser(firebaseUser);
        // POTENTIAL ISSUE: Ensure setUserUID is correctly implemented in AuthContext
        // and handles the encryption key logic as intended.
        // The provided AuthContext (auth-provider.tsx) does not export setUserUID.
        // This might be from a different AuthContext or an oversight.
        setUserUID(firebaseUser.uid);
      } else {
        console.log("No user authenticated");
        setUser(null);
        setUserUID(""); // Clear user UID
        hasInitialized.current = false; // Reset initialization if user logs out
        sessionIdRef.current = null; // Reset session ID
        setChatHistory([]); // Clear chat history
        setEmotion(null); // Clear emotion
      }
    });
    return () => unsubscribe();
  }, []); // Empty dependency array is correct for onAuthStateChanged cleanup.

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        const userPrefCharacterSet = await getUserEmotionCharacterSet(); // Assumes this returns EmotionCharacterKey or null/undefined
        if (userPrefCharacterSet) {
          // FIX: This sets the character set in the context.
          setCharacterSet(userPrefCharacterSet as EmotionCharacterKey);
          // POTENTIAL FIX: Also update the local state if EmotionIcon uses it, or make EmotionIcon use the context value.
          // setUserCharacterSet_local(userPrefCharacterSet as EmotionCharacterKey);
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
  // 'toast' and 'setCharacterSet' should be stable, 'user' is the main dependency.
  }, [user, toast, setCharacterSet]);

  // ERROR: Stray '};' - this seems like a remnant of a removed function or block.
  // This will cause a syntax error.
  // }; // REMOVE THIS LINE

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;

    if (limitError) {
      setShowUpgradeDialog(true);
      return;
    }

    setIsLoading(true);
    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: trimmedInput }
    ];
    setChatHistory(updatedHistory);
    setLimitError(null); // Reset limit error optimistically

    try {
      console.log("Detecting emotion from input...");
      const detectedEmotion = await EmotionDetector(trimmedInput); // Assumes EmotionDetector returns an Emotion
      setEmotion(detectedEmotion);

      if (!sessionIdRef.current) {
        // FIX: Potentially re-initialize chat or show a specific error if session is lost.
        // Throwing an error here is one way, but user experience could be improved.
        hasInitialized.current = false; // Mark as not initialized so it can retry
         toast({
            title: "Session Error",
            description: "Your chat session expired or was not found. Please try sending your message again to restart.",
            variant: "destructive"
          });
         setIsLoading(false);
         setUserInput(trimmedInput); // Keep user input so they can resend
         // Attempt to reinitialize
          if (user) {
            const response = await callStartEmotionalSupportSession({ userId: user?.uid });
            const data = response.data as { sessionId: string, reply: string, emotion: string };
            sessionIdRef.current = data.sessionId;
            // Do not add the initial message again, just restore session
            console.log("Re-initialized session:", data.sessionId);
            // Now try continuing the conversation again
            const continueResponse = await callContinueConversation({
              sessionId: sessionIdRef.current,
              message: trimmedInput,
              userId: user?.uid
            });
            // process continueResponse.data as below
            const continuedData = continueResponse.data as { reply: string; usage: any };
            setChatHistory([ ...updatedHistory, { role: "assistant", content: continuedData.reply }]);
            // ... rest of the logic for saving journal entry etc.
            setIsLoading(false);
            setUserInput("");
            return;
          } else {
            throw new Error("No active session ID and no user to re-initialize.");
          }
      }
      
      console.log("Continuing conversation with session ID:", sessionIdRef.current);
      const response = await callContinueConversation({
        sessionId: sessionIdRef.current,
        message: trimmedInput,
        userId: user?.uid
      });

      const data = response.data as { // Assuming this structure
        reply: string;
        usage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        };
      };
      const reply = data.reply;
      setChatHistory([
        ...updatedHistory,
        { role: "assistant", content: reply }
      ]);

      if (reply.includes("limit") && reply.includes("upgrade")) {
        setLimitError(reply);
        toast({
          title: "Usage Limit Reached",
          description: "You've reached your usage limit. Please upgrade your plan for more access.",
          variant: "destructive"
        });
      } else if (user) {
        try {
          await saveJournalEntry(
            trimmedInput,
            reply,
            detectedEmotion, // Make sure detectedEmotion is a string if the service expects that
            {
              promptTokens: data.usage.promptTokens,
              completionTokens: data.usage.completionTokens,
              totalTokens: data.usage.totalTokens
            }
          );
          console.log("✅ Journal entry saved");
          // Refresh journal entries - this function/logic is missing in this component.
          // If this component is not responsible for displaying journal entries, this might not be needed here.
        } catch (saveError) {
          console.error("Failed to save journal entry:", saveError);
          // Not showing a toast here might be okay if conversation continues.
        }
      }
    } catch (error: any) { // Add type for error
      console.error("Failed to submit:", error);
      setChatHistory([
        ...updatedHistory,
        // FIX: Provide a more user-friendly error, or a generic one.
        // "Bubba is trying again" is misleading if no retry mechanism is implemented here.
        { role: "assistant", content: "Oops! Something went wrong. Please try sending your message again." }
      ]);
      toast({
        title: "Error",
        // FIX: Provide a more specific error or a general one like "Could not process your message."
        description: error.message || "There was a problem processing your message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  };

  // LOGIC REVIEW: isDailyLimitReached and getRemainingChats depend on journalEntries,
  // which is commented out. This logic needs to be fully implemented or removed/updated.
  const isDailyLimitReached = () => {
    console.warn("isDailyLimitReached: Logic is a placeholder.");
    return false; // Placeholder
  }

  const getRemainingChats = () => {
    console.warn("getRemainingChats: Logic is a placeholder and returns N/A.");
    const dailyLimit = subscription?.tier === 'free' ? 10 : subscription?.tier === 'plus' ? 30 : Infinity;
    // This needs to fetch actual usage count.
    // For example: const todaysChats = await getTodaysChatCountFromService();
    // return Math.max(0, dailyLimit - todaysChats);
    return "N/A"; // Placeholder until correct logic using journalService is implemented
  };

  return (
    // IMPROVEMENT: Consider using more semantic class names from globals.css or tailwind.config.ts
    // if `bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300`
    // is a common card style.
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        {/* FIX: The src for the image uses `userCharacterSet` (the local state) which might not be up-to-date
            if `useEmotionSettings().characterSet` is the true source.
            Consider using the context value here or ensuring local state is synced.
        */}
        <img src={`/assets/images/emotions/${userCharacterSet}/default.jpg`} alt="Bubba the AI" className="w-16 h-16 object-cover rounded" />
        Bubba the AI Emotional Chat
        {subscription && ( // Add check for subscription
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
              {subscription.tier === 'free' ? 'Free' : subscription.tier === 'plus' ? 'Plus' : 'Pro'}
            </span>
        )}
      </h2>
      <p className="text-gray-600">
        Let Bubba help you reflect on your day, express how you're feeling, or unwind for the weekend.&#x1f4ac;
      </p>

      {limitError && (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Usage Limit Reached</AlertTitle>
          <AlertDescription>
            {limitError}
            <button
              onClick={() => setShowUpgradeDialog(true)}
              // IMPROVEMENT: Use Button component from ui/button for consistent styling
              className="text-white underline ml-2" // This might not be visible on destructive alert
            >
              Upgrade now
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="chat-history mt-4 space-y-4 max-h-96 overflow-y-auto p-2">
        {chatHistory.map((message, index) => (
          <div
            key={index} // Using index as key is okay if list is static or items don't reorder.
                       // If messages could be deleted/inserted, consider a unique ID per message.
            className={`p-3 rounded-lg ${
              message.role === 'user'
                ? 'bg-primary/20 ml-8' // Using theme color
                : 'bg-card mr-8'       // Using theme color
            }`}
          >
            <div className="font-medium mb-1 text-sm text-foreground/80">
              {message.role === 'user' ? (user?.displayName || 'You') : 'Bubba:'}
            </div>
            {/* IMPROVEMENT: Sanitize message.content if it can contain HTML/scripts, though unlikely from AI. */}
            <div className="text-foreground">{message.content}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <textarea
          // IMPROVEMENT: Use Textarea component from ui/textarea for consistent styling
          className="w-full p-3 rounded border text-base border-input bg-background placeholder:text-muted-foreground focus:ring-ring"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="How was your day? What's been on your mind?"
          rows={4}
          disabled={isLoading || !!limitError || isDailyLimitReached()}
        />
        <div className="flex justify-between items-center"> {/* Added items-center */}
          <button
            type="submit"
            disabled={isLoading || !!limitError || isDailyLimitReached()}
            // IMPROVEMENT: Use Button component from ui/button for consistent styling and accessibility.
            // e.g. <Button type="submit" disabled={...}>
            className="self-start bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Listening..." : "Send"}
          </button>

          {subscription && ( // Add null check for subscription
            <div className="text-xs text-muted-foreground self-end">
              {/* FIX: getRemainingChats() currently returns "N/A". This UI will be misleading. */}
              {subscription.tier === 'free' ? (
                <span>{getRemainingChats()}/10 daily chats remaining</span>
              ) : subscription.tier === 'plus' ? (
                <span>{getRemainingChats()}/30 daily chats remaining</span>
              ) : (<span>Unlimited chats (Pro)</span>)}
            </div>
          )}
        </div>
      </form>

      {emotion && (
        <div className="emotion-display mt-4 flex items-center gap-2">
          <strong className="text-sm text-foreground/90">Detected Emotion:</strong>
          <EmotionIcon emotion={emotion} characterSet={userCharacterSet as EmotionCharacterKey} />
        </div>
      )}

      {/* Journal entries section is correctly commented out if handled elsewhere */}

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              Unlock higher usage limits and more features
            </DialogDescription>
          </DialogHeader>
          {/* Assuming SubscriptionSelector handles its own data fetching and actions */}
          <SubscriptionSelector
            onClose={() => setShowUpgradeDialog(false)}
            currentTier={subscription?.tier} // Add null check
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default UpdatedEmotionChat;