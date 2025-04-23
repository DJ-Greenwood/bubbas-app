// ✅ Modern import-based Firebase v2 Function with Secrets
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";

// ✅ Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// 🔐 Define Firebase secrets (must be set via CLI)
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const OPENAI_MODEL = defineSecret("OPENAI_MODEL"); // Optional fallback

export const callOpenAI = onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request) => {
    const prompt = request.data.prompt;

    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt must be a non-empty string.");
    }

    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY.value(), // 🔐 Access the key
    });

    const model = OPENAI_MODEL.value() || "gpt-4o"; // 🔐 Fallback if unset

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });

    return { response: completion.choices[0].message.content };
  }
);
