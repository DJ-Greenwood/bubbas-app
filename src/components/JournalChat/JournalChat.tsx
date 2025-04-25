'use client';
import React, { useState, useEffect } from "react";
import chatService from '../../utils/firebaseChatService';
import { functions, db, auth } from '../../utils/firebaseClient';
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { encryptData, decryptData } from '../../utils/encryption';

type Emotion =
  | "joyful" | "peaceful" | "tired" | "nervous"
  | "frustrated" | "grateful" | "hopeful" | "isolated"
  | "confused" | "reflective" | "sad" | "angry";

interface JournalEntry {
  userText: string;
  bubbaReply: string;
  emotion: Emotion;
  timestamp: string;
}

const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [iconSize, setIconSize] = useState<'small' | 'large'>('small');

  const saveJournalEntry = httpsCallable(functions, "saveJournalEntry");

  useEffect(() => {
    chatService.startEmotionalSupportSession();
    loadJournalEntries();
    loadUserIconPreference();
  }, []);

  const loadUserIconPreference = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const profileRef = doc(db, "users", user.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const data = profileSnap.data();
      if (data.preferences?.iconSize === 'large' || data.preferences?.iconSize === 'small') {
        setIconSize(data.preferences.iconSize);
      }
    }
  };

  const loadJournalEntries = async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      const ref = collection(db, "journals", user.uid, "entries");
      const snapshot = await getDocs(ref);
      const entries: JournalEntry[] = [];
  
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        console.log("📄 Raw Firestore doc:", data);
      
        const encrypted = data.encryptedData;
        const timestamp = data.createdAt || docSnap.id; // use doc ID if it’s a timestamp
      
        if (!encrypted || !timestamp) {
          console.warn("⚠️ Missing encryptedData or timestamp");
          return;
        }
      
        try {
          const decrypted = decryptData(encrypted);
          console.log("✅ Decrypted:", decrypted);
      
          entries.push({
            ...decrypted,
            timestamp,
            emotion: decrypted.emotion as Emotion,
          });
        } catch (err) {
          console.error("❌ Decryption error:", err);
        }
      });
  
      setJournalEntries(entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    } catch (error) {
      console.error("❌ Error loading journal entries:", error);
      setResponse("Failed to load journal entries. Please try again later.");
    }
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
    return <img src={imageUrl} alt={sentiment} className="w-16 h-16 object-cover rounded" />;
  };

  const detectEmotion = async (message: string): Promise<Emotion> => {
    const analysisPrompt = `This is a short message from someone: "${message}". Based on tone and word choice, what emotion are they likely feeling? Respond with only one word: joyful, peaceful, tired, nervous, frustrated, grateful, hopeful, isolated, confused, reflective, sad, or angry.`;
    const result: string = await chatService.generateResponse(analysisPrompt);
    const cleaned = result.trim().toLowerCase();

    const allowedEmotions: Emotion[] = [
      "joyful", "peaceful", "tired", "nervous", "frustrated",
      "grateful", "hopeful", "isolated", "confused", "reflective",
      "sad", "angry"
    ];

    if (allowedEmotions.includes(cleaned as Emotion)) {
      return cleaned as Emotion;
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
        userText: userInput,
        bubbaReply: reply,
        emotion: detectedEmotion,
        timestamp: new Date().toISOString()
      };

      const encryptedEntry = encryptData(newEntry);
      await saveJournalEntry({ entryData: encryptedEntry });
      setJournalEntries(prev => [newEntry, ...prev]);
    } catch (error) {
      console.error("Error:", error);
      setResponse(`Oops! Something went wrong. Bubbas is trying again. Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
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
        <div className="emotion-display mt-4">
          <strong>Detected Emotion:</strong> {getEmotionIcon(emotion)}
        </div>
      )}

      {response && (
        <div className="response-display mt-4">
          <strong>Bubba:</strong> {response}
        </div>
      )}

      <div className="journal-entries mt-6">
        <h3 className="text-lg font-semibold">Your Journal Entries</h3>
        {Object.entries(
          journalEntries.reduce((acc, entry) => {
            const date = new Date(entry.timestamp).toLocaleDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push(entry);
            return acc;
          }, {} as Record<string, JournalEntry[]>)
        ).map(([date, entries]) => (
          <details key={date} className="mt-2">
            <summary className="cursor-pointer text-blue-600 hover:underline">
              {date}
            </summary>
            <div className="mt-2 space-y-2">
              {entries.map((entry, index) => (
                <div
                  key={index}
                  className="p-3 border rounded bg-gray-50 shadow-sm"
                >
                  <p>
                    <strong>You:</strong> {entry.userText}
                  </p>
                  <p>
                    <strong>Bubba:</strong> {entry.bubbaReply}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <strong>Emotion:</strong> {getEmotionIcon(entry.emotion)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default EmotionChat;
