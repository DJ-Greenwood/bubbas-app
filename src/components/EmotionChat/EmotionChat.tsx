'use client';

import React, { useState, useEffect } from "react";
import { auth } from '../../utils/firebaseClient';
import EmotionIcon, { Emotion } from '../../components/emotion/EmotionIcon';
import { detectEmotion } from '../../components/emotion/EmotionDetector';
import { setUserUID } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/passPhraseService';
import JournalCard from '../JournalChat/Journal/JournalCard';
import firebaseChatService from '@/utils/firebaseChatService'; // New consolidated chatService
import * as chatService from '@/utils/chatServices'; // New consolidated chatService
import { JournalEntry } from '@/types/JournalEntry';


const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [passPhrase, setPassPhrase] = useState<string>("");

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserUID(user.uid);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const phrase = await fetchPassPhrase();
      if (phrase) {
        setPassPhrase(phrase);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (passPhrase) {
      loadJournal();
    }
  }, [passPhrase]);

  const loadJournal = async () => {
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
      const detectedEmotion = await detectEmotion(userInput);
      setEmotion(detectedEmotion);

      const { reply, usage } = await firebaseChatService.askQuestion(userInput);
      setResponse(reply);

      await chatService.saveChat(userInput, reply, usage);

      await loadJournal();
    } catch (error) {
      console.error("Failed to submit:", error);
      setResponse("Oops! Something went wrong. Bubbas is trying again.");
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  };

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        <img src='/assets/images/emotions/default.jpg' alt="Bubba the AI" className="w-16 h-16 object-cover rounded" />
        Bubba the AI Emotional Chat
      </h2>
      <p className="text-gray-600">
        Let Bubba help you reflect on your day, express how you’re feeling, or unwind for the weekend. 💬
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
        <div className="response-display mt-4">
          <strong>Yorkie:</strong> {response}
        </div>
      )}

      {journalEntries.length > 0 && (
        <div className="journal mt-8 border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">📝 Your Emotional Journal</h3>
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
