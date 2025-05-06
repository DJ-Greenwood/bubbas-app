'use client';

import React, { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from '@/utils/firebaseClient';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets'; 
import { setUserUID } from '@/utils/encryption';
import { getPassPhrase } from '@/utils/chatServices';
import JournalCard from '@/components/JournalChat/Journal/JournalCard';
import { resetConversation, askQuestion, startEmotionalSupportSession, saveChat } from "@/utils/chatServices";
import * as chatService from '@/utils/chatServices';
import { JournalEntry } from '@/types/JournalEntry';

const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);

  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [passPhrase, setPassPhrase] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);

  // Initialize Bubbas in emotional support mode
  useEffect(() => {
    const initializeChat = async () => {
      try {
        await startEmotionalSupportSession();
      } catch (error) {
        console.error("Failed to initialize chat service:", error);
      }
    };
    
    initializeChat();
  }, []);

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
        const phrase = await getPassPhrase();
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
      const loaded = await chatService.loadChats('active');
      setJournalEntries(loaded);
    } catch (error) {
      console.error("Failed to load journal entries:", error);
    }
  };

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

      // Save chat to database if user is authenticated
      if (user && passPhrase) {
        await saveChat(userInput, reply, detectedEmotionText, usage);
        // Reload journal entries to show the new entry
        await loadJournalEntries();
      }
    } catch (error) {
      console.error("Failed to submit:", error);
      setResponse("Oops! Something went wrong. Bubba is trying again.");
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
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
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
      {journalEntries.length > 0 && (
        <div className="journal mt-8 border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">📝 Your Conversation History</h3>
          <div className="space-y-4">
            {journalEntries.map((entry) => (
              <JournalCard
                key={entry.timestamp}
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