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
exports.callGemini = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const generative_ai_1 = require("@google/generative-ai");
const uuid_1 = require("uuid");
const usage_1 = require("./utils/usage"); // adjust path as needed
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// Secret APIKEY 
const GEMINI_API_KEY = (0, params_1.defineSecret)("gemini-key"); // Define without .value() here
// Secret Model
const GEMINI_MODEL = (0, params_1.defineSecret)("gemini-model"); // Define without .value() here
// Call Gemini
exports.callGemini = functions.onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
    const { messages, userId, saveHistory = false, sessionId, transactionId: inputTransactionId } = request.data; // Access data here
    const transactionId = inputTransactionId || (0, uuid_1.v4)();
    const auth = request.auth;
    const effectiveUserId = auth?.uid || null;
    if (userId && userId !== effectiveUserId) {
        throw new functions.HttpsError('permission-denied', 'UserId mismatch with authenticated user');
    }
    if (!Array.isArray(messages)) {
        throw new functions.HttpsError('invalid-argument', 'messages must be an array');
    }
    const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts,
    }));
    // Gemini setup - Initialize *inside* the function
    const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY.value());
    const modelName = GEMINI_MODEL.value(); // Access model name here
    const model = genAI.getGenerativeModel({ model: modelName || 'gemini-pro' });
    try {
        // Usage tracking init - use modelName here
        if (effectiveUserId) {
            await (0, usage_1.initializeTransactionUsage)(effectiveUserId, transactionId, 'chat', GEMINI_MODEL.value());
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
            await (0, usage_1.recordTransactionSubcall)(effectiveUserId, transactionId, 'chat', usage.promptTokens, usage.completionTokens, usage.totalTokens, 'gemini-pro');
            if (saveHistory && sessionId) {
                await (0, usage_1.saveConversationHistory)(effectiveUserId, sessionId, messages.at(-1), { role: 'model', parts: [{ text }] }, 'gemini-pro', transactionId);
            }
        }
        return {
            content: text,
            model: modelName, // Return the actual model name
            usage,
            transactionId,
        };
    }
    catch (err) {
        console.error('[callGemini] Error:', err);
        throw new functions.HttpsError('internal', 'Failed to call Gemini API', err.message);
    }
});
//# sourceMappingURL=geminiFunctions.js.map