"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOpenAI = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const openai_1 = __importDefault(require("openai"));
// Initialize Firebase app if not already initialized
if (!(0, app_1.getApps)().length) {
    console.log("Initializing Firebase app...");
    (0, app_1.initializeApp)(); // Safe — only runs once
}
// Define secrets for OpenAI API key and model
const OPENAI_API_KEY = (0, params_1.defineSecret)("openai-key");
const OPENAI_MODEL = (0, params_1.defineSecret)("openai-model");
// Firebase Callable Function definition
exports.callOpenAI = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
    console.log("[callOpenAI] Received request data:", request.data);
    const { messages, model, maxTokens } = request.data;
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
    // ✅ Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error("Missing or invalid 'messages' array.");
    }
    // ✅ Type assertion to match OpenAI expectations
    const typedMessages = messages;
    // Create OpenAI instance
    const openai = new openai_1.default({ apiKey });
    try {
        const completion = await openai.chat.completions.create({
            model: model || defaultModel,
            messages: typedMessages,
            max_tokens: maxTokens || 1000,
        });
        const reply = completion.choices?.[0]?.message?.content || "No reply generated.";
        const usage = completion.usage;
        console.log("[callOpenAI] OpenAI reply:", reply);
        console.log("[callOpenAI] OpenAI usage:", usage);
        return {
            reply,
            usage: {
                promptTokens: usage?.prompt_tokens || 0,
                completionTokens: usage?.completion_tokens || 0,
                totalTokens: usage?.total_tokens || 0,
            }
        };
    }
    catch (error) {
        console.error("[callOpenAI] Error calling OpenAI:", error);
        throw new Error("Failed to fetch response from OpenAI.");
    }
});
//# sourceMappingURL=callOpenAI.js.map