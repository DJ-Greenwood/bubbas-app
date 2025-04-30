"use client";
import { useState, useEffect } from "react";
import chatService from '../../utils/firebaseChatService';
import { detectEmotion } from '@/components/emotion/EmotionDetector'; // Import detectEmotion
import EmotionIcon from '@/components/emotion/EmotionIcon'; // Import EmotionIcon component

// 🧠 Define emotion types
type Emotion =
  | "joyful"
  | "peaceful"
  | "tired"
  | "nervous"
  | "frustrated"
  | "grateful"
  | "hopeful"
  | "isolated"
  | "confused"
  | "reflective"
  | "sad"
  | "angry";

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [usage, setUsage] = useState<OpenAIUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🧠 Initialize Bubbas in emotional support mode
  useEffect(() => {
    chatService.startEmotionalSupportSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setIsLoading(true);
    setEmotion(null);
    setResponse("");
    setUsage(null);

    try {
      const detectedEmotion = await detectEmotion(userInput);
      setEmotion(detectedEmotion);

      const result = await chatService.askQuestion(userInput);
      setResponse(result.reply || "");
      setUsage(result.usage || null);
      setUserInput(""); // Clear input after sending
    } catch (error) {
      console.error("Error:", error);
      setResponse("Oops! Something went wrong. Bubbas is trying again.");
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
    
  
  };

  return (
    <div className="emotion-chat-container bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-300 rounded-lg p-4 shadow-md">
      <h2 className="flex items-center gap-2">
        <img
          src='/assets/images/emotions/Bubba/default.jpg'
          alt="Bubba the AI"
          className="w-20 h-20 object-cover rounded"
        />
        Bubba the AI Emotional Support Companion
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
          <strong>Detected Emotion:</strong> <EmotionIcon emotion={emotion} />
        </div>
      )}

      {response && (
        <div className="response-display mt-4 relative bg-white p-4 rounded shadow">
          <strong>Bubbas response:</strong> <div className="mt-2">{response}</div>
          <p>
          </p>

          {usage && (
            <div className="text-xs text-gray-500 absolute bottom-2 right-2">
              Tokens: {usage.totalTokens} (Prompt: {usage.promptTokens}, Completion: {usage.completionTokens})
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmotionChat;
