// Gemini-based Firebase Function placeholder
import * as functions from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { initializeTransactionUsage, recordTransactionSubcall } from './utils/usage';

if (!getApps().length) initializeApp();
const db = getFirestore();

    const { text, userId, transactionId: providedTransactionId } = request.data;
    const transactionId = providedTransactionId || uuidv4();

    const auth = request.auth;
    const effectiveUserId = auth?.uid || null;

    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
    }

    if (!text) {
      throw new functions.HttpsError('invalid-argument', 'Text is required');
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      if (effectiveUserId) {
        await initializeTransactionUsage(effectiveUserId, transactionId, 'emotion_analysis', 'gemini-pro');
      }

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analyze the emotional tone of the following text and return a JSON object like this:
{
  "primaryEmotion": "happy",
  "intensity": 7,
  "secondaryEmotion": "excited",
  "briefExplanation": "The tone is upbeat and enthusiastic about future events."
}

Text: "${text}"`,
              },
            ],
          },
        ],
      });

      const rawText = result.response.text();
      const usage = result.response.usageMetadata;

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

      try {
        const emotionData = JSON.parse(rawText);
        return {
          ...emotionData,
          usage: {
            promptTokens: usage?.promptTokenCount || 0,
            completionTokens: usage?.candidatesTokenCount || 0,
            totalTokens: usage?.totalTokenCount || 0,
          },
          transactionId,
        };
      } catch (parseError) {
        console.warn("[analyzeEmotionWithTrackingGemini] Failed to parse JSON:", rawText);
        throw new functions.HttpsError('internal', 'Failed to parse emotion analysis result');
      }
    } catch (error) {
      console.error("[analyzeEmotionWithTrackingGemini] Error:", error);
      throw new functions.HttpsError('internal', 'Failed to analyze emotion');
    }
  }
);
