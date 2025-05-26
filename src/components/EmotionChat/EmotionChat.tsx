'use client';

import React, { useState, useEffect, useCallback } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from '@/utils/firebaseClient';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets'; 
import JournalCard from '@/components/JournalChat/Journal/JournalCard'; // Ensure JournalCard accepts masterKey
import { resetConversation, askQuestion, startEmotionalSupportSession, saveChat } from "@/utils/chatServices";
import * as chatService from '@/utils/chatServices';
import { getMasterKey } from '@/utils/encryption';
import { JournalEntry } from '@/types/JournalEntry';

const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Initialize Bubbas in emotional support mode
  useEffect(() => {
    const initializeChat = async () => {
      try {
        await startEmotionalSupportSession();
        await loadMasterKey();
      } catch (error) {
        console.error("Failed to initialize chat service:", error);
      }
    };
    
    // Attempt to get the master key when the component mounts
    const loadMasterKey = async () => {
      try {
        const key = await getMasterKey();
        setMasterKey(key);
      } catch (error) {
        console.error("Failed to get master key:", error);
      }
    };
    initializeChat();
  }, []);

  // Listen for auth state and set user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      }
    });
    return () => unsubscribe();
  }, []);


  // Load journal entries when user is available
  useEffect(() => {
    if (user) {
      loadJournalEntries();
    }
  }, [user]);

  const loadJournalEntries = useCallback(async () => {  //Use useCallback to prevent unnecessary re-renders
    if (!user) return;
    
    try {
      const loaded = await chatService.loadChats('active');
      setJournalEntries(loaded);
    } catch (error: any) {
      if (error.message === "MASTER_KEY_NOT_AVAILABLE") {
        console.error("Master key not available. Cannot load journal entries.");
        return; 
      }
      console.error("Failed to load journal entries:", error);
    }
  }, [user]); // Dependency array includes 'user' to re-run when user changes


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setIsLoading(true);
    setResponse("");

    try {
      // Detect emotion from user input
      const detectedEmotionText = await detectEmotion(userInput);
      setEmotion(detectedEmotionText);


      // Get response from chat service
      const { reply, usage } = await askQuestion(userInput);
      setResponse(reply);

      // Save chat to database if user is authenticated and master key is available
      if (user) {
        try {
          await saveChat(userInput, reply, detectedEmotionText, usage);
          // Reload journal entries to show the new entry
          await loadJournalEntries();
        } catch (saveError: any) {
          if (saveError.message === "MASTER_KEY_NOT_AVAILABLE") {
            console.error("Master key not available. Cannot save chat entry.");
          } else {
            console.error("Failed to save chat entry:", saveError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to submit:", error);
      setResponse("Oops! Something went wrong. Bubba is trying again.");
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  };

  // Determine if journal entries should be displayed
  const showJournalEntries = journalEntries.length > 0 && masterKey !== null;
  // Determine if new messages can be sent (requires master key for saving)
  const canSendMessages = user && masterKey !== null && !isLoading;

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        <img src='/assets/images/emotions/Bubba/default.jpg' alt="Bubba the AI" className="w-16 h-16 object-cover rounded" />
        Bubba the AI Emotional Chat
      </h2>
      <p className="text-gray-600">
        Let Bubba help you reflect on your day, express how you're feeling, or unwind for the weekend. 💬
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <textarea
          className="w-full p-3 rounded border text-base"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="How was your day? What's been on your mind?"
          rows={4}
          disabled={!canSendMessages} // Disable if cannot send messages
        />
        <button
          type="submit"
          disabled={!canSendMessages} // Disable if cannot send messages
          className="self-start bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isLoading ? "Listening..." : "Send"}
        </button>
      </form>

      {emotion && (
        <div className="emotion-display mt-4 flex items-center gap-2">
          <strong>Detected Emotion:</strong> <EmotionIcon emotion={emotion} size={64} />
        </div>
      )}

      {response && (
        <div className="response-display mt-4 p-4 bg-white rounded-lg shadow">
          <strong>Bubba:</strong> {response}
        </div>
      )}

      {/* Journal entries section */}
      {showJournalEntries && (
        <div className="journal mt-8 border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">📝 Your Conversation History</h3>
          <div className="space-y-4">
            {journalEntries.map((entry) => (
              <JournalCard
                key={entry.timestamp}
                masterKey={masterKey as string} // Pass the masterKey
                entry={entry}
                onEdit={undefined}
                onSoftDelete={undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionChat;