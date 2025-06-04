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
exports.analyzeEmotionWithTrackingGemini = void 0;
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
exports.analyzeEmotionWithTrackingGemini = functions.onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
    const { text, userId, transactionId: providedTransactionId } = request.data;
    const transactionId = providedTransactionId || (0, uuid_1.v4)();
    const auth = request.auth;
    const effectiveUserId = auth?.uid || null;
    if (userId && userId !== effectiveUserId) {
        throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
    }
    if (!text) {
        throw new functions.HttpsError('invalid-argument', 'Text is required');
    }
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        if (effectiveUserId) {
            await (0, usage_1.initializeTransactionUsage)(effectiveUserId, transactionId, 'emotion_analysis', 'gemini-pro');
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
            await (0, usage_1.recordTransactionSubcall)(effectiveUserId, transactionId, 'emotion_analysis', usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0, usage?.totalTokenCount || 0, 'gemini-pro');
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
        }
        catch (parseError) {
            console.warn("[analyzeEmotionWithTrackingGemini] Failed to parse JSON:", rawText);
            throw new functions.HttpsError('internal', 'Failed to parse emotion analysis result');
        }
    }
    catch (error) {
        console.error("[analyzeEmotionWithTrackingGemini] Error:", error);
        throw new functions.HttpsError('internal', 'Failed to analyze emotion');
    }
});
//# sourceMappingURL=analyzeEmotionWithTrackingGemini.js.map