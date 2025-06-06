'use client';

import {
  saveJournalEntry,
  getJournalEntries,
  editJournalEntry,
  softDeleteJournalEntry,
  recoverJournalEntry,
  hardDeleteJournalEntry,
  getUserEmotionCharacterSet,
  
} from '@/utils/firebaseDataService';
import { saveTokenUsage } from './TokenDataService';

import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { JournalEntry } from '@/types/JournalEntry';


import { httpsCallable } from "firebase/functions";
import { functions, db, auth as firebaseAuth } from './firebaseClient'; // Renamed imported auth to firebaseAuth
import { getDoc, doc } from 'firebase/firestore'; // Import Firestore methods
import { Emotion } from '@/components/emotion/emotionAssets';
import { UserProfileData } from '@/types/UserProfileData'; // Import UserProfileData type

const callGeminiCloudFunction = httpsCallable(functions, "callGemini"); // Use the new callable function name

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
export const resetConversation = (systemPrompt: string) => {
  console.log("[resetConversation] Resetting conversation with system prompt:", systemPrompt);
  conversationHistory = [{ role: "system", content: systemPrompt }];
};

// Use only the Firebase Callable Function for Gemini
async function callGemini(messages: { role: string; content: string }[]): Promise<OpenAIResponse> {
  console.log("[callGemini] Calling Firebase Function for Gemini API...");
  try {
    const result = await callGeminiCloudFunction({ messages });
    // Safely extract reply and usage from result.data
    const data = result.data as any;
    return {
      reply: data.reply || data.content || "No response generated",
      usage: data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    };
  } catch (error) {
    throw new Error("Error calling Gemini Firebase Function: " + error);
  }
}

export const askQuestion = async (question: string): Promise<OpenAIResponse> => {
  console.log("[askQuestion] Received question:", question);
  conversationHistory.push({ role: "user", content: question });
  try {
    // Use the original conversationHistory format for callGemini
    console.log("[askQuestion] Calling Gemini Cloud Function with conversation history:", conversationHistory);
    const { reply, usage } = await callGemini(conversationHistory);
    console.log("[askQuestion] Received response:", reply, "Tokens:", usage);
    conversationHistory.push({ role: "assistant", content: reply });
    return { reply, usage };
  } catch (error) {
    console.error("[askQuestion] Error while calling Gemini Cloud Function:", error);
    throw error;
  }
};

export const generateResponse = async (prompt: string): Promise<OpenAIResponse> => {
  console.log("[generateResponse] Received prompt:", prompt);
  try {
    // Use the original message format for callGemini
    const messages = [{ role: 'user', content: prompt }];
    console.log("[generateResponse] Calling Gemini Cloud Function with messages:", messages);
    const { reply, usage } = await callGemini(messages);
    console.log("[generateResponse] Received response:", reply, "Tokens:", usage);
    return { reply, usage };
  } catch (error) {
    console.error("[generateResponse] Error while calling Gemini Cloud Function:", error);
    throw error;
  }
};

export const startEmotionalSupportSession = async (): Promise<{ reply: string; usage: OpenAIUsage }> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    const initialPrompt = "I need emotional support.";
    // Use the original message format for callGemini
    const messages = [{ role: 'user', content: initialPrompt }];
    const { reply, usage } = await callGemini(messages);
    conversationHistory.length = 0;
    conversationHistory.push({ role: "system", content: reply });
    conversationHistory.push({ role: "assistant", content: reply });
    return { reply, usage };
  } catch (error) {
    console.error("[startEmotionalSupportSession] Error starting session:", error);
    throw error;
  }
};

// 🧑‍💻 Get user profile to check TTS settings and other features
export const getUserProfile = async (): Promise<UserProfileData | null> => {
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

// Existing functions
const auth = firebaseAuth; // Use the renamed firebaseAuth

// Helper function to get user UID
const getUserUID = (): string | null => {
  const user = auth.currentUser;
  return user ? user.uid : null;
};

// ✅ Save new chat/journal entry - now with character set
export async function saveChat(
  userText: string,
  bubbaReply: string,
  detectedEmotionText: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number },
) {
  // Call the centralized function with all parameters
  return saveJournalEntry(
    userText,
    bubbaReply,
    detectedEmotionText,
    usage
  );
}

// ✅ For backward compatibility
export const saveConversation = saveChat;

// ✅ Load journal entries by status
export async function loadChats(
  status: 'active' | 'trash' = 'active',
  uid?: string
): Promise<JournalEntry[]> {
  return getJournalEntries(status, uid);
}

// ✅ For backward compatibility
export const loadConversation = loadChats;

// ✅ Edit a chat entry
export async function editChat(
  timestamp: string,
  newUserInput: string,
  decryptionKey: string,
  uid?: string
) {
  return editJournalEntry(timestamp, newUserInput, uid);
}

// ✅ For backward compatibility
export const editConversation = async (
  timestamp: string,
  newUserInput: string,
  uid: string,
  decryptionKey: string
) => {
  return editChat(timestamp, newUserInput, decryptionKey, uid);
};

// ✅ Soft delete (move to trash)
export async function softDeleteChat(
  timestamp: string,
  decryptionKey: string,
  uid?: string
) {
  return softDeleteJournalEntry(timestamp, uid);
}

// ✅ For backward compatibility
export const softDeleteConversation = async (
  timestamp: string,
  uid: string
) => {
  return softDeleteChat(timestamp, "", uid);
};

// ✅ Recover from trash
export async function recoverChat(
  timestamp: string,
  uid?: string
) {
  return recoverJournalEntry(timestamp, uid);
}

// ✅ For backward compatibility
export const recoverConversation = async (
  timestamp: string,
  uid: string
) => {
  return recoverChat(timestamp, uid);
};

// ✅ Hard delete journal entry but KEEP token usage records
export async function hardDeleteChat(
  timestamp: string,
  uid?: string
) {
  return hardDeleteJournalEntry(timestamp, uid);
}

// ✅ For backward compatibility
export const hardDeleteConversation = async (
  timestamp: string,
  uid: string
) => {
  return hardDeleteChat(timestamp, uid);
};

