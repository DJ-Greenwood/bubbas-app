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
const OPENAI_MODEL = defineSecret("openai-model");

interface PromptRequest {
  prompt: string;
}

export const callOpenAI = onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<PromptRequest>) => {
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

    const openai = new OpenAI({
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
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      throw new Error("Failed to fetch response from OpenAI.");
    }
  }
);
