import * as functions from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import {
  initializeTransactionUsage,
  recordTransactionSubcall,
  saveConversationHistory
} from './utils/usage'; // adjust path as needed


if (!getApps().length) initializeApp();
const db = getFirestore();

// Secret APIKEY 
const GEMINI_API_KEY = defineSecret("gemini-key"); // Define without .value() here
// Secret Model
const GEMINI_MODEL = defineSecret("gemini-model"); // Define without .value() here

type GeminiMessage = { role: 'user' | 'model', parts: { text: string }[] };
type GeminiUsage = { promptTokens: number, completionTokens: number, totalTokens: number };
type GeminiResponse = { content: string, model: string, usage: GeminiUsage, transactionId: string };

// Call Gemini
export const callGemini = functions.onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  const { messages, userId, saveHistory = false, sessionId, transactionId: inputTransactionId } = request.data; // Access data here
  const transactionId = inputTransactionId || uuidv4();

  const auth = request.auth;
  const effectiveUserId = auth?.uid || null;

  if (userId && userId !== effectiveUserId) {
    throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
  }

  if (!Array.isArray(messages)) {
    throw new functions.HttpsError('invalid-argument', 'messages must be an array');
  }

  const formattedMessages = messages.map((msg: GeminiMessage) => ({
    role: msg.role,
    parts: msg.parts,
  }));

  // Gemini setup - Initialize *inside* the function
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
  const modelName = GEMINI_MODEL.value(); // Access model name here
  const model = genAI.getGenerativeModel({ model: modelName || 'gemini-pro' });

  try {
    // Usage tracking init - use modelName here
    if (effectiveUserId) {
      await initializeTransactionUsage(effectiveUserId, transactionId, 'chat', GEMINI_MODEL.value());
    }

    const result = await model.generateContent({ contents: formattedMessages });
    const text = result.response.text();
    const usageMeta = result.response.usageMetadata;

    const usage = {
      promptTokens: usageMeta?.promptTokenCount || 0,
      completionTokens: usageMeta?.candidatesTokenCount || 0,
      totalTokens: usageMeta?.totalTokenCount || 0,
    };

    if (effectiveUserId) {
      await recordTransactionSubcall(effectiveUserId, transactionId, 'chat', usage.promptTokens, usage.completionTokens, usage.totalTokens, 'gemini-pro');
      if (saveHistory && sessionId) {
        await saveConversationHistory(effectiveUserId, sessionId, messages.at(-1), { role: 'model', parts: [{ text }] }, 'gemini-pro', transactionId);
      }
    }

    return {
      content: text,
      model: modelName, // Return the actual model name
      usage,
      transactionId,
    };
  } catch (err: any) {
    console.error('[callGemini] Error:', err);
    throw new functions.HttpsError('internal', 'Failed to call Gemini API', err.message);
  }
});
