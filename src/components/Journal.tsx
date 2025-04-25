import { useState, useEffect } from "react";
import chatService from '../utils/firebaseChatService';
import { encryptData, decryptData } from '../utils/encryption';
import { JournalEntry } from '../types/JournalEntry';

// 🧠 Define emotion types and response format
type Emotion =
  | "joyful" | "peaceful" | "tired" | "nervous"
  | "frustrated" | "grateful" | "hopeful" | "isolated"
  | "confused" | "reflective" | "sad" | "angry";

const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<string[]>([]);


  useEffect(() => {
    if (typeof window !== "undefined") {
      chatService.startEmotionalSupportSession();
    }
  }, []);

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

    return (
      <img
        src={imageUrl}
        alt={sentiment}
        className="w-16 h-16 object-cover rounded"
      />
    );
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

    return allowedEmotions.includes(cleaned as Emotion)
      ? (cleaned as Emotion)
      : "reflective";
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

      // 📝 Add to journal with encryption
      const timestamp = new Date().toLocaleString();
      const newEntry: JournalEntry = {
        userText: userInput,
        bubbaReply: reply,
        emotion: detectedEmotion,
        timestamp,
      };

      const encryptedEntry = encryptData(newEntry);
      setJournalEntries((prev) => [encryptedEntry, ...prev]); // newest first
    } catch (error) {
      console.error("Error:", error);
      setResponse("Oops! Something went wrong. Bubbas is trying again.");
    } finally {
      setIsLoading(false);
      setUserInput(""); // clear input after submission
    }
  };

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        <img
          src="/assets/images/emotions/default.jpg"
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
        <div className="emotion-display flex items-center gap-2 mt-4">
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
          <h3 className="text-lg font-semibold mb-2">📝 Your Emotional Journal</h3>
          <ul className="space-y-4">
            {journalEntries.map((encryptedEntry, index) => {
              const decryptedEntry = decryptData(encryptedEntry); // Decrypt the entry
              return (
                <li key={index} className="p-4 bg-white bg-opacity-30 rounded shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{decryptedEntry.timestamp}</span>
                    <span>{getEmotionIcon(decryptedEntry.emotion as Emotion)}</span>
                  </div>
                  <p><strong>You:</strong> {decryptedEntry.userText}</p>
                  <p><strong>Yorkie:</strong> {decryptedEntry.bubbaReply}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EmotionChat;
