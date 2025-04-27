// src/app/emotion/EmotionChat.tsx
'use client';

import React, { useState, useEffect } from "react";
import chatService from '../../utils/firebaseChatService';
import { functions, db, auth } from '../../utils/firebaseClient';
import { httpsCallable } from "firebase/functions";
import { collection, getDocs } from "firebase/firestore";
import { encryptData, decryptData } from '../../utils/encryption';
import EmotionIcon, { Emotion } from '../../components/emotion/EmotionIcon';
import { detectEmotion } from '../../components/emotion/EmotionDetector';
import { parseFirestoreDate } from '../../utils/parseDate';
import { JournalEntry } from '@/types/JournalEntry';


const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [passPhrase, setPassPhrase] = useState<string>("");

  const saveJournalEntry = httpsCallable(functions, "saveJournalEntry");

  useEffect(() => {
    chatService.startEmotionalSupportSession();
    fetchPassPhrase();
    loadJournalEntries();
  }, []);

  const fetchPassPhrase = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userPreferencesRef = collection(db, "users", user.uid, "preferences");
      const snapshot = await getDocs(userPreferencesRef);
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.passPhrase) {
          setPassPhrase(data.passPhrase);
        }
      });
    } catch (error) {
      console.error("Failed to fetch passphrase:", error);
    }
  };

  const loadJournalEntries = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = collection(db, "journals", user.uid, "entries");
    const snapshot = await getDocs(ref);
    const entries: JournalEntry[] = [];

    snapshot.forEach(doc => {
      try {
        const rawData = doc.data() as any;
        const decrypted = decryptData(rawData.encryptedData, passPhrase) as JournalEntry;
        if (decrypted) {
          entries.push({ ...decrypted, emotion: rawData.emotion, timestamp: rawData.timestamp });
        }
      } catch (err) {
        console.warn("❌ Failed to decrypt journal entry", err);
        setResponse("Failed to load journal entries. Please try again later.");
      }
    });

    setJournalEntries(entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setIsLoading(true);
    setEmotion(null);
    setResponse("");

    try {
      const detectedEmotion = await detectEmotion(userInput);
      setEmotion(detectedEmotion);

      const reply = await chatService.askQuestion(userInput);
      setResponse(reply);

      const newEntry: JournalEntry = {
        version: 1,
        userText: userInput,
        bubbaReply: reply,
        emotion: detectedEmotion,
        timestamp: new Date().toISOString(),
        deleted: false,
      };

      const encryptedEntry = encryptData({
        userText: newEntry.userText,
        bubbaReply: newEntry.bubbaReply,
      }, passPhrase);

      await saveJournalEntry({
        entryData: encryptedEntry,
        emotion: newEntry.emotion,
        timestamp: newEntry.timestamp,
        deleted: false,
        version: 1,
        promptToken: newEntry.promptToken, // optional, for tracking prompt tokens
        completionToken: newEntry.completionToken, // optional, for tracking completion tokens
        totalToken: newEntry.totalToken, // optional, for tracking total tokens
        usage: { promptTokens: newEntry.promptToken, completionTokens: newEntry.completionToken, totalTokens: newEntry.totalToken, }, // optional, for tracking token usage
      });

      setJournalEntries(prev => [newEntry, ...prev]);
    } catch (error) {
      console.error("Error:", error);
      setResponse(`Oops! Something went wrong. Bubba is trying again. Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        <img
          src='/assets/images/emotions/default.jpg'
          alt="Bubba the AI"
          className="w-16 h-16 object-cover rounded"
        />
        Bubba the AI Emotional Chat
      </h2>
      <p className="text-gray-600">
        Let Yorkie help you reflect on your day, express how you’re feeling, or unwind for the weekend. 💬
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
          <strong>Detected Emotion:</strong> <EmotionIcon emotion={emotion} size={40} />
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
            {journalEntries.map((entry, index) => (
                <div
                key={index}
                className="bg-white bg-opacity-30 rounded shadow-md cursor-pointer p-4 relative"
                onClick={() => toggleExpand(index)}
                >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-800 font-semibold truncate max-w-xs">
                  {entry.userText.slice(0, 40)}{entry.userText.length > 40 && "..."}
                  </div>
                  <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{parseFirestoreDate(entry.timestamp).toLocaleString()}</span>
                  <EmotionIcon emotion={entry.emotion} size={24} />
                  </div>
                </div>
                {expandedIndex === index && (
                  <div className="mt-3 text-sm text-gray-700 space-y-2">
                  <p><strong>You:</strong> {entry.userText}</p>
                  <p><strong>Bubba:</strong> {entry.bubbaReply}</p>
                  <p><strong>Emotion:</strong> {entry.emotion}</p>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                  <p>Prompt Tokens: {entry.promptToken || "N/A"}</p>
                  <p>Completion Tokens: {entry.completionToken || "N/A"}</p>
                  <p>Total Tokens: {entry.totalToken || "N/A"}</p>
                </div>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionChat;