import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: Use backend proxy in production
});



const openai_model = process.env.NEXT_OPENAI_MODEL || "o3-mini-2025-01-31";
console.log("Using OpenAI model:", openai_model);
let conversationHistory = [];

// 🔄 Reset the conversation history with a system prompt
const resetConversation = (systemPrompt) => {
  conversationHistory = [{ role: "system", content: systemPrompt }];
};

// 💬 Continue conversation with context
const askQuestion = async (question) => {
  conversationHistory.push({ role: "user", content: question });

  const response = await openai.chat.completions.create({
    model: openai_model,
    messages: conversationHistory,
    max_completion_tokens: 1000,
  });

  const assistantReply = response.choices?.[0]?.message?.content || "No response generated";
  conversationHistory.push({ role: "assistant", content: assistantReply });

  return assistantReply;
};

// ✨ One-off message without history
const generateResponse = async (prompt) => {
  const response = await openai.chat.completions.create({
    model: openai_model,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 1000,
  });

  return response.choices?.[0]?.message?.content || "No response generated";
};

// 🧸 Start emotional support session with a custom system prompt
const startEmotionalSupportSession = () => {
  const emotionalPrompt = `
You are Bubbas, a compassionate AI companion. Your goal is to help the user reflect on their day, process emotions, and feel supported.
Ask thoughtful, open-ended questions like:

- "How did your day go?"
- "What’s been on your mind lately?"
- "Any plans for the weekend or time off?"
- "What’s something you’re looking forward to?"
- "Do you want to talk about anything that’s bothering you?"

Be supportive, non-judgmental, and empathetic. Keep your tone gentle and friendly.
  `.trim();

  resetConversation(emotionalPrompt);
};

// 📦 Chat service object
const chatService = {
  resetConversation,
  askQuestion,
  generateResponse,
  startEmotionalSupportSession,
};

export default chatService;
