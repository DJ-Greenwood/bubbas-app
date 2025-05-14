// src/callOpenAI.ts
import * as functions from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase app if not already initialized
if (!getApps().length) {
  console.log("Initializing Firebase app...");
  initializeApp(); // Safe — only runs once
}

// Get Firestore instance
const db = getFirestore();

// Define secrets for OpenAI API key and model
const OPENAI_API_KEY = defineSecret("openai-key");
const OPENAI_MODEL = defineSecret("openai-model");

// Request shapes expected from frontend
interface OpenAIRequest {
  messages: { role: string; content: string }[];
  model?: string;
  maxTokens?: number;
  userId?: string; // To track usage by user
  saveHistory?: boolean; // Flag to determine if we should save conversation history
  sessionId?: string; // For tracking continuous conversations
  transactionId?: string; // For grouping API calls in a single interaction
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: any;
}

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface OpenAIResponse {
  content: string;
  model: string;
  usage: OpenAIUsage;
}

// Helper function to generate or validate transaction ID
function getTransactionId(providedId?: string): string {
  return providedId || uuidv4();
}

/**
 * Calls the OpenAI API with the provided messages
 */
export const callOpenAI = functions.onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<OpenAIRequest>) => {
    console.log("[callOpenAI] Received request");

    // Extract request data with defaults
    const { 
      messages, 
      model, 
      maxTokens = 1000, 
      userId, 
      saveHistory = false,
      sessionId,
      transactionId: providedTransactionId
    } = request.data;
    
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    console.log(`[callOpenAI] Using transaction ID: ${transactionId}`);
    
    // Get authentication context
    const auth = request.auth;
    if (!auth && userId) {
      // Only authenticated users can specify a userId
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required to specify userId'
      );
    }
    
    // Allow authenticated users or requests without userId
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError(
        'permission-denied',
        'UserId mismatch with authenticated user'
      );
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new functions.HttpsError(
        'invalid-argument',
        'Missing or invalid "messages" array'
      );
    }

    // Type assertion to match OpenAI expectations
    const typedMessages = messages as ChatCompletionMessageParam[];

    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
    const selectedModel = model || defaultModel;

    // Create OpenAI instance
    const openai = new OpenAI({ apiKey });

    try {
      // If we have a user ID, initialize the transaction usage tracker
      if (effectiveUserId) {
        await initializeTransactionUsage(
          effectiveUserId,
          transactionId,
          "openai_chat",
          selectedModel
        );
      }

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: typedMessages,
        max_tokens: maxTokens,
        user: effectiveUserId || undefined, // Pass user ID for OpenAI's usage tracking
      });

      const content = completion.choices?.[0]?.message?.content || "No reply generated.";
      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      console.log("[callOpenAI] OpenAI reply received");

      // Save token usage if userId is provided
      if (effectiveUserId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          "primary_call",
          usage.prompt_tokens,
          usage.completion_tokens,
          usage.total_tokens,
          selectedModel
        );
      }
      
      // Save conversation history if requested and userId is available
      if (saveHistory && effectiveUserId && sessionId) {
        await saveConversationHistory(
          effectiveUserId,
          sessionId,
          typedMessages[typedMessages.length - 1],
          { role: "assistant", content: content },
          selectedModel,
          transactionId
        );
      }

      return {
        content,
        model: selectedModel,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        transactionId
      };
    } catch (error) {
      console.error("[callOpenAI] Error calling OpenAI:", error);
      throw new functions.HttpsError(
        'internal',
        'Failed to fetch response from OpenAI'
      );
    }
  }
);

/**
 * Cloud Function to analyze the emotional content of a text
 */
export const analyzeEmotion = functions.onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<{
    text: string;
    userId?: string;
    transactionId?: string;
  }>) => {
    console.log("[analyzeEmotion] Analyzing emotion");
    
    // Extract request data
    const { text, userId, transactionId: providedTransactionId } = request.data;
    
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required to specify userId'
      );
    }
    
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError(
        'permission-denied',
        'UserId mismatch with authenticated user'
      );
    }
    
    // Validate text input
    if (!text) {
      throw new functions.HttpsError(
        'invalid-argument',
        'Text input is required'
      );
    }
    
    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = "gpt-3.5-turbo"; // Use cheaper model for emotion analysis
    
    // Create OpenAI instance
    const openai = new OpenAI({ apiKey });
    
    try {
      // Initialize transaction if user is authenticated
      if (effectiveUserId && providedTransactionId === undefined) {
        await initializeTransactionUsage(
          effectiveUserId,
          transactionId,
          "emotion_analysis",
          defaultModel
        );
      }
      
      // Create emotion analysis prompt
      const messages: ChatCompletionMessageParam[] = [
        { 
          role: "system", 
          content: `You are an emotional analysis assistant. Analyze the emotional content of the user's text and return a single emotion that best represents the overall tone. Choose from: happy, sad, angry, anxious, calm, excited, frustrated, neutral, confused, hopeful, overwhelmed, grateful, determined, or pensive. Return ONLY the emotion label without any explanations or additional text.`
        },
        { role: "user", content: text }
      ];
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: defaultModel,
        messages,
        max_tokens: 50,
        temperature: 0.3,
        user: effectiveUserId || undefined,
      });
      
      const content = completion.choices?.[0]?.message?.content || "neutral";
      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      console.log("[analyzeEmotion] Emotion analysis completed");
      
      // Record the subcall if userId is provided
      if (effectiveUserId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          "emotion_analysis",
          usage.prompt_tokens,
          usage.completion_tokens,
          usage.total_tokens,
          defaultModel
        );
      }
      
      // Clean up and normalize the emotion
      const detectedEmotion = content.trim().toLowerCase();
      
      return { emotion: detectedEmotion };
    } catch (error) {
      console.error("[analyzeEmotion] Error:", error);
      throw new functions.HttpsError(
        'internal',
        'Failed to analyze emotion'
      );
    }
  }
);

/**
 * Enhanced emotion analysis function with JSON output
 */
export const analyzeEmotionWithTracking = functions.onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<{
    text: string;
    userId?: string;
    transactionId?: string;
  }>) => {
    console.log("[analyzeEmotionWithTracking] Analyzing emotion");
    
    // Extract request data
    const { text, userId, transactionId: providedTransactionId } = request.data;
    
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required to specify userId'
      );
    }
    
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError(
        'permission-denied',
        'UserId mismatch with authenticated user'
      );
    }
    
    // Validate text input
    if (!text) {
      throw new functions.HttpsError(
        'invalid-argument',
        'Text input is required'
      );
    }
    
    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = "gpt-3.5-turbo"; // Use cheaper model for emotion analysis
    
    // Create OpenAI instance
    const openai = new OpenAI({ apiKey });
    
    try {
      // Initialize transaction if first call in chain and user is authenticated
      if (effectiveUserId && providedTransactionId === undefined) {
        await initializeTransactionUsage(
          effectiveUserId,
          transactionId,
          "emotion_analysis",
          defaultModel
        );
      }
      
      // Create emotion analysis prompt
      const messages: ChatCompletionMessageParam[] = [
        { 
          role: "system", 
          content: `You are an emotion analysis system. Analyze the emotional tone of the given text and respond with a JSON object containing:
            1. primaryEmotion: The dominant emotion (one of: happy, sad, angry, fearful, disgusted, surprised, neutral, excited, anxious, confused, nostalgic, hopeful, grateful, amused, bored)
            2. intensity: A number from 1-10 indicating intensity
            3. secondaryEmotion: A secondary emotion present (use same options as primary)
            4. briefExplanation: A very brief 1-sentence explanation
            Format: { "primaryEmotion": "", "intensity": 0, "secondaryEmotion": "", "briefExplanation": "" }`
        },
        { role: "user", content: text }
      ];
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: defaultModel,
        messages,
        max_tokens: 200,
        temperature: 0.2, // Lower temperature for more consistent results
        response_format: { type: "json_object" },
        user: effectiveUserId || undefined,
      });
      
      const reply = completion.choices?.[0]?.message?.content || '{"primaryEmotion":"neutral","intensity":1,"secondaryEmotion":"neutral","briefExplanation":"Unable to determine emotions."}';
      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      console.log("[analyzeEmotionWithTracking] Emotion analysis completed");
      
      // Record the subcall if userId is provided
      if (effectiveUserId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          "emotion_analysis",
          usage.prompt_tokens,
          usage.completion_tokens,
          usage.total_tokens,
          defaultModel
        );
      }
      
      // Parse the JSON response
      try {
        const emotionData = JSON.parse(reply);
        return {
          ...emotionData,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
          },
          transactionId
        };
      } catch (error) {
        console.error("[analyzeEmotionWithTracking] Error parsing JSON:", error);
        throw new functions.HttpsError(
          'internal',
          "Failed to parse emotion analysis response"
        );
      }
    } catch (error) {
      console.error("[analyzeEmotionWithTracking] Error:", error);
      throw new functions.HttpsError(
        'internal',
        "Failed to analyze emotion"
      );
    }
  }
);

/**
 * Emotional support session specialized endpoint
 */
export const startEmotionalSupportSession = functions.onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<{ userId?: string; transactionId?: string }>) => {
    console.log("[startEmotionalSupportSession] Starting session");
    
    // Extract request data
    const { userId, transactionId: providedTransactionId } = request.data;
    
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    console.log(`[startEmotionalSupportSession] Using transaction ID: ${transactionId}`);
    
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
      throw new functions.HttpsError(
        'unauthenticated',
        "Authentication required to specify userId"
      );
    }
    
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError(
        'permission-denied',
        "UserId mismatch with authenticated user"
      );
    }
    
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
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: emotionalPrompt }
    ];
    
    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
    
    // Create OpenAI instance
    const openai = new OpenAI({ apiKey });
    
    try {
      // Initialize transaction if user is authenticated
      if (effectiveUserId) {
        await initializeTransactionUsage(
          effectiveUserId,
          transactionId,
          "emotional_support",
          defaultModel
        );
      }
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: defaultModel,
        messages,
        max_tokens: 1000,
        user: effectiveUserId || undefined,
      });
      
      const reply = completion.choices?.[0]?.message?.content || "Hi! I'm here whenever you're ready to talk.";
      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      console.log("[startEmotionalSupportSession] Session started");
      
      // Create a new session ID for emotional support
      const timestamp = new Date();
      const sessionId = `emotional-support-${timestamp.getTime()}`;
      
      // Save token usage and record the subcall if userId is provided
      if (effectiveUserId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          "start_session",
          usage.prompt_tokens,
          usage.completion_tokens,
          usage.total_tokens,
          defaultModel
        );
        
        // Save this as the first message in a new conversation
        await saveConversationHistory(
          effectiveUserId,
          sessionId,
          { role: "system", content: emotionalPrompt },
          { role: "assistant", content: reply },
          defaultModel,
          transactionId
        );
      }
      
      // Simplified emotion detection - would normally use a more sophisticated system
      let emotion = "neutral";
      if (reply.toLowerCase().includes("sorry") || reply.toLowerCase().includes("understand your frustration")) {
        emotion = "empathetic";
      } else if (reply.toLowerCase().includes("great") || reply.toLowerCase().includes("wonderful")) {
        emotion = "happy";
      } else if (reply.toLowerCase().includes("hmm") || reply.toLowerCase().includes("interesting")) {
        emotion = "curious";
      }
      
      return {
        reply,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        emotion,
        sessionId,
        transactionId
      };
    } catch (error) {
      console.error("[startEmotionalSupportSession] Error:", error);
      throw new functions.HttpsError(
        'internal',
        "Failed to start emotional support session"
      );
    }
  }
);

/**
 * Function to continue an existing conversation
 */
export const continueConversation = functions.onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<{
    sessionId: string;
    message: string;
    userId?: string;
    transactionId?: string;
  }>) => {
    console.log("[continueConversation] Continuing conversation");
    
    // Extract request data
    const { sessionId, message, userId, transactionId: providedTransactionId } = request.data;
    
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
      throw new functions.HttpsError(
        'unauthenticated',
        "Authentication required to specify userId"
      );
    }
    
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError(
        'permission-denied',
        "UserId mismatch with authenticated user"
      );
    }
    
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
      // Initialize transaction if new and user is authenticated
      if (effectiveUserId && providedTransactionId === undefined) {
        // Determine session type based on session ID format
        const sessionType = sessionId.startsWith('emotional-support') ? 'emotional_support' : 'conversation';
        await initializeTransactionUsage(
          effectiveUserId,
          transactionId,
          sessionType,
          OPENAI_MODEL.value() || "gpt-4o"
        );
      }
      
      // Fetch conversation history if user is authenticated
      let conversationHistory: ChatCompletionMessageParam[] = [];
      
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
            
            // Add system message only once at the beginning
            if (data.userMessage.role === 'system' && conversationHistory.length === 0) {
              conversationHistory.push(data.userMessage);
            }
            // Add user and assistant messages
            else if (data.userMessage.role !== 'system') {
              conversationHistory.push(data.userMessage);
            }
            
            conversationHistory.push(data.assistantMessage);
          });
        } else {
          // If no history found, start with a generic system message
          conversationHistory = [
            { role: "system", content: "You are a helpful assistant." }
          ];
        }
      } else {
        // Without authentication, just use a generic system message
        conversationHistory = [
          { role: "system", content: "You are a helpful assistant." }
        ];
      }
      
      // Add the new user message
      conversationHistory.push({ role: "user", content: message });
      
      // Get API key and default model
      const apiKey = OPENAI_API_KEY.value();
      const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
      
      // Create OpenAI instance
      const openai = new OpenAI({ apiKey });
      
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: defaultModel,
        messages: conversationHistory,
        max_tokens: 1000,
        user: effectiveUserId || undefined,
      });
      
      const reply = completion.choices?.[0]?.message?.content || "No reply generated.";
      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      console.log("[continueConversation] Reply generated");
      
      // Source should match the session type
      const source = sessionId.startsWith('emotional-support') ? 'emotional_support' : 'conversation';
      
      // Record the transaction subcall if user is authenticated
      if (effectiveUserId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          "continue_conversation",
          usage.prompt_tokens,
          usage.completion_tokens,
          usage.total_tokens,
          defaultModel
        );
        
        await saveConversationHistory(
          effectiveUserId,
          sessionId,
          { role: "user", content: message },
          { role: "assistant", content: reply },
          defaultModel,
          transactionId
        );
        
        // Mark the transaction as completed
        const usageDocRef = db.collection("users")
          .doc(effectiveUserId)
          .collection("token_usage")
          .doc(transactionId);
        
        await usageDocRef.update({
          completed: true,
          completedAt: new Date()
        });
      }
      
      return {
        reply,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        transactionId
      };
    } catch (error) {
      console.error("[continueConversation] Error:", error);
      throw new functions.HttpsError(
        'internal',
        "Failed to continue conversation"
      );
    }
  }
);

/**
 * Function to handle multi-step AI processes with transaction tracking
 */
export const processEmotionalChat = functions.onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<{
    message: string;
    sessionId?: string;
    userId?: string;
    analyzeEmotion?: boolean;
    transactionId?: string;
  }>) => {
    console.log("[processEmotionalChat] Processing emotional chat");
    
    // Extract request data
    const { 
      message, 
      sessionId: existingSessionId, 
      userId, 
      analyzeEmotion = true,
      transactionId: providedTransactionId 
    } = request.data;
    
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
      throw new functions.HttpsError(
        'unauthenticated',
        "Authentication required to specify userId"
      );
    }
    
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
      throw new functions.HttpsError(
        'permission-denied',
        "UserId mismatch with authenticated user"
      );
    }
    
    // Validate message
    if (!message) {
      throw new functions.HttpsError(
        'invalid-argument',
        "Message is required"
      );
    }
    
    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
    const emotionModel = "gpt-3.5-turbo"; // Use cheaper model for emotion analysis
    
    // Create OpenAI instance
    const openai = new OpenAI({ apiKey });
    
    try {
      // Initialize transaction if user is authenticated
      if (effectiveUserId) {
        await initializeTransactionUsage(
          effectiveUserId,
          transactionId,
          "emotional_chat",
          defaultModel
        );
      }
      
      // Create or continue session
      let sessionId = existingSessionId;
      let conversationHistory: ChatCompletionMessageParam[] = [];
      
      if (!sessionId && effectiveUserId) {
        // Create new session
        const timestamp = new Date();
        sessionId = `emotional-support-${timestamp.getTime()}`;
        
        // Create system prompt for emotional support
        const emotionalPrompt = `
You are Bubbas, a compassionate AI companion. Your goal is to help the user reflect on their day, process emotions, and feel supported.
Be supportive, non-judgmental, and empathetic. Keep your tone gentle and friendly.
        `.trim();
        
        conversationHistory = [
          { role: "system", content: emotionalPrompt },
          { role: "user", content: message }
        ];
      } else if (sessionId && effectiveUserId) {
        // Fetch existing conversation history
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
            
            // Add system message only once at the beginning
            if (data.userMessage.role === 'system' && conversationHistory.length === 0) {
              conversationHistory.push(data.userMessage);
            }
            // Add user and assistant messages
            else if (data.userMessage.role !== 'system') {
              conversationHistory.push(data.userMessage);
            }
            
            conversationHistory.push(data.assistantMessage);
          });
          
          // Add the new user message
          conversationHistory.push({ role: "user", content: message });
        } else {
          // Session ID provided but no history found
          throw new functions.HttpsError(
            'not-found',
            "Session not found"
          );
        }
      } else {
        // No session or user ID, just handle as a single message
        conversationHistory = [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message }
        ];
      }
      
      // First analyze emotion if requested
      let emotionData = null;
      
      if (analyzeEmotion) {
        console.log("[processEmotionalChat] Analyzing emotion");
        
        const emotionMessages: ChatCompletionMessageParam[] = [
          { 
            role: "system", 
            content: `You are an emotion analysis system. Analyze the emotional tone of the given text and respond with a JSON object containing:
              1. primaryEmotion: The dominant emotion (happy, sad, angry, fearful, disgusted, surprised, neutral, excited, anxious, confused, nostalgic, hopeful, grateful)
              2. intensity: A number from 1-10 indicating intensity
              3. briefExplanation: A very brief explanation
              Format: { "primaryEmotion": "", "intensity": 0, "briefExplanation": "" }`
          },
          { role: "user", content: message }
        ];
        
        const emotionCompletion = await openai.chat.completions.create({
          model: emotionModel,
          messages: emotionMessages,
          max_tokens: 150,
          temperature: 0.2,
          response_format: { type: "json_object" },
          user: effectiveUserId || undefined,
        });
        
        const emotionReply = emotionCompletion.choices?.[0]?.message?.content || '{"primaryEmotion":"neutral","intensity":1,"briefExplanation":"Unable to determine emotion."}';
        const emotionUsage = emotionCompletion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        
        // Record the emotion analysis subcall
        if (effectiveUserId) {
          await recordTransactionSubcall(
            effectiveUserId,
            transactionId,
            "emotion_analysis",
            emotionUsage.prompt_tokens,
            emotionUsage.completion_tokens,
            emotionUsage.total_tokens,
            emotionModel
          );
        }
        
        // Parse the emotion data
        try {
          emotionData = JSON.parse(emotionReply);
        } catch (error) {
          console.error("[processEmotionalChat] Error parsing emotion JSON:", error);
          emotionData = { primaryEmotion: "neutral", intensity: 1, briefExplanation: "Error analyzing emotion." };
        }
        
        // Optionally enhance the system message with emotion context
        if (conversationHistory[0].role === "system") {
          const systemMessage = conversationHistory[0].content as string;
          conversationHistory[0].content = `${systemMessage}\n\nThe user's message appears to express ${emotionData.primaryEmotion} with an intensity of ${emotionData.intensity}/10. ${emotionData.briefExplanation}`;
        }
      }
      
      // Now generate the AI response
      console.log("[processEmotionalChat] Generating response");
      
      const completion = await openai.chat.completions.create({
        model: defaultModel,
        messages: conversationHistory,
        max_tokens: 1000,
        user: effectiveUserId || undefined,
      });
      
      const reply = completion.choices?.[0]?.message?.content || "No reply generated.";
      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      // Record the response generation subcall
      if (effectiveUserId && sessionId) {
        await recordTransactionSubcall(
          effectiveUserId,
          transactionId,
          "generate_response",
          usage.prompt_tokens,
          usage.completion_tokens,
          usage.total_tokens,
          defaultModel
        );
        
        // Save the conversation history
        await saveConversationHistory(
          effectiveUserId,
          sessionId,
          { role: "user", content: message },
          { role: "assistant", content: reply },
          defaultModel,
          transactionId
        );
        
        // Mark the transaction as completed
        const usageDocRef = db.collection("users")
          .doc(effectiveUserId)
          .collection("token_usage")
          .doc(transactionId);
        
        await usageDocRef.update({
          completed: true,
          completedAt: new Date()
        });
      }
      
      // Return the complete response
      return {
        reply,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
        emotion: emotionData,
        sessionId,
        transactionId
      };
    } catch (error) {
      console.error("[processEmotionalChat] Error:", error);
      
      // Mark transaction as failed if it exists
      if (effectiveUserId) {
        try {
          const usageDocRef = db.collection("users")
            .doc(effectiveUserId)
            .collection("token_usage")
            .doc(transactionId);
          
          await usageDocRef.update({
            completed: true,
            error: typeof error === "object" && error !== null && "message" in error ? (error as any).message : "Unknown error",
            completedAt: new Date()
          });
        } catch (updateError) {
          console.error("[processEmotionalChat] Error updating transaction status:", updateError);
        }
      }
      
      throw new functions.HttpsError(
        'internal',
        "Failed to process emotional chat: " +
        (typeof error === "object" && error !== null && "message" in error
          ? (error as any).message
          : String(error))
      );
    }
  }
);

// Initialize a transaction usage document
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

// Record a subcall within a transaction
async function recordTransactionSubcall(
  userId: string,
  transactionId: string,
  subcallType: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  model: string
): Promise<void> {
  try {
    const timestamp = new Date();
    const estimatedCost = calculateCost(model, promptTokens, completionTokens);
    
    // Reference to the transaction document
    const usageDocRef = db.collection("users")
      .doc(userId)
      .collection("token_usage")
      .doc(transactionId);
    
    // Add the subcall record
    await usageDocRef.collection("subcalls").doc(subcallType).set({
      timestamp,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      estimatedCost
    });
    
    // Update the parent document totals
    await usageDocRef.update({
      totalPromptTokens: FieldValue.increment(promptTokens),
      totalCompletionTokens: FieldValue.increment(completionTokens),
      totalTokens: FieldValue.increment(totalTokens),
      estimatedCost: FieldValue.increment(estimatedCost),
      lastUpdated: timestamp
    });
    
    // Also update the global usage stats
    await updateGlobalUsageStats(
      userId,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      subcallType,
      estimatedCost
    );
    
    console.log(`[recordTransactionSubcall] Recorded subcall ${subcallType} for transaction ${transactionId}`);
  } catch (error) {
    console.error("[recordTransactionSubcall] Error:", error);
    // Continue execution even if recording fails
  }
}

// Function to update global usage statistics
async function updateGlobalUsageStats(
  userId: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  model: string,
  source: string,
  estimatedCost: number
): Promise<void> {
  try {
    const timestamp = new Date();
    const currentMonth = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = timestamp.getDay();
    const currentHour = timestamp.getHours();
    
    // Update user profile with usage stats
    const userRef = db.collection('users').doc(userId);
    
    const fieldUpdates = {
      [`token_usage.lifetime`]: FieldValue.increment(totalTokens),
      [`token_usage.monthly.${currentMonth}`]: FieldValue.increment(totalTokens),
      [`token_usage.by_model.${model}`]: FieldValue.increment(totalTokens),
      [`token_usage.by_source.${source}`]: FieldValue.increment(totalTokens),
      [`token_usage.by_hour.${currentHour}`]: FieldValue.increment(totalTokens),
      [`token_usage.by_day.${currentDay}`]: FieldValue.increment(totalTokens),
      [`token_cost.lifetime`]: FieldValue.increment(estimatedCost),
      [`token_cost.monthly.${currentMonth}`]: FieldValue.increment(estimatedCost),
      [`token_usage.last_updated`]: timestamp,
      'lastApiCall': timestamp,
      'updatedAt': timestamp,
      // Legacy field for backward compatibility
      'preferences.totalTokensUsed': FieldValue.increment(totalTokens)
    };
    
    await userRef.update(fieldUpdates);
    
    // Update monthly summary collection
    const usageSummaryRef = db.collection('usageSummary').doc(currentMonth);
    await usageSummaryRef.set({
      [`users.${userId}`]: FieldValue.increment(totalTokens),
      [`models.${model}`]: FieldValue.increment(totalTokens),
      [`sources.${source}`]: FieldValue.increment(totalTokens),
      totalTokens: FieldValue.increment(totalTokens),
      totalCost: FieldValue.increment(estimatedCost),
      updatedAt: timestamp
    }, { merge: true });
    
    console.log(`[updateGlobalUsageStats] Updated global stats for user ${userId}`);
  } catch (error) {
    console.error("[updateGlobalUsageStats] Error:", error);
    // Continue execution even if global stats update fails
  }
}

// Function to save conversation history
async function saveConversationHistory(
  userId: string,
  sessionId: string,
  userMessage: ChatCompletionMessageParam,
  assistantMessage: ChatCompletionMessageParam,
  model: string,
  transactionId: string
): Promise<void> {
  try {
    const timestamp = new Date();
    const isoTimestamp = timestamp.toISOString();
    
    // Create a new entry in the conversations collection
    const conversationDoc = await db.collection('conversations').add({
      userId,
      sessionId,
      timestamp: isoTimestamp,
      userMessage,
      assistantMessage,
      model,
      transactionId, // Link conversation to the transaction
      createdAt: timestamp
    });
    
    console.log(`[saveConversationHistory] Saved conversation for session ${sessionId}`);
  } catch (error) {
    console.error("[saveConversationHistory] Error saving conversation:", error);
    // Continue execution even if saving conversation fails
  }
}

type ModelKey = 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | 'gpt-4o-mini';

/**
 * Calculates the cost of an OpenAI API call in USD.
 * @param model - The model used (e.g., "gpt-4o", "gpt-4", "gpt-3.5-turbo", "gpt-4o-mini")
 * @param promptTokens - Number of tokens used in the prompt
 * @param completionTokens - Number of tokens generated in the response
 * @returns The cost in USD
 */
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<ModelKey, { promptRate: number; completionRate: number }> = {
    'gpt-4o': {
      promptRate: 0.000005,       // $5.00 / 1M tokens
      completionRate: 0.000015    // $15.00 / 1M tokens
    },
    'gpt-4': {
      promptRate: 0.00003,        // $30.00 / 1M tokens
      completionRate: 0.00006     // $60.00 / 1M tokens
    },
    'gpt-3.5-turbo': {
      promptRate: 0.0000005,      // $0.50 / 1M tokens
      completionRate: 0.0000015   // $1.50 / 1M tokens
    },
    'gpt-4o-mini': {
      promptRate: 0.00000015,     // $0.15 / 1M tokens
      completionRate: 0.0000006   // $0.60 / 1M tokens
    }
  };

  const modelKey = model as ModelKey;
  const rates = pricing[modelKey] || pricing['gpt-3.5-turbo']; // fallback to 3.5 if unknown

  const cost =
    (promptTokens * rates.promptRate) +
    (completionTokens * rates.completionRate);

  return parseFloat(cost.toFixed(6)); // Round to 6 decimal places
}