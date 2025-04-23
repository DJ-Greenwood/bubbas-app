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
console.log("OpenAI API Key:", OPENAI_API_KEY.value()); // Log the key for debugging (remove in production)
const OPENAI_MODEL = (0, params_1.defineSecret)("openai-model");
console.log("OpenAI Model:", OPENAI_MODEL.value()); // Log the model for debugging (remove in production)
exports.callOpenAI = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
    console.log("Received request:", request);
    const prompt = request.data.prompt;
    if (!prompt || typeof prompt !== "string") {
        console.error("Invalid prompt:", prompt);
        throw new Error("Prompt must be a non-empty string.");
    }
    console.log("Using prompt:", prompt);
    const openai = new openai_1.default({
        apiKey: OPENAI_API_KEY.value(),
    });
    const model = OPENAI_MODEL.value() || "gpt-4o";
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