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
exports.analyzeEmotionGemini = void 0;
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
exports.analyzeEmotionGemini = functions.onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
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
        // Initialize genAI inside the function
        const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY.value());
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
                            text: `Analyze the emotional content of the following text. Return only the emotion (like: happy, sad, angry, anxious, calm, excited, frustrated, neutral, confused, hopeful, overwhelmed, grateful, determined, or pensive) with no extra text.\n\n"${text}"`,
                        },
                    ],
                },
            ],
        });
        const reply = result.response.text().trim().toLowerCase();
        const usage = result.response.usageMetadata;
        if (effectiveUserId) {
            await (0, usage_1.recordTransactionSubcall)(effectiveUserId, transactionId, 'emotion_analysis', usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0, usage?.totalTokenCount || 0, 'gemini-pro');
        }
        return {
            emotion: reply,
            usage: {
                promptTokens: usage?.promptTokenCount || 0,
                completionTokens: usage?.candidatesTokenCount || 0,
                totalTokens: usage?.totalTokenCount || 0,
            },
            transactionId,
        };
    }
    catch (error) {
        console.error("[analyzeEmotionGemini] Error:", error);
        throw new functions.HttpsError('internal', 'Failed to analyze emotion');
    }
});
//# sourceMappingURL=analyzeEmotionGemini.js.map