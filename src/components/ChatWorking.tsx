import { useState, useEffect } from "react";
import chatService from '../utils/firebaseChatService';

// 🧠 Define emotion types and response format
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

interface DetectEmotionResponse {
  emotion: Emotion;
}

const EmotionChat = () => {
  const [userInput, setUserInput] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🧠 Initialize Bubbas in emotional support mode
  useEffect(() => {
    chatService.startEmotionalSupportSession();
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

    return <img
    src={imageUrl}
    alt={sentiment}
    className="w-16 h-16 object-cover rounded"
  />;
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
    return "reflective"; // fallback
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
    } catch (error) {
      console.error("Error:", error);
      setResponse("Oops! Something went wrong. Bubbas is trying again.");
    } finally {
      setIsLoading(false);
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
      <div className="emotion-display">
        <strong>Detected Emotion:</strong> {getEmotionIcon(emotion)}
      </div>
)}

      {response && (
        <div className="response-display">
          <strong>Yorkie:</strong> {response}
        </div>
      )}
    </div>
  );
};

export default EmotionChat;
