// Gemini-based Firebase Function placeholder
import * as functions from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { initializeTransactionUsage, recordTransactionSubcall, saveConversationHistory } from './utils/usage';

if (!getApps().length) initializeApp();
const db = getFirestore();

const GEMINI_API_KEY = defineSecret("gemini-key");

export const startEmotionalSupportSessionGemini = functions.onCall(
  { secrets: [GEMINI_API_KEY] },
  async (data, context) => {
    const { userId, transactionId: providedTransactionId } = data;
    const transactionId = providedTransactionId || uuidv4();

    const auth = context.auth;
    const effectiveUserId = auth?.uid || null;

    if (userId && userId !== effectiveUserId && effectiveUserId !== 'system') { // Added system check for potential background tasks
      throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
    }

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

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
   
    try {
      if (effectiveUserId) {
        await initializeTransactionUsage(effectiveUserId, transactionId, 'emotional_support', 'gemini-pro');
      }

      const result = await model.generateContent({
        contents: [
          {
            role: 'system',
            parts: [{ text: emotionalPrompt }],
          },
        ],
      });

      const reply = result.response.text().trim();
      const usage = result.response.usageMetadata;

      const sessionId = `emotional-support-${Date.now()}`;

      if (effectiveUserId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          'start_session',
          usage?.promptTokenCount || 0,
          usage?.candidatesTokenCount || 0,
          usage?.totalTokenCount || 0,
          'gemini-pro'
        );

        await saveConversationHistory(
          effectiveUserId,
          sessionId,
          { role: 'system', parts: [{ text: emotionalPrompt }] },
          { role: 'model', parts: [{ text: reply }] },
          'gemini-pro',
          transactionId
        );
      }

      return {
        reply,
        emotion: inferSimpleEmotion(reply),
        sessionId,
        transactionId,
        usage: {
          promptTokens: usage?.promptTokenCount || 0,
          completionTokens: usage?.candidatesTokenCount || 0,
          totalTokens: usage?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error('[startEmotionalSupportSessionGemini] Error:', error);
      throw new functions.HttpsError('internal', 'Failed to start emotional support session');
    }
  }
);

function inferSimpleEmotion(reply: string): string {
  const r = reply.toLowerCase();
  if (r.includes("sorry") || r.includes("here for you")) return "empathetic";
  if (r.includes("great") || r.includes("wonderful")) return "happy";
  if (r.includes("hmm") || r.includes("interesting")) return "curious";
  return "neutral";
}
