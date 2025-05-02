// src/utils/enhancedChatService.ts
'use client';

import { httpsCallable } from "firebase/functions";
import { functions } from './firebaseClient';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets';
import { saveChat } from './chatServices';
import { recordTokenUsage, checkTokenLimits } from './tokenTrackingService';
import { useToast } from '@/hooks/use-toast';

const callOpenAI = httpsCallable(functions, "callOpenAI");

// Structure of the expected return from callOpenAI
interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface OpenAIResponse {
  reply: string;
  usage: OpenAIUsage;
}

// Manage conversation history and interactions
let conversationHistory: { role: string; content: string }[] = [];

const openai_model = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o";

// Reset the conversation history with a system prompt
const resetConversation = (systemPrompt: string) => {
  console.log("[resetConversation] Resetting conversation with system prompt:", systemPrompt);
  conversationHistory = [{ role: "system", content: systemPrompt }];
};

// Check if user has reached their usage limits
const checkUsageLimits = async (): Promise<{ canProceed: boolean; message?: string }> => {
  try {
    const limitCheck = await checkTokenLimits();
    
    return {
      canProceed: limitCheck.canUseService,
      message: limitCheck.message
    };
  } catch (error) {
    console.error('Error checking usage limits:', error);
    // Allow usage in case of error
    return { canProceed: true };
  }
};

// Continue conversation with context via Firebase Function
const askQuestion = async (question: string, passPhrase?: string): Promise<OpenAIResponse> => {
  console.log("[askQuestion] Received question:", question);
  
  // Check if user has reached their limits
  const limitCheck = await checkUsageLimits();
  if (!limitCheck.canProceed) {
    console.warn("[askQuestion] User has reached their limits:", limitCheck.message);
    return {
      reply: `I'm sorry, but ${limitCheck.message} Please try again later or consider upgrading your plan for increased limits.`,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    };
  }
  
  conversationHistory.push({ role: "user", content: question });

  try {
    console.log("[askQuestion] Sending request to Firebase Callable Function with conversation history:", conversationHistory);
    const response = await callOpenAI({
      messages: conversationHistory,
      model: openai_model,
      maxTokens: 1000,
    });

    const data = response.data as OpenAIResponse;
    const assistantReply = data.reply || "No response generated";
    const usage = data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    console.log("[askQuestion] Received response:", assistantReply, "Tokens:", usage);

    conversationHistory.push({ role: "assistant", content: assistantReply });
    
    // Record token usage
    await recordTokenUsage(usage);
    
    // Save to journal if passPhrase is provided
    if (passPhrase) {
      try {
        const emotion = await detectEmotion(question);
        await saveChat(question, assistantReply, usage, passPhrase);
      } catch (saveError) {
        console.error("[askQuestion] Error saving chat:", saveError);
        // Continue anyway, even if saving fails
      }
    }

    return { reply: assistantReply, usage };
  } catch (error) {
    console.error("[askQuestion] Error while calling Firebase Callable Function:", error);
    throw error;
  }
};

// One-off message via Firebase Function
const generateResponse = async (prompt: string): Promise<OpenAIResponse> => {
  console.log("[generateResponse] Received prompt:", prompt);
  
  // Check if user has reached their limits
  const limitCheck = await checkUsageLimits();
  if (!limitCheck.canProceed) {
    console.warn("[generateResponse] User has reached their limits:", limitCheck.message);
    return {
      reply: `I'm sorry, but ${limitCheck.message} Please try again later or consider upgrading your plan for increased limits.`,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    };
  }

  try {
    console.log("[generateResponse] Sending request to Firebase Callable Function with prompt:", prompt);
    const response = await callOpenAI({
      messages: [{ role: "user", content: prompt }],
      model: openai_model,
      maxTokens: 1000,
    });

    const data = response.data as OpenAIResponse;
    const assistantReply = data.reply || "No response generated";
    const usage = data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    console.log("[generateResponse] Received response:", assistantReply, "Tokens:", usage);
    
    // Record token usage
    await recordTokenUsage(usage);

    return { reply: assistantReply, usage };
  } catch (error) {
    console.error("[generateResponse] Error while calling Firebase Callable Function:", error);
    throw error;
  }
};

// Start emotional support session with a custom system prompt and return Bubba's first message
const startEmotionalSupportSession = async (): Promise<{ reply: string; usage: OpenAIUsage; emotion: Emotion }> => {
  const emotionalPrompt = `
You are Bubbas, a compassionate AI companion. Your goal is to help the user reflect on their day, process emotions, and feel supported.
Ask thoughtful, open-ended questions like:

- "How did your day go?"
- "What's been on your mind lately?"
- "Any plans for the weekend or time off?"
- "What's something you're looking forward to?"
- "Do you want to talk about anything that's bothering you?"

Be supportive, non-judgmental, and empathetic. Keep your tone gentle and friendly.
  `.trim();

  console.log("[startEmotionalSupportSession] Starting emotional support session with prompt:", emotionalPrompt);
  
  // Check if user has reached their limits
  const limitCheck = await checkUsageLimits();
  if (!limitCheck.canProceed) {
    console.warn("[startEmotionalSupportSession] User has reached their limits:", limitCheck.message);
    const defaultReply = `Hi! I'm Bubba. I'm sorry, but ${limitCheck.message} Please consider upgrading your plan for increased limits.`;
    return {
      reply: defaultReply,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      emotion: "reflective"
    };
  }

  try {
    // Start the session with system prompt
    conversationHistory.length = 0; // Reset history
    conversationHistory.push({ role: "system", content: emotionalPrompt });

    const response = await callOpenAI({
      messages: conversationHistory,
      model: openai_model,
      maxTokens: 1000,
    });

    const data = response.data as OpenAIResponse;
    const assistantReply = data.reply || "Hi! I'm here whenever you're ready to talk.";
    const usage = data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    console.log("[startEmotionalSupportSession] Bubba's first reply:", assistantReply);

    conversationHistory.push({ role: "assistant", content: assistantReply });
    
    // Record token usage
    await recordTokenUsage(usage);

    // Detect Bubba's emotion based on his reply
    const emotion = await detectEmotion(assistantReply);

    return { reply: assistantReply, usage, emotion };
  } catch (error) {
    console.error("[startEmotionalSupportSession] Error starting session:", error);
    throw error;
  }
};

// Hook to get toast notifications
const useTokenWarning = () => {
  const { toast } = useToast();
  
  const showLimitWarning = async () => {
    try {
      const limitCheck = await checkTokenLimits();
      if (!limitCheck.canUseService) {
        toast({
          title: "Usage Limit Reached",
          description: limitCheck.message,
          variant: "destructive"
        });
        return false;
      }
      
      const limits = limitCheck.limits;
      if (limits && (
        (limits.dailyRemaining <= 3) || // Only 3 or fewer daily chats remaining
        (limits.monthlyRemaining / limits.monthlyLimit <= 0.1) // Less than 10% of monthly tokens remaining
      )) {
        toast({
          title: "Getting Close to Your Limits",
          description: limits.dailyRemaining <= 3 
            ? `You have ${limits.dailyRemaining} chats remaining today.` 
            : `You're using ${Math.round((1 - limits.monthlyRemaining / limits.monthlyLimit) * 100)}% of your monthly tokens.`,
          variant: "default"
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error checking limits for warning:', error);
      return true; // Allow usage on error
    }
  };
  
  return { showLimitWarning };
};

const enhancedChatService = {
  resetConversation,
  askQuestion,
  generateResponse,
  startEmotionalSupportSession,
  useTokenWarning,
  checkUsageLimits
};

export default enhancedChatService;