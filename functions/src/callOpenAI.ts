import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { CallableRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  console.log("Initializing Firebase app...");
  initializeApp(); // ✅ Safe — will only run once
}
const db = getFirestore();

const OPENAI_API_KEY = defineSecret("openai-key");
console.log("OpenAI API Key:", OPENAI_API_KEY.value()); // Log the key for debugging (remove in production)
const OPENAI_MODEL = defineSecret("openai-model");
console.log("OpenAI Model:", OPENAI_MODEL.value()); // Log the model for debugging (remove in production)

interface PromptRequest {
  prompt: string;
}

export const callOpenAI = onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<PromptRequest>) => {
    console.log("Received request:", request);

    const prompt = request.data.prompt;

    if (!prompt || typeof prompt !== "string") {
      console.error("Invalid prompt:", prompt);
      throw new Error("Prompt must be a non-empty string.");
    }

    console.log("Using prompt:", prompt);

    const openai = new OpenAI({
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
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      throw new Error("Failed to fetch response from OpenAI.");
    }
  }
);
