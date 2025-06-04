// Gemini-based Firebase Function placeholder
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

export const processEmotionalChatGemini = functions.onCall(
  { secrets: [GEMINI_API_KEY] },
  async (data, context) => {
    const {
      message,
      sessionId: providedSessionId,
      userId,
      analyzeEmotion = true,
      transactionId: providedTransactionId
    } = data;

    const transactionId = providedTransactionId || uuidv4();
    const auth = request.auth;
    const effectiveUserId = auth?.uid || null;

    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
    }

    if (!message) {
      throw new functions.HttpsError('invalid-argument', 'Message is required');
    }

    // Initialize genAI and models inside the function
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' }); // Use a specific model here

    let sessionId = providedSessionId || `emotional-support-${Date.now()}`;
    let conversationHistory: { role: string; parts: { text: string }[] }[] = [];

    try {
      if (effectiveUserId) {
        await initializeTransactionUsage(
          effectiveUserId,
          transactionId,
          'emotional_chat',
          'gemini-pro'
        );

        if (providedSessionId) {
          const snapshot = await db
            .collection('conversations')
            .where('userId', '==', effectiveUserId)
            .where('sessionId', '==', providedSessionId)
            .orderBy('createdAt')
            .get();

          snapshot.forEach(doc => {
            const data = doc.data();
            conversationHistory.push(data.userMessage);
            conversationHistory.push(data.assistantMessage);
          });
        } else {
          conversationHistory.push({
            role: 'system',
            parts: [
              {
                text: `You are Bubbas, a compassionate AI companion helping the user reflect on their emotions. Be supportive, non-judgmental, and insightful.`
              }
            ]
          });
        }
      }

      conversationHistory.push({ role: 'user', parts: [{ text: message }] });

      let emotionData = null;

      if (analyzeEmotion) {
        // Initialize emotionModel inside the emotion analysis block if only used here
        const emotionModel = genAI.getGenerativeModel({ model: 'gemini-pro' }); // Use a specific model here
        const emotionResult = await emotionModel.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Analyze this message and return JSON:
{
  "primaryEmotion": "happy",
  "intensity": 7,
  "briefExplanation": "The user is feeling upbeat about future events."
}
Message: "${message}"`
                }
              ]
            }
          ]
        });

        const rawText = emotionResult.response.text();

        try {
          emotionData = JSON.parse(rawText);
        } catch {
          emotionData = {
            primaryEmotion: 'neutral',
            intensity: 1,
            briefExplanation: 'Unable to determine emotion.'
          };
        }

        if (conversationHistory[0].role === 'system') {
          conversationHistory[0].parts[0].text += `\n\nUser is feeling ${emotionData.primaryEmotion} (intensity ${emotionData.intensity}/10): ${emotionData.briefExplanation}`;
        }

        const usage = emotionResult.response.usageMetadata;
        if (effectiveUserId) {
          await recordTransactionSubcall(
            effectiveUserId,
            transactionId,
            'emotion_analysis',
            usage?.promptTokenCount || 0,
            usage?.candidatesTokenCount || 0,
            usage?.totalTokenCount || 0,
            'gemini-pro'
          );
        }
      }

      const result = await model.generateContent({ contents: conversationHistory });
      const reply = result.response.text().trim();
      const usage = result.response.usageMetadata;

      if (effectiveUserId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          'generate_response',
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
        emotion: emotionData,
        sessionId,
        transactionId,
        usage: {
          promptTokens: usage?.promptTokenCount || 0,
          completionTokens: usage?.candidatesTokenCount || 0,
          totalTokens: usage?.totalTokenCount || 0,
        }
      };
    } catch (error) {
      console.error('[processEmotionalChatGemini] Error:', error);
      throw new functions.HttpsError('internal', 'Failed to process emotional chat');
    }
  }
);
