import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);

interface GeminiMessage {
  role: string;
  parts: { text: string }[];
}

interface GeminiResponse {
  reply: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const callGeminiFunction = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context || !context.auth) { // Add this check
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Now you can safely access data.messages
  const messages = data.messages;

  if (!messages || !Array.isArray(messages)) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a list of messages.');
  }

  functions.logger.info('Calling Gemini API with messages:', messages);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Convert messages to the format expected by the Gemini SDK
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(part => ({ text: part.text }))
    }));

    const result = await model.generateContent({ contents: formattedMessages });
    const response = result.response;
    const text = response.text();

    functions.logger.info('Gemini API response received.', { response });

    // The Gemini SDK provides token counts in the response metadata
    const tokenUsage = result.response.usageMetadata;
    const usage = {
 promptTokens: tokenUsage?.promptTokenCount || 0,
 completionTokens: tokenUsage?.candidatesTokenCount || 0,
 totalTokens: tokenUsage?.totalTokenCount || 0,
    };
    return {
      reply: text,
      usage: usage,
    };

  } catch (error) {
    functions.logger.error('Error calling Gemini API:', error);
    throw new functions.https.HttpsError('internal', 'Failed to call Gemini API.', error);
  }
});