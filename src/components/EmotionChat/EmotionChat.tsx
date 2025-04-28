'use client';

import React, { useState, useEffect } from "react";
import chatService from '../../utils/firebaseChatService';
import { encryptData, decryptField } from '../../utils/encryption';
import { auth, db } from '../../utils/firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import EmotionIcon, { Emotion } from '../../components/emotion/EmotionIcon';
import { detectEmotion } from '../../components/emotion/EmotionDetector';
import { parseFirestoreDate } from '../../utils/parseDate';
import { JournalEntry } from '@/types/JournalEntry';
import { saveJournalEntry, loadJournalEntries } from '../../utils/emotionChatService';
import { fetchPassPhrase } from '../../utils/passPhraseService'; // ✅ Correct import
import { setUserUID } from '@/utils/encryption';

const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [passPhrase, setPassPhrase] = useState<string>("");

  // ✅ Fetch passPhrase only once at startup
  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (user) {
        setUserUID(user.uid);
      }

      const phrase = await fetchPassPhrase();
      if (phrase) {
        setPassPhrase(phrase);
      }
    };
    init();
  }, []);

  // ✅ Only after passPhrase is ready
  useEffect(() => {
    if (passPhrase) {
      startSession();
      loadAndDecryptJournalEntries();
    }
  }, [passPhrase]);

  const startSession = async () => {
    try {
      const { reply, usage, emotion } = await chatService.startEmotionalSupportSession();
      setResponse(reply);
      setEmotion(emotion);

      const now = new Date();
      const timestamp = now.toISOString();

      const encryptedUserText = encryptData({ userText: "(Bubba's Welcome)" }, passPhrase);
      const encryptedBubbaReply = encryptData({ bubbaReply: reply }, passPhrase);

      await saveJournalEntry({
        version: 1,
        createdAt: now.toISOString(),
        timestamp,
        emotion,
        encryptedUserText,
        encryptedBubbaReply,
        deleted: false,
        promptToken: usage.promptTokens,
        completionToken: usage.completionTokens,
        totalToken: usage.totalTokens,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
      });

      setJournalEntries(prev => [
        {
          version: 1,
          userText: "(Bubba's Welcome)",
          bubbaReply: reply,
          emotion,
          timestamp,
          deleted: false,
          promptToken: usage.promptTokens,
          completionToken: usage.completionTokens,
          totalToken: usage.totalTokens,
        },
        ...prev
      ]);

    } catch (error) {
      console.error("Failed to start emotional support session:", error);
    }
  };

  const loadAndDecryptJournalEntries = async () => {
    try {
      const loadedEntries = (await loadJournalEntries()) ?? [];
  
      const decryptedEntries: JournalEntry[] = loadedEntries.map((entry) => {
        let userText = "[Missing]";
        let bubbaReply = "[Missing]";
  
        if (entry.encryptedUserText && typeof entry.encryptedUserText === 'string' && entry.encryptedUserText.length > 0) {
          try {
            const decryptedRaw = decryptField(entry.encryptedUserText, passPhrase);
            const parsed = JSON.parse(decryptedRaw);
            userText = parsed.userText || "[Unreadable]";
          } catch (err) {
            console.warn("Failed to decrypt/parse userText:", err);
            userText = entry.userText || "[Unreadable]";
          }
        } else if (entry.userText) {
          userText = entry.userText;
        }
  
        if (entry.encryptedBubbaReply && typeof entry.encryptedBubbaReply === 'string' && entry.encryptedBubbaReply.length > 0) {
          try {
            const decryptedRaw = decryptField(entry.encryptedBubbaReply, passPhrase);
            const parsed = JSON.parse(decryptedRaw);
            bubbaReply = parsed.bubbaReply || "[Unreadable]";
          } catch (err) {
            console.warn("Failed to decrypt/parse bubbaReply:", err);
            bubbaReply = entry.bubbaReply || "[Unreadable]";
          }
        } else if (entry.bubbaReply) {
          bubbaReply = entry.bubbaReply;
        }
  
        return {
          version: entry.version || 1,
          userText,
          bubbaReply,
          emotion: entry.emotion,
          timestamp: entry.timestamp,
          deleted: entry.deleted ?? false,
          promptToken: entry.promptToken ?? 0,
          completionToken: entry.completionToken ?? 0,
          totalToken: entry.totalToken ?? 0,
        };
      });
  
      const validEntries = decryptedEntries.filter(entry =>
        entry.userText !== "[Missing]" && entry.bubbaReply !== "[Missing]"
      );
  
      setJournalEntries(validEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    } catch (error) {
      console.error("Failed to decrypt journal entries:", error);
    }
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

      const { reply, usage } = await chatService.askQuestion(userInput);
      setResponse(reply);

      const now = new Date();
      const timestamp = now.toISOString();

      const encryptedUserText = encryptData({ userText: userInput }, passPhrase);
      const encryptedBubbaReply = encryptData({ bubbaReply: reply }, passPhrase);

      await saveJournalEntry({
        version: 1,
        createdAt: now.toISOString(),
        timestamp,
        emotion: detectedEmotion,
        encryptedUserText,
        encryptedBubbaReply,
        deleted: false,
        promptToken: usage.promptTokens,
        completionToken: usage.completionTokens,
        totalToken: usage.totalTokens,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
      });

      setJournalEntries(prev => [
        {
          version: 1,
          userText: userInput,
          bubbaReply: reply,
          emotion: detectedEmotion,
          timestamp,
          deleted: false,
          promptToken: usage.promptTokens,
          completionToken: usage.completionTokens,
          totalToken: usage.totalTokens,
        },
        ...prev
      ]);

    } catch (error) {
      console.error("Error submitting journal entry:", error);
      setResponse("Oops! Something went wrong. Bubbas is trying again.");
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
                    <EmotionIcon emotion={entry.emotion} size={64} />
                  </div>
                </div>

                {expandedIndex === index && (
                  <div className="mt-3 text-sm text-gray-700 space-y-2">
                    <p><strong>You:</strong> {entry.userText}</p>
                    <p><strong>Bubba:</strong> {entry.bubbaReply}</p>
                    <p><strong>Emotion:</strong> {entry.emotion}</p>
                    <div className="text-xs text-right text-gray-500 mt-2">
                      📜 Tokens Used: Prompt {entry.promptToken} | Completion {entry.completionToken} | Total {entry.totalToken}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionChat;
