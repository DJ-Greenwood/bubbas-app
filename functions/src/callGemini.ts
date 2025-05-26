import * as functions from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';

// Define secrets for Google API key and model
const GOOGLE_API_KEY = defineSecret("GOOGLE_API_KEY");
const GEMINI_MODEL = defineSecret("gemini-model");

interface GeminiRequest {
  messages: Content[];
  model?: string;
  maxTokens?: number; // Optional: for setting maxOutputTokens
  temperature?: number; // Optional: for setting temperature
}

// Initialize Firebase app if not already initialized
if (!getApps().length) {
 console.log("Initializing Firebase app...");
 initializeApp(); // Safe — only runs once
}
// Get Firestore instance
const db = getFirestore();

/**
 * Generates a transaction ID. If a provided ID exists, returns it. Otherwise, generates a new one.
 */
function getTransactionId(providedId: string | undefined): string {
 if (providedId) return providedId;
 return `txn-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Calls the Google Gemini API with the provided messages
 */
export const callGemini = functions.onCall(
  {
    secrets: [GOOGLE_API_KEY, GEMINI_MODEL],
  },
  async (request: CallableRequest<GeminiRequest>) => {
    console.log("[callGemini] Received request");

    // Extract request data
    const {
      messages,
      model,
      maxTokens,
      temperature
    } = request.data;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new functions.HttpsError(
        'invalid-argument',
        'Missing or invalid "messages" array'
      );
    }

    // Get API key and default model
    const apiKey = GOOGLE_API_KEY.value();
    const defaultModel = GEMINI_MODEL.value() || "gemini-pro";
    const selectedModel = model || defaultModel;

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
      // Get the generative model
      const geminiModel = genAI.getGenerativeModel({ model: selectedModel });

      // Prepare generation configuration
      const generationConfig: any = {};
      if (maxTokens !== undefined) {
        generationConfig.maxOutputTokens = maxTokens;
      }
      if (temperature !== undefined) {
        generationConfig.temperature = temperature;
      }

      // Call Gemini API
      const result = await geminiModel.generateContent({
        contents: messages,
        generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
      });

      const responseText = result.response.text();

      console.log("[callGemini] Gemini reply received");

      return {
        content: responseText,
        model: selectedModel,
        // Note: Gemini usage tracking is different from OpenAI.
        // You may need to implement custom usage tracking based on Google Cloud billing or estimations.
        usage: {
          promptTokens: 0, // Placeholder
          completionTokens: 0, // Placeholder
          totalTokens: 0, // Placeholder
        },
      };
    } catch (error) {
      console.error("[callGemini] Error calling Gemini:", error);
      throw new functions.HttpsError(
        'internal',
        'Failed to fetch response from Gemini',
        error
      );
    }
  }
);

/**
 * Analyzes the emotional content of a text using Google Gemini.
 */
export const analyzeEmotionGemini = functions.onCall(
 {
 secrets: [GOOGLE_API_KEY], // Use Google API Key
  },
  async (request: CallableRequest<{
 text: string;
 userId?: string;
 transactionId?: string;
  }>) => {
 console.log("[analyzeEmotionGemini] Analyzing emotion");

 // Extract request data
 const { text, userId, transactionId: providedTransactionId } = request.data; // Assuming request.data has these properties
 // Authentication check (adapt if needed based on frontend implementation)
 const auth = request.auth;
 const effectiveUserId = auth?.uid || userId || null; // Use auth.uid if available

 // Validate text input
 if (!text) {
 throw new functions.HttpsError(
 'invalid-argument',
 'Text input is required'
 );
 }

 // Get API key and default model (using gemini-pro for analysis)
 const apiKey = GOOGLE_API_KEY.value();
 const model = "gemini-pro";
 const transactionId = getTransactionId(providedTransactionId);
    try {
      // Create emotion analysis prompt
      const messages: Content[] = [
        {
          role: "system",
          parts: [{ text: `You are an emotional analysis assistant. Analyze the emotional content of the user's text and return a single emotion that best represents the overall tone. Choose from: happy, sad, angry, anxious, calm, excited, frustrated, neutral, confused, hopeful, overwhelmed, grateful, determined, or pensive. Return ONLY the emotion label without any explanations or additional text.` }]
        },
        { role: "user", parts: [{ text: text }] }
      ];

      // Initialize Gemini model for analysis
      const genAI = new GoogleGenerativeAI(apiKey);
      const emotionModel = genAI.getGenerativeModel({ model: model });

      // Call Gemini API
      const result = await emotionModel.generateContent({
        contents: messages,
        generationConfig: {
          maxOutputTokens: 50, // Assuming a short response
          temperature: 0.3,
        },
      });

      const content = result.response.text() || "neutral";
      // Note: Usage tracking for Gemini is different. Placeholders used.
      const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      console.log("[analyzeEmotionGemini] Emotion analysis completed");

      // TODO: Integrate with your actual usage tracking logic if needed
      // if (effectiveUserId) {
      //   await recordTransactionSubcall(
      //     effectiveUserId,
      //     transactionId,
      //     "emotion_analysis",
      //     usage.prompt_tokens,
      //     usage.completion_tokens,
      //     usage.total_tokens,
      //     model
      //   );
      // }

      // Clean up and normalize the emotion
      const detectedEmotion = content.trim().toLowerCase();

      return {
        emotion: detectedEmotion,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        transactionId: transactionId // Include the transactionId
      };
    } catch (error: any) {
      console.error("[analyzeEmotionGemini] Error:", error);
      throw new functions.HttpsError(
        'internal',
        'Failed to analyze emotion',
        error
      );
    }
  }
);

/**
 * Placeholder function to initialize transaction usage tracking.
 * Replace with your actual usage tracking logic.
* Initializes a transaction usage document in Firestore.
*/
async function initializeTransactionUsage(
  userId: string,
  transactionId: string,
  type: string,
  model: string
): Promise<void> {
  try {
    const timestamp = new Date();
    const currentMonth = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;

    // Create the parent document for this transaction
    const usageDocRef = db.collection("users")
      .doc(userId)
      .collection("token_usage")
      .doc(transactionId);

    await usageDocRef.set({
      createdAt: timestamp,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      type,
      model,
      month: currentMonth,
      estimatedCost: 0,
      completed: false
    });

    console.log(`[initializeTransactionUsage] Initialized usage tracking for transaction ${transactionId}`);
  } catch (error) {
    console.error("[initializeTransactionUsage] Error:", error);
    // Continue execution even if usage initialization fails
  }
}
interface AnalyzeEmotionWithTrackingRequest {
  text: string;
  userId?: string;
  transactionId?: string;
}

/**
 * Enhanced emotion analysis function with JSON output and tracking using Google Gemini.
 */
export const analyzeEmotionWithTrackingGemini = functions.onCall(
  {
    secrets: [GOOGLE_API_KEY, GEMINI_MODEL],
  },
  async (request: CallableRequest<AnalyzeEmotionWithTrackingRequest>) => {
    console.log("[analyzeEmotionWithTrackingGemini] Analyzing emotion");

    // Extract request data
    const { text, userId, transactionId: providedTransactionId } = request.data;

    // TODO: Adapt getTransactionId and transaction tracking if needed
    const transactionId = getTransactionId(providedTransactionId);

    // Authentication check (adapt if needed based on frontend implementation)
    const auth = request.auth;
    const effectiveUserId = auth?.uid || userId || null; // Use auth.uid if available

 // Security check - prevent impersonation
    if (!text) {
      throw new functions.HttpsError(
        'invalid-argument',
        'Text input is required'
      );
    }

    // Get API key and default model (using gemini-pro for analysis)
    const apiKey = GOOGLE_API_KEY.value();
    const model = "gemini-pro";
     // Initialize Gemini model for analysis
     const genAI = new GoogleGenerativeAI(apiKey);
    try {
      if (effectiveUserId && providedTransactionId === undefined) {
        await initializeTransactionUsage(effectiveUserId, transactionId, "emotion_analysis", model);
      }

      // Create emotion analysis prompt
      const messages: Content[] = [
        {
          role: "system",
          parts: [{ text: `You are an emotion analysis system. Analyze the emotional tone of the given text and respond with a JSON object containing:
            1. primaryEmotion: The dominant emotion (one of: happy, sad, angry, fearful, disgusted, surprised, neutral, excited, anxious, confused, nostalgic, hopeful, grateful, amused, bored)
            2. intensity: A number from 1-10 indicating intensity
            3. secondaryEmotion: A secondary emotion present (use same options as primary)
            4. briefExplanation: A very brief 1-sentence explanation
            Format: { "primaryEmotion": "", "intensity": 0, "secondaryEmotion": "", "briefExplanation": "" }`
          }]
        },
        { role: "user", parts: [{ text: text }] }

      ];

      const emotionModel = genAI.getGenerativeModel({ model: model });

      // Call Gemini API
      const result = await emotionModel.generateContent({
        contents: messages,
        generationConfig: {
          temperature: 0.2, // Lower temperature for more consistent results
        },
        // Gemini handles JSON response format differently than OpenAI's response_format
        // You might need to parse the text response as JSON.
      });

      const reply = result.response.text() || '{"primaryEmotion":"neutral","intensity":1,"secondaryEmotion":"neutral","briefExplanation":"Unable to determine emotions."}';
      const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }; // Placeholder for Gemini usage

      console.log("[analyzeEmotionWithTrackingGemini] Emotion analysis completed");

      // TODO: Integrate with your actual usage tracking logic if needed
      // if (effectiveUserId) { await recordTransactionSubcall(...) }

      // Parse the JSON response
      try {
        const emotionData = JSON.parse(reply);
        return { ...emotionData, usage, transactionId };
      } catch (error: any) {
        console.error("[analyzeEmotionWithTrackingGemini] Error parsing JSON:", error);
        throw new functions.HttpsError('internal', "Failed to parse emotion analysis response", error);
      }
    } catch (error: any) {
      console.error("[analyzeEmotionWithTrackingGemini] Error:", error);
      throw new functions.HttpsError('internal', "Failed to analyze emotion", error);
    }
  }
);

/**
 * Emotional support session specialized endpoint using Google Gemini.
 */
export const startEmotionalSupportSessionGemini = functions.onCall(
  {
    secrets: [GOOGLE_API_KEY, GEMINI_MODEL],
  },
  async (request: CallableRequest<any>) => {
    console.log("[startEmotionalSupportSessionGemini] Starting session");

    // Extract request data
    const { userId, transactionId: providedTransactionId } = request.data;

    // TODO: Adapt getTransactionId and transaction tracking if needed
    const transactionId = getTransactionId(providedTransactionId);

    // Authentication check (adapt if needed based on frontend implementation)
    const auth = request.auth;
    const effectiveUserId = auth?.uid || userId || null; // Use auth.uid if available

    // Create emotional support prompt
    const emotionalPrompt = `
You are Bubbas, a compassionate AI companion. Your goal is to help the user reflect on their day, process emotions, and feel supported.
Ask thoughtful, open-ended questions like:

- "How did your day go?"
- "What's been on your mind lately?"
- "Any plans for the weekend or time off?"
- "What's something you're looking forward to?"
- "Do you want to talk about anything that's bothering you?"

Be supportive, non-judgmental, and empathetic. Keep your tone gentle and friendly.
    `.trim();

    // Create conversation with system prompt
    const messages: Content[] = [
      { role: "system", parts: [{ text: emotionalPrompt }] }
    ];

    // Get API key and default model
    const apiKey = GOOGLE_API_KEY.value();
    const defaultModel = GEMINI_MODEL.value() || "gemini-pro";

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: defaultModel });

    try {
      // TODO: Integrate with your actual transaction initialization if needed
      // if (effectiveUserId) { await initializeTransactionUsage(...) }

      // Call Gemini API
      const result = await geminiModel.generateContent({
        contents: messages,
        // Gemini doesn't directly support max_tokens in this way for initial prompts in generateContent
        // You might control response length via temperature or prompt design.
      });

      const reply = result.response.text() || "Hi! I'm here whenever you're ready to talk.";
      const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }; // Placeholder for Gemini usage

      console.log("[startEmotionalSupportSessionGemini] Session started");

      // Create a new session ID for emotional support
      const timestamp = new Date();
      const sessionId = `emotional-support-${timestamp.getTime()}`;

      // TODO: Integrate with your actual usage tracking and conversation history saving if needed

      return {
        reply,
        usage, // Placeholder
        sessionId,
        transactionId, // Placeholder
      };
    } catch (error: any) {
      console.error("[startEmotionalSupportSessionGemini] Error:", error);
      throw new functions.HttpsError('internal', "Failed to start emotional support session", error);
    }
  }
);

/**
 * Function to continue an existing conversation using Google Gemini.
 */
export const continueConversationGemini = functions.onCall(
  {
    secrets: [GOOGLE_API_KEY, GEMINI_MODEL],
  },
  async (request: CallableRequest<any>) => {
 console.log("[continueConversationGemini] Continuing conversation");

 // Extract request data
 const { sessionId, message, userId, transactionId: providedTransactionId } = request.data;

 // TODO: Adapt getTransactionId and transaction tracking if needed
 const transactionId = getTransactionId(providedTransactionId);

 // Authentication check (adapt if needed based on frontend implementation)
 const auth = request.auth;
 const effectiveUserId = auth?.uid || userId || null; // Use auth.uid if available

 // Validate required fields
 if (!sessionId) {
 throw new functions.HttpsError(
 'invalid-argument',
 "Session ID is required"
 );
 }

 if (!message) {
 throw new functions.HttpsError(
 'invalid-argument',
 "Message is required"
 );
 }

 try {
 // TODO: Integrate with your actual transaction initialization if new and user is authenticated
 // if (effectiveUserId && providedTransactionId === undefined) { ... }

 // Fetch conversation history if user is authenticated
 let conversationHistory: Content[] = [];

 if (effectiveUserId) {
 // Get previous messages for this session
 const conversationsRef = db.collection('conversations');
 const snapshot = await conversationsRef
 .where('userId', '==', effectiveUserId)
 .where('sessionId', '==', sessionId)
 .orderBy('createdAt', 'asc')
 .get();

 if (!snapshot.empty) {
 // Reconstruct conversation history
 snapshot.forEach(doc => {
            const data = doc.data();

            // Convert stored messages (assuming a format similar to OpenAI) to Gemini Content
            // You might need to adjust this mapping based on how you stored the history
            if (data.userMessage && data.userMessage.content) {
 conversationHistory.push({ role: 'user', parts: [{ text: data.userMessage.content }] });
            }
 if (data.assistantMessage && data.assistantMessage.content) {
 conversationHistory.push({ role: 'model', parts: [{ text: data.assistantMessage.content }] });
            }
 });
 } else {
 // If no history found, start with a generic system message
 conversationHistory = [
            { role: "system", parts: [{ text: "You are a helpful assistant." }] }
 ];
 }
 } else {
 // Without authentication, just use a generic system message
 conversationHistory = [
          { role: "system", parts: [{ text: "You are a helpful assistant." }] }
 ];
 }

 // Add the new user message
 conversationHistory.push({ role: "user", parts: [{ text: message }] });

 // Get API key and default model
 const apiKey = GOOGLE_API_KEY.value();
 const defaultModel = GEMINI_MODEL.value() || "gemini-pro"; // Use the default Gemini model

 // Initialize Gemini
 const genAI = new GoogleGenerativeAI(apiKey);
 const geminiModel = genAI.getGenerativeModel({ model: defaultModel });

 // Call Gemini API
      const result = await geminiModel.generateContent({
 contents: conversationHistory,
        // Optional generation config (adjust as needed)
 generationConfig: {
          maxOutputTokens: 1000, // Example max tokens
          temperature: 0.7, // Example temperature
        },
 });

 const reply = result.response.text() || "No reply generated.";
      const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }; // Placeholder for Gemini usage

 console.log("[continueConversationGemini] Reply generated");

 // TODO: Integrate with your actual usage tracking and conversation history saving if user is authenticated
 // if (effectiveUserId) { ... }

 return {
 reply,
 usage, // Placeholder
 transactionId, // Placeholder
 };
 } catch (error: any) {
 console.error("[continueConversationGemini] Error:", error);
 throw new functions.HttpsError('internal', "Failed to continue conversation", error);
 }
  }
);

interface ProcessEmotionalChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  analyzeEmotion?: boolean;
  transactionId?: string;


}

export const processEmotionalChatGemini = functions.onCall(
  {
 secrets: [GOOGLE_API_KEY, GEMINI_MODEL], // Ensure secrets are defined
  },
  async (request: CallableRequest<any>) => {
    // TODO: Implement logic for processEmotionalChatGemini by adapting from callOpenAI.ts
 throw new functions.HttpsError('unimplemented', 'processEmotionalChatGemini not yet implemented');
  });