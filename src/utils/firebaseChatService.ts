import { getFunctions, httpsCallable } from "firebase/functions";

// 🔐 Firebase Callable Function
const functions = getFunctions();
const callOpenAI = httpsCallable(functions, "callOpenAI");

let conversationHistory: { role: string; content: string }[] = [];

const openai_model = process.env.NEXT_OPENAI_MODEL || "gpt-4o"; // fallback model

// 🔄 Reset the conversation history with a system prompt
const resetConversation = (systemPrompt: string) => {
  console.log("[resetConversation] Resetting conversation with system prompt:", systemPrompt);
  conversationHistory = [{ role: "system", content: systemPrompt }];
};

// 💬 Continue conversation with context via Firebase Function
const askQuestion = async (question: string): Promise<string> => {
  console.log("[askQuestion] Received question:", question);
  conversationHistory.push({ role: "user", content: question });

  try {
    console.log("[askQuestion] Sending request to Firebase Callable Function with conversation history:", conversationHistory);
    const response = await callOpenAI({
      messages: conversationHistory,
      model: openai_model,
      maxTokens: 1000,
    });

    const assistantReply = (response.data as { reply: string })?.reply || "No response generated";
    console.log("[askQuestion] Received response from Firebase Callable Function:", assistantReply);

    conversationHistory.push({ role: "assistant", content: assistantReply });
    return assistantReply;
  } catch (error) {
    console.error("[askQuestion] Error while calling Firebase Callable Function:", error);
    throw error;
  }
};

// ✨ One-off message via Firebase Function
const generateResponse = async (prompt: string): Promise<string> => {
  console.log("[generateResponse] Received prompt:", prompt);

  try {
    console.log("[generateResponse] Sending request to Firebase Callable Function with prompt:", prompt);
    const response = await callOpenAI({
      messages: [{ role: "user", content: prompt }],
      model: openai_model,
      maxTokens: 1000,
    });

    const data = response.data as { reply: string };
    console.log("[generateResponse] Received response from Firebase Callable Function:", data.reply);

    return data.reply || "No response generated";
  } catch (error) {
    console.error("[generateResponse] Error while calling Firebase Callable Function:", error);
    throw error;
  }
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

  console.log("[startEmotionalSupportSession] Starting emotional support session with prompt:", emotionalPrompt);
  resetConversation(emotionalPrompt);
};

const firebaseChatService = {
  resetConversation,
  askQuestion,
  generateResponse,
  startEmotionalSupportSession,
};

export default firebaseChatService;
