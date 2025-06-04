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
exports.continueConversationGemini = void 0;
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
exports.continueConversationGemini = functions.onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
    const { sessionId, message, userId, transactionId: providedTransactionId } = request.data;
    const transactionId = providedTransactionId || (0, uuid_1.v4)();
    const auth = request.auth;
    const effectiveUserId = auth?.uid || null;
    if (!sessionId || !message) {
        throw new functions.HttpsError('invalid-argument', 'Session ID and message are required');
    }
    if (userId && userId !== effectiveUserId) {
        throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
    }
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        // Rebuild conversation history
        let conversationHistory = [
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
            await (0, usage_1.initializeTransactionUsage)(effectiveUserId, transactionId, 'continue_conversation', 'gemini-pro');
        }
        const result = await model.generateContent({
            contents: conversationHistory
        });
        const reply = result.response.text().trim();
        const usage = result.response.usageMetadata;
        if (effectiveUserId) {
            await (0, usage_1.recordTransactionSubcall)(effectiveUserId, transactionId, 'continue_conversation', usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0, usage?.totalTokenCount || 0, 'gemini-pro');
            await (0, usage_1.saveConversationHistory)(effectiveUserId, sessionId, { role: 'user', parts: [{ text: message }] }, { role: 'model', parts: [{ text: reply }] }, 'gemini-pro', transactionId);
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
    }
    catch (error) {
        console.error('[continueConversationGemini] Error:', error);
        throw new functions.HttpsError('internal', 'Failed to continue conversation');
    }
});
//# sourceMappingURL=continueConversationGemini.js.map