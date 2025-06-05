import * as functions from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore'; // FieldValue not used in this snippet, but kept if used elsewhere
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import {
  initializeTransactionUsage,
  recordTransactionSubcall,
  saveConversationHistory
} from './utils/usage'; // adjust path as needed


if (!getApps().length) initializeApp();
const db = getFirestore(); // db is defined, assuming it's used in './utils/usage' or other parts of the application

// Secret APIKEY
const GEMINI_API_KEY = defineSecret("gemini-key"); // Define without .value() here
// Secret Model
const GEMINI_MODEL = defineSecret("gemini-model"); // Define without .value() here

type GeminiMessage = { role: 'user' | 'model', parts: { text: string }[] };
type GeminiUsage = { promptTokens: number, completionTokens: number, totalTokens: number };
type GeminiResponse = { content: string, model: string, usage: GeminiUsage, transactionId: string };

// Call Gemini
export const callGemini = functions.onCall({ secrets: [GEMINI_API_KEY, GEMINI_MODEL] }, async (request) => { // Added GEMINI_MODEL to secrets
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
  const modelName = GEMINI_MODEL.value() || 'gemini-pro'; // Access model name here, with fallback
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    // Usage tracking init - use resolved modelName here
    if (effectiveUserId) {
      await initializeTransactionUsage(effectiveUserId, transactionId, 'chat', modelName); // Corrected: Use modelName
    }

    const result = await model.generateContent({ contents: formattedMessages });
    const response = result.response; // Get the response object
    const text = response.text();
    const usageMeta = response.usageMetadata;

    const usage = {
      promptTokens: usageMeta?.promptTokenCount || 0,
      completionTokens: usageMeta?.candidatesTokenCount || 0, // or completionTokenCount, check API for exact field
      totalTokens: usageMeta?.totalTokenCount || 0,
    };

    if (effectiveUserId) {
      // Corrected: Use resolved modelName
      await recordTransactionSubcall(effectiveUserId, transactionId, 'chat', usage.promptTokens, usage.completionTokens, usage.totalTokens, modelName);
      if (saveHistory && sessionId) {
        // Corrected: Use resolved modelName
        await saveConversationHistory(effectiveUserId, sessionId, messages.at(-1) as GeminiMessage, { role: 'model', parts: [{ text }] }, modelName, transactionId);
      }
    }

    return {
      content: text,
      model: modelName, // Return the actual model name used
      usage,
      transactionId,
    };
  } catch (err: any) {
    console.error('[callGemini] Error:', err);
    // Check if the error has a specific structure from the Gemini API to provide more context if available
    const errorMessage = err.message || 'Failed to call Gemini API';
    const errorDetails = err.details || err.stack; // Include stack for better debugging in logs
    throw new functions.HttpsError('internal', errorMessage, errorDetails);
  }
});

/**
 * Generates a Gemini response given messages and options.
 * This function can be called from other server-side logic.
 */
export async function generateGeminiResponse({
  messages,
  userId,
  saveHistory = false,
  sessionId,
  transactionId,
  modelName: inputModelName, // Renamed to avoid conflict with internal modelName variable
  apiKey,
}: {
  messages: GeminiMessage[],
  userId?: string,
  saveHistory?: boolean,
  sessionId?: string,
  transactionId?: string,
  modelName?: string,
  apiKey?: string,
}): Promise<GeminiResponse> {
  const effectiveApiKey = apiKey || GEMINI_API_KEY.value(); // Assumes GEMINI_API_KEY is accessible or passed
  const effectiveModel = inputModelName || GEMINI_MODEL.value() || 'gemini-pro'; // Assumes GEMINI_MODEL is accessible or passed
  const effectiveTransactionId = transactionId || uuidv4();

  const genAI = new GoogleGenerativeAI(effectiveApiKey);
  const model = genAI.getGenerativeModel({ model: effectiveModel });

  let effectiveUserId = userId || null; // userId is optional here, depends on context

  // Initialize usage tracking if a user ID is available
  if (effectiveUserId) {
    await initializeTransactionUsage(effectiveUserId, effectiveTransactionId, 'chat', effectiveModel);
  }

  const formattedMessages = messages.map((msg: GeminiMessage) => ({
    role: msg.role,
    parts: msg.parts,
  }));

  try {
    const result = await model.generateContent({ contents: formattedMessages });
    const response = result.response;
    const text = response.text();
    const usageMeta = response.usageMetadata;

    const usage = {
      promptTokens: usageMeta?.promptTokenCount || 0,
      completionTokens: usageMeta?.candidatesTokenCount || 0,
      totalTokens: usageMeta?.totalTokenCount || 0,
    };

    if (effectiveUserId) {
      await recordTransactionSubcall(
        effectiveUserId,
        effectiveTransactionId,
        'chat',
        usage.promptTokens,
        usage.completionTokens,
        usage.totalTokens,
        effectiveModel
      );
      if (saveHistory && sessionId) {
        await saveConversationHistory(
          effectiveUserId,
          sessionId,
          messages.at(-1) as GeminiMessage, // Assuming messages is not empty
          { role: 'model', parts: [{ text }] },
          effectiveModel,
          effectiveTransactionId
        );
      }
    }

    return {
      content: text,
      model: effectiveModel,
      usage,
      transactionId: effectiveTransactionId,
    };
  } catch (err: any) {
    console.error('[generateGeminiResponse] Error:', err);
    // Re-throw the error to be handled by the caller, or handle it specifically if needed
    // For example, you could throw a more generic error or a custom error type
    throw new Error(`Failed to generate Gemini response: ${err.message}`);
  }
}

/**
 * Simple wrapper to ask Gemini and get a response.
 */
export async function askGemini(messages: GeminiMessage[], options?: {
  userId?: string,
  saveHistory?: boolean,
  sessionId?: string,
  transactionId?: string,
  modelName?: string,
  apiKey?: string,
}): Promise<GeminiResponse> {
  return generateGeminiResponse({
    messages,
    ...(options || {}), // Spread options, ensuring it's an object if undefined
  });
}

/**
 * Starts a new emotional support session with Gemini.
 */
export async function startGeminiEmotionalSupportSession({
  userId,
  initialPrompt,
  sessionId: inputSessionId, // Renamed to avoid confusion if generating a new one
  modelName,
  apiKey,
  transactionId: inputTransactionId, // Allow passing a transactionId
}: {
  userId: string, // userId is explicitly required for this session
  initialPrompt: string,
  sessionId?: string,
  modelName?: string,
  apiKey?: string,
  transactionId?: string,
}): Promise<GeminiResponse> {
  const messages: GeminiMessage[] = [
    {
      role: 'user',
      parts: [{ text: initialPrompt }],
    },
  ];

  // Ensure a session ID exists or generate one if critical for this function's logic
  const sessionId = inputSessionId || uuidv4(); // Generate a session ID if not provided
  const transactionId = inputTransactionId; // Use provided or let generateGeminiResponse create one

  return generateGeminiResponse({
    messages,
    userId,
    saveHistory: true, // Emotional support sessions likely always save history
    sessionId,
    modelName,
    apiKey,
    transactionId,
  });
}