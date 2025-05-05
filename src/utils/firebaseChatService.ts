// src/utils/firebaseChatService.ts
'use client';

import { httpsCallable } from "firebase/functions";
import { functions, db, auth } from './firebaseClient'; // Import db and auth
import { getDoc, doc } from 'firebase/firestore'; // Import Firestore methods
import { detectEmotion } from '@/components/emotion/EmotionDetector'; // Import detectEmotion function
import { Emotion } from '@/components/emotion/emotionAssets';
import { UserProfileData } from '@/types/UserProfileData'; // Import UserProfileData type

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

// 🧠 Chat service to manage conversation history and interactions
let conversationHistory: { role: string; content: string }[] = [];

const openai_model = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o"; // Corrected to NEXT_PUBLIC_

// 🔄 Reset the conversation history with a system prompt
const resetConversation = (systemPrompt: string) => {
  console.log("[resetConversation] Resetting conversation with system prompt:", systemPrompt);
  conversationHistory = [{ role: "system", content: systemPrompt }];
};

// 💬 Continue conversation with context via Firebase Function
const askQuestion = async (question: string): Promise<OpenAIResponse> => {
  console.log("[askQuestion] Received question:", question);
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

    return { reply: assistantReply, usage };
  } catch (error) {
    console.error("[askQuestion] Error while calling Firebase Callable Function:", error);
    throw error;
  }
};

// ✨ One-off message via Firebase Function
const generateResponse = async (prompt: string): Promise<OpenAIResponse> => {
  console.log("[generateResponse] Received prompt:", prompt);

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

    return { reply: assistantReply, usage };
  } catch (error) {
    console.error("[generateResponse] Error while calling Firebase Callable Function:", error);
    throw error;
  }
};

// 🧸 Start emotional support session with a custom system prompt and return Bubba's first message
const startEmotionalSupportSession = async (): Promise<{ reply: string; usage: OpenAIUsage; emotion: Emotion }> => {
  const emotionalPrompt = `
You are Bubbas, a compassionate AI companion. Your goal is to help the user reflect on their day, process emotions, and feel supported.
Ask thoughtful, open-ended questions like:

- "How did your day go?"
- "What’s been on your mind lately?"
- "Any plans for the weekend or time off?"
- "What’s something you’re looking forward to?"
- "Do you want to talk about anything that’s bothering you?"

Be supportive, non-judgmental, and empathetic. Keep your tone gentle and friendly.
  `.trim();

  console.log("[startEmotionalSupportSession] Starting emotional support session with prompt:", emotionalPrompt);

  try {
    // 💬 Start the session with system prompt
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

    // 🧠 Detect Bubba's emotion based on his reply
    const emotion = await detectEmotion(assistantReply);

    return { reply: assistantReply, usage, emotion };
  } catch (error) {
    console.error("[startEmotionalSupportSession] Error starting session:", error);
    throw error;
  }
};

// 🧑‍💻 Get user profile to check TTS settings and other features
const getUserProfile = async (): Promise<UserProfileData | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User is not authenticated');
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfileData;
    } else {
      console.error('No user profile found');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

const firebaseChatService = {
  resetConversation,
  askQuestion,
  generateResponse,
  startEmotionalSupportSession,
  getUserProfile,
};

export default firebaseChatService;
