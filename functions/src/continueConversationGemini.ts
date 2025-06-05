import * as functions from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  initializeTransactionUsage,
  recordTransactionSubcall,
  saveConversationHistory
} from './utils/usage';

if (!getApps().length) initializeApp();
const db = getFirestore();

const GEMINI_API_KEY = defineSecret("gemini-key");

export const continueConversationGemini = functions.onCall(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    const { sessionId, message, userId, transactionId: providedTransactionId } = request.data;
    const transactionId = providedTransactionId || uuidv4();
    const auth = request.auth;
    const effectiveUserId = auth?.uid || null;

    if (!sessionId || !message) {
      throw new functions.HttpsError('invalid-argument', 'Session ID and message are required');
    }

    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
    }

    try {
      // ✅ safe usage of secret at runtime
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      let conversationHistory: { role: string; parts: { text: string }[] }[] = [
        {
          role: 'system',
          parts: [{ text: 'You are Bubbas, a kind, emotionally supportive AI companion.' }]
        }
      ];

      if (effectiveUserId) {
        const snapshot = await db
          .collection('conversations')
          .where('userId', '==', effectiveUserId)
          .where('sessionId', '==', sessionId)
          .orderBy('createdAt')
          .get();

        snapshot.forEach(doc => {
          const data = doc.data();
          conversationHistory.push(data.userMessage);
          conversationHistory.push(data.assistantMessage);
        });
      }

      conversationHistory.push({
        role: 'user',
        parts: [{ text: message }]
      });

      if (effectiveUserId && !providedTransactionId) {
        await initializeTransactionUsage(
          effectiveUserId,
          transactionId,
          'continue_conversation',
          'gemini-pro'
        );
      }

      const result = await model.generateContent({
        contents: conversationHistory
      });

      const reply = result.response.text().trim();
      const usage = result.response.usageMetadata;

      if (effectiveUserId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          'continue_conversation',
          usage?.promptTokenCount || 0,
          usage?.candidatesTokenCount || 0,
          usage?.totalTokenCount || 0,
          'gemini-pro'
        );

        await saveConversationHistory(
          effectiveUserId,
          sessionId,
          { role: 'user', parts: [{ text: message }] },
          { role: 'model', parts: [{ text: reply }] },
          'gemini-pro',
          transactionId
        );
      }

      return {
        reply,
        usage: {
          promptTokens: usage?.promptTokenCount || 0,
          completionTokens: usage?.candidatesTokenCount || 0,
          totalTokens: usage?.totalTokenCount || 0,
        },
        sessionId,
        transactionId
      };
    } catch (error) {
      console.error('[continueConversationGemini] Error:', error);
      throw new functions.HttpsError('internal', 'Failed to continue conversation');
    }
  }
);
