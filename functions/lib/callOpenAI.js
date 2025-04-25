"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOpenAI = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const openai_1 = __importDefault(require("openai"));
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    console.log("Initializing Firebase app...");
    (0, app_1.initializeApp)(); // ✅ Safe — will only run once
}
const db = (0, firestore_1.getFirestore)();
const OPENAI_API_KEY = (0, params_1.defineSecret)("openai-key");
const OPENAI_MODEL = (0, params_1.defineSecret)("openai-model");
exports.callOpenAI = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
    console.log("Received request:", request);
    // Access secrets dynamically at runtime
    const apiKey = OPENAI_API_KEY.value();
    const model = OPENAI_MODEL.value() || "gpt-4o";
    // Add a safeguard to ensure the prompt is not empty
    if (!request.data.prompt || typeof request.data.prompt !== 'string' || !request.data.prompt.trim()) {
        throw new Error("Prompt must be a non-empty string.");
    }
    const prompt = request.data.prompt;
    console.log("Using prompt:", prompt);
    const openai = new openai_1.default({
        apiKey,
    });
    console.log("Using OpenAI model:", model);
    try {
        const completion = await openai.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
        });
        console.log("OpenAI response:", completion);
        return {
            response: completion.choices[0].message.content,
        };
    }
    catch (error) {
        console.error("Error calling OpenAI API:", error);
        throw new Error("Failed to fetch response from OpenAI.");
    }
});
//# sourceMappingURL=callOpenAI.js.map