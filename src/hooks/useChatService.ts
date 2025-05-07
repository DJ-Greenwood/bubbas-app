import { useState, useCallback } from "react";
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets';
import { useToast } from "@/hooks/use-toast";
import { resetConversation, askQuestion, startEmotionalSupportSession } from '@/utils/chatServices';

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ChatResult {
  reply: string;
  emotion: Emotion;
  usage: OpenAIUsage;
}

export const useChatService = () => {
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState("");
  const [usage, setUsage] = useState<OpenAIUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize the chat service with a specific mode
  const initializeChat = useCallback(async (mode: 'emotional' | 'helpful' = 'helpful') => {
    try {
      if (mode === 'emotional') {
        const initialSessionResponse = await startEmotionalSupportSession();
        if (initialSessionResponse && initialSessionResponse.reply) {
          setResponse(initialSessionResponse.reply);
          if (initialSessionResponse.emotion) {
            setEmotion(initialSessionResponse.emotion);
          }
          if (initialSessionResponse.usage) {
            setUsage(initialSessionResponse.usage);
          }
        }
      } else {
        // Standard helpful assistant mode
        resetConversation("You are Bubba, a helpful AI assistant.");
        setResponse("Hi there! I'm Bubba, your AI assistant. How can I help you today?");
      }
      return true;
    } catch (error) {
      console.error("Failed to initialize chat service:", error);
      toast({
        title: "Initialization Error",
        description: "There was a problem starting the chat. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const sendMessage = useCallback(async (userInput: string): Promise<ChatResult | null> => {
    if (!userInput.trim()) return null;
    
    setIsLoading(true);

    try {
      // Detect emotion from user input
      const detectedEmotion = await detectEmotion(userInput);
      setEmotion(detectedEmotion);

      // Get response from chat service
      const result = await askQuestion(userInput);
      
      // Ensure we have a valid response
      if (!result || !result.reply) {
        throw new Error("No response received from AI service");
      }
      
      // Set the response state with the AI's reply
      setResponse(result.reply);
      
      // Set usage information if available
      if (result.usage) {
        setUsage(result.usage);
      }
      
      return {
        reply: result.reply,
        emotion: detectedEmotion,
        usage: result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      };
    } catch (error) {
      console.error("Error processing message:", error);
      setResponse("Oops! Something went wrong. Bubba is trying again.");
      toast({
        title: "Error",
        description: "There was a problem processing your message. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  

  const resetChat = useCallback(async (mode: 'emotional' | 'helpful' = 'helpful') => {
    setResponse("");
    setEmotion(null);
    setUsage(null);
    
    return initializeChat(mode);
  }, [initializeChat]);

  return {
    emotion,
    response,
    usage,
    isLoading,
    initializeChat,
    sendMessage,
    resetChat
  };
};

export default useChatService;