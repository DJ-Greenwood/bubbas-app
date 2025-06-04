"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEmotionalChatGemini = void 0;
// Gemini-based Firebase Function placeholder
const functions = __importStar(require("firebase-functions/v2/https"));
const params_1 = require("firebase-functions/params");
const generative_ai_1 = require("@google/generative-ai");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
const usage_1 = require("./utils/usage");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const GEMINI_API_KEY = (0, params_1.defineSecret)("gemini-key");
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY.value());
exports.processEmotionalChatGemini = functions.onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
    const { message, sessionId: providedSessionId, userId, analyzeEmotion = true, transactionId: providedTransactionId } = request.data;
    const transactionId = providedTransactionId || (0, uuid_1.v4)();
    const auth = request.auth;
    const effectiveUserId = auth?.uid || null;
    if (userId && userId !== effectiveUserId) {
        throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
    }
    if (!message) {
        throw new functions.HttpsError('invalid-argument', 'Message is required');
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const emotionModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
    let sessionId = providedSessionId || `emotional-support-${Date.now()}`;
    let conversationHistory = [];
    try {
        if (effectiveUserId) {
            await (0, usage_1.initializeTransactionUsage)(effectiveUserId, transactionId, 'emotional_chat', 'gemini-pro');
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
            }
            else {
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
            }
            catch {
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
                await (0, usage_1.recordTransactionSubcall)(effectiveUserId, transactionId, 'emotion_analysis', usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0, usage?.totalTokenCount || 0, 'gemini-pro');
            }
        }
        const result = await model.generateContent({ contents: conversationHistory });
        const reply = result.response.text().trim();
        const usage = result.response.usageMetadata;
        if (effectiveUserId) {
            await (0, usage_1.recordTransactionSubcall)(effectiveUserId, transactionId, 'generate_response', usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0, usage?.totalTokenCount || 0, 'gemini-pro');
            await (0, usage_1.saveConversationHistory)(effectiveUserId, sessionId, { role: 'user', parts: [{ text: message }] }, { role: 'model', parts: [{ text: reply }] }, 'gemini-pro', transactionId);
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
    }
    catch (error) {
        console.error('[processEmotionalChatGemini] Error:', error);
        throw new functions.HttpsError('internal', 'Failed to process emotional chat');
    }
});
//# sourceMappingURL=processEmotionalChatGemini.js.map