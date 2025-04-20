// src/utils/openai.ts

import OpenAI from "openai";

const OpenaAI_api_Key  = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
if (!OpenAI) {
  throw new Error("Missing OpenAI API key in environment variables.");
}
const client = new OpenAI({
  apiKey: OpenaAI_api_Key, dangerouslyAllowBrowser: true  // Make sure to set this in .env
});

// Optional: Set this in your .env file as OPENAI_MODEL=gpt-4o
const DEFAULT_MODEL = process.env.NEXT_OPENAI_MODEL || "gpt-4o";

export interface OpenAIResponse {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  response: string;
}

export async function callOpenAI(
  prompt: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 150
): Promise<OpenAIResponse> {
  try {
    const completion = await client.chat.completions.create({
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
      `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      
      max_tokens: maxTokens,
    });

    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = completion.usage?.total_tokens || 0;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      response: completion.choices[0].message.content || "",
    };
  } catch (error: any) {
    console.error("OpenAI API error:", error?.response?.data || error.message || error);
    throw new Error("Failed to fetch response from OpenAI.");
  }
}
