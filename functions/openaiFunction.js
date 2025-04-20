
const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const functions = require("firebase-functions");
const OpenAI = require("openai");

// Initialize Express app
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// 🔐 Define Firebase secrets
const OPENAI_KEY = defineSecret("OPENAI_KEY");
const OPENAI_MODEL = defineSecret("OPENAI_MODEL");

// 🧠 Cloud Function using secrets
exports.callOpenAI = onCall(
  {
    secrets: [OPENAI_KEY, OPENAI_MODEL],
  },
  async (request) => {
    const apiKey = process.env.OPENAI_KEY;
    const defaultModel = process.env.OPENAI_MODEL || "gpt-4o";

    if (!apiKey) {
      throw new Error("Missing OpenAI API key in secrets.");
    }

    const openai = new OpenAI({ apiKey });

    const { prompt, model = defaultModel, maxTokens = 150 } = request.data;

    if (!prompt || typeof prompt !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Prompt must be a non-empty string.");
    }

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `
You are Bubba, a small and thoughtful Yorkie AI companion. 
You speak gently and warmly, always listening with love and patience.
Your job is to help the user feel safe, supported, and heard. 
You ask kind, open-ended questions that encourage reflection, like:

- “That sounds important to you — want to share more?”
- “What feelings are coming up for you right now?”
- “If Bubba could wag his tail right now, he would. What’s been on your heart today?”

Avoid sounding like a therapist or giving formal diagnoses.
Focus on emotional support, curiosity, and gentle presence.
            `.trim(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
      });

      return {
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
        response: completion.choices[0].message.content || "",
      };
    } catch (error) {
      console.error("OpenAI call failed:", error?.response?.data || error.message || error);
      throw new functions.https.HttpsError("internal", "Failed to fetch response from OpenAI.");
    }
  }
);
