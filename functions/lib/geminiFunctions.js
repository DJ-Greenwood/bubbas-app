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
exports.generateGeminiResponse = generateGeminiResponse;
exports.askGemini = askGemini;
exports.startGeminiEmotionalSupportSession = startGeminiEmotionalSupportSession;
const functions = __importStar(require("firebase-functions/v2/https"));
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore"); // FieldValue not used in this snippet, but kept if used elsewhere
const generative_ai_1 = require("@google/generative-ai");
const uuid_1 = require("uuid");
const usage_1 = require("./utils/usage"); // adjust path as needed
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)(); // db is defined, assuming it's used in './utils/usage' or other parts of the application
// Secret APIKEY
const GEMINI_API_KEY = (0, params_1.defineSecret)("gemini-key"); // Define without .value() here
// Secret Model
const GEMINI_MODEL = (0, params_1.defineSecret)("gemini-model"); // Define without .value() here
// Call Gemini
exports.callGemini = functions.onCall({ secrets: [GEMINI_API_KEY, GEMINI_MODEL] }, async (request) => {
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
    const modelName = GEMINI_MODEL.value() || 'gemini-pro'; // Access model name here, with fallback
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
        // Usage tracking init - use resolved modelName here
        if (effectiveUserId) {
            await (0, usage_1.initializeTransactionUsage)(effectiveUserId, transactionId, 'chat', modelName); // Corrected: Use modelName
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
            await (0, usage_1.recordTransactionSubcall)(effectiveUserId, transactionId, 'chat', usage.promptTokens, usage.completionTokens, usage.totalTokens, modelName);
            if (saveHistory && sessionId) {
                // Corrected: Use resolved modelName
                await (0, usage_1.saveConversationHistory)(effectiveUserId, sessionId, messages.at(-1), { role: 'model', parts: [{ text }] }, modelName, transactionId);
            }
        }
        return {
            content: text,
            model: modelName, // Return the actual model name used
            usage,
            transactionId,
        };
    }
    catch (err) {
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
async function generateGeminiResponse({ messages, userId, saveHistory = false, sessionId, transactionId, modelName: inputModelName, // Renamed to avoid conflict with internal modelName variable
apiKey, }) {
    const effectiveApiKey = apiKey || GEMINI_API_KEY.value(); // Assumes GEMINI_API_KEY is accessible or passed
    const effectiveModel = inputModelName || GEMINI_MODEL.value() || 'gemini-pro'; // Assumes GEMINI_MODEL is accessible or passed
    const effectiveTransactionId = transactionId || (0, uuid_1.v4)();
    const genAI = new generative_ai_1.GoogleGenerativeAI(effectiveApiKey);
    const model = genAI.getGenerativeModel({ model: effectiveModel });
    let effectiveUserId = userId || null; // userId is optional here, depends on context
    // Initialize usage tracking if a user ID is available
    if (effectiveUserId) {
        await (0, usage_1.initializeTransactionUsage)(effectiveUserId, effectiveTransactionId, 'chat', effectiveModel);
    }
    const formattedMessages = messages.map((msg) => ({
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
            await (0, usage_1.recordTransactionSubcall)(effectiveUserId, effectiveTransactionId, 'chat', usage.promptTokens, usage.completionTokens, usage.totalTokens, effectiveModel);
            if (saveHistory && sessionId) {
                await (0, usage_1.saveConversationHistory)(effectiveUserId, sessionId, messages.at(-1), // Assuming messages is not empty
                { role: 'model', parts: [{ text }] }, effectiveModel, effectiveTransactionId);
            }
        }
        return {
            content: text,
            model: effectiveModel,
            usage,
            transactionId: effectiveTransactionId,
        };
    }
    catch (err) {
        console.error('[generateGeminiResponse] Error:', err);
        // Re-throw the error to be handled by the caller, or handle it specifically if needed
        // For example, you could throw a more generic error or a custom error type
        throw new Error(`Failed to generate Gemini response: ${err.message}`);
    }
}
/**
 * Simple wrapper to ask Gemini and get a response.
 */
async function askGemini(messages, options) {
    return generateGeminiResponse({
        messages,
        ...(options || {}), // Spread options, ensuring it's an object if undefined
    });
}
/**
 * Starts a new emotional support session with Gemini.
 */
async function startGeminiEmotionalSupportSession({ userId, initialPrompt, sessionId: inputSessionId, // Renamed to avoid confusion if generating a new one
modelName, apiKey, transactionId: inputTransactionId, // Allow passing a transactionId
 }) {
    const messages = [
        {
            role: 'user',
            parts: [{ text: initialPrompt }],
        },
    ];
    // Ensure a session ID exists or generate one if critical for this function's logic
    const sessionId = inputSessionId || (0, uuid_1.v4)(); // Generate a session ID if not provided
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
//# sourceMappingURL=geminiFunctions.js.map