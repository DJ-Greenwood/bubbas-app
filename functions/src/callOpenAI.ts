import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { CallableRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat";

// Initialize Firebase app if not already initialized
if (!getApps().length) {
  console.log("Initializing Firebase app...");
  initializeApp(); // Safe — only runs once
}

// Define secrets for OpenAI API key and model
const OPENAI_API_KEY = defineSecret("openai-key");
const OPENAI_MODEL = defineSecret("openai-model");

// Request shape expected from frontend
interface OpenAIRequest {
  messages: { role: string; content: string }[];
  model?: string;
  maxTokens?: number;
 
}

// Firebase Callable Function definition
export const callOpenAI = onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<OpenAIRequest>) => {
    console.log("[callOpenAI] Received request data:", request.data);

    const { messages, model, maxTokens } = request.data;
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = OPENAI_MODEL.value() || "gpt-4o";

    // ✅ Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Missing or invalid 'messages' array.");
    }

    // ✅ Type assertion to match OpenAI expectations
    const typedMessages = messages as ChatCompletionMessageParam[];

    // Create OpenAI instance
    const openai = new OpenAI({ apiKey });

    try {
      const completion = await openai.chat.completions.create({
        model: model || defaultModel,
        messages: typedMessages,
        max_tokens: maxTokens || 500,
      });

      const reply = completion.choices?.[0]?.message?.content || "No reply generated.";
      console.log("[callOpenAI] OpenAI reply:", reply);

      return { reply };
    } catch (error) {
      console.error("[callOpenAI] Error calling OpenAI:", error);
      throw new Error("Failed to fetch response from OpenAI.");
    }
  }
);
