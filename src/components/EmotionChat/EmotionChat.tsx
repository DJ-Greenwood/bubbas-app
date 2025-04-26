'use client';
import React, { useState, useEffect } from "react";
import chatService from '../../utils/firebaseChatService';
import { functions, db, auth } from '../../utils/firebaseClient';
import { httpsCallable } from "firebase/functions";
import { collection, getDocs } from "firebase/firestore";
import { encryptData, decryptData } from '../../utils/encryption';

// 🧠 Define emotion types
type Emotion =
  | "joyful" | "peaceful" | "tired" | "nervous"
  | "frustrated" | "grateful" | "hopeful" | "isolated"
  | "confused" | "reflective" | "sad" | "angry";

// 🧠 Correct JournalEntry type
export type JournalEntry = {
  version: number;
  userText: string;
  bubbaReply: string;
  emotion: Emotion;
  timestamp: string;
  deleted?: boolean; // Optional soft delete flag
};

const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [passPhrase, setPassPhrase] = useState<string>("");

  useEffect(() => {
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

    fetchPassPhrase();
  }, []);
  const saveJournalEntry = httpsCallable(functions, "saveJournalEntry");

  useEffect(() => {
    chatService.startEmotionalSupportSession();
    loadJournalEntries();
  }, []);

  const loadJournalEntries = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = collection(db, "journals", user.uid, "entries");
    const snapshot = await getDocs(ref);
    const entries: JournalEntry[] = [];

    snapshot.forEach(doc => {
      try {
        const rawData = doc.data() as any; // raw encrypted
        const decrypted = decryptData(rawData, passPhrase) as JournalEntry;
        entries.push(decrypted);
      } catch (err) {
        console.warn("❌ Failed to decrypt journal entry", err);
        setResponse("Failed to load journal entries. Please try again later.");
      }
    });

    setJournalEntries(entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  };

  const getEmotionIcon = (sentiment: Emotion): JSX.Element => {
    const emotionImageMap: Record<Emotion, string> = {
      joyful: "/assets/images/emotions/Joyful.jpg",
      peaceful: "/assets/images/emotions/Peaceful.jpg",
      tired: "/assets/images/emotions/Drained.jpg",
      nervous: "/assets/images/emotions/Nervous.jpg",
      frustrated: "/assets/images/emotions/Frustrated.jpg",
      grateful: "/assets/images/emotions/Greatful.jpg",
      hopeful: "/assets/images/emotions/Hopeful.jpg",
      isolated: "/assets/images/emotions/Isolated.jpg",
      confused: "/assets/images/emotions/Confused.jpg",
      reflective: "/assets/images/emotions/Reflective.jpg",
      sad: "/assets/images/emotions/Sad.jpg",
      angry: "/assets/images/emotions/Angry.jpg",
    };
    const imageUrl = emotionImageMap[sentiment] || "/assets/images/emotions/default.jpg";
    return <img src={imageUrl} alt={sentiment} className="w-8 h-8 object-cover rounded" />;
  };

  const detectEmotion = async (message: string): Promise<Emotion> => {
    const analysisPrompt = `This is a short message from someone: "${message}". Based on tone and word choice, what emotion are they likely feeling? Respond with only one word: joyful, peaceful, tired, nervous, frustrated, grateful, hopeful, isolated, confused, reflective, sad, or angry.`;
    const result: string = await chatService.generateResponse(analysisPrompt);
    const cleaned = result.trim().toLowerCase() as Emotion;

    const allowedEmotions: Emotion[] = [
      "joyful", "peaceful", "tired", "nervous", "frustrated",
      "grateful", "hopeful", "isolated", "confused", "reflective",
      "sad", "angry"
    ];

    if (allowedEmotions.includes(cleaned)) {
      return cleaned;
    }

    console.warn("Unexpected emotion returned:", result);
    setResponse("Bubba is unsure how to interpret that. Let's try again.");
    return "reflective";
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
        version: 1, // ✅ Version added
        userText: userInput,
        bubbaReply: reply,
        emotion: detectedEmotion,
        timestamp: new Date().toISOString(),
        deleted: false, // ✅ default false (optional)
      };

      const encryptedEntry = encryptData({ ...newEntry, deleted: newEntry.deleted ?? false }, passPhrase);
      await saveJournalEntry({ entryData: encryptedEntry });

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
        <div className="emotion-display mt-4">
          <strong>Detected Emotion:</strong> {getEmotionIcon(emotion)}
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
                className="bg-white bg-opacity-30 rounded shadow-md cursor-pointer p-4"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-800 font-semibold truncate max-w-xs">
                    {entry.userText.slice(0, 40)}{entry.userText.length > 40 && "..."}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                    {getEmotionIcon(entry.emotion)}
                  </div>
                </div>

                {expandedIndex === index && (
                  <div className="mt-3 text-sm text-gray-700 space-y-2">
                    <p><strong>You:</strong> {entry.userText}</p>
                    <p><strong>Yorkie:</strong> {entry.bubbaReply}</p>
                    <p><strong>Emotion:</strong> {entry.emotion}</p>
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
