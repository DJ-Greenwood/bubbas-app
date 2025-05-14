// src/conversationSessionFunctions.ts
import { onCall } from "firebase-functions/v2/https";
import { CallableRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';

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

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  emotion?: string;
  timestamp: Timestamp;
}

interface ConversationSession {
  sessionStart: Timestamp;
  lastActive: Timestamp;
  sessionEnd?: Timestamp;
  active: boolean;
  summary?: string;
}

interface Prompt {
  id: string;
  category: 'greeting' | 'reflection' | 'emotion_ack' | 'gap_reconnect' | string;
  trigger: {
    type: 'first_time' | 'new_day' | 'emotion_detected' | string;
    condition?: any;
  };
  tone: 'friendly' | 'empathetic' | string;
  content: string;
  active: boolean;
}

/**
 * Determines if a new session should be created based on time gap and other factors
 */
const shouldCreateNewSession = async (
  userId: string,
  lastActiveTimestamp?: Timestamp
): Promise<boolean> => {
  // If no previous timestamp, it's the first session
  if (!lastActiveTimestamp) {
    return true;
  }

  const now = Timestamp.now();
  
  // Check if the time gap is more than 2 hours (7200000 milliseconds)
  const timeGapInMs = now.toMillis() - lastActiveTimestamp.toMillis();
  if (timeGapInMs > 7200000) {
    return true;
  }
  
  // Check if the calendar date has changed
  const lastActiveDate = lastActiveTimestamp.toDate().toDateString();
  const currentDate = now.toDate().toDateString();
  if (lastActiveDate !== currentDate) {
    return true;
  }
  
  return false;
};

/**
 * Creates a new conversation session or resumes an existing one
 */
const createOrResumeSession = async (
  userId: string,
  userMessage: string,
  userEmotion?: string
): Promise<{ 
  conversationId: string; 
  isNewSession: boolean; 
  sessionPrompt?: string;
  timeGap?: number;
}> => {
  // Find the most recent active session for this user
  const activeSessionsRef = db
    .collection(`users/${userId}/conversations`)
    .where('active', '==', true)
    .orderBy('lastActive', 'desc')
    .limit(1);

  const activeSessionsSnapshot = await activeSessionsRef.get();
  
  let conversationId: string;
  let isNewSession = false;
  let timeGap = 0;
  
  if (activeSessionsSnapshot.empty) {
    // No active sessions, create a new one
    isNewSession = true;
    const newConversationRef = db.collection(`users/${userId}/conversations`).doc();
    conversationId = newConversationRef.id;
    
    const sessionData: ConversationSession = {
      sessionStart: Timestamp.now(),
      lastActive: Timestamp.now(),
      active: true
    };
    
    await newConversationRef.set(sessionData);
  } else {
    // Found an active session
    const activeSession = activeSessionsSnapshot.docs[0];
    conversationId = activeSession.id;
    const sessionData = activeSession.data() as ConversationSession;
    
    // Check if we should create a new session based on time gap
    isNewSession = await shouldCreateNewSession(userId, sessionData.lastActive);
    
    if (isNewSession) {
      // End the current session
      await activeSession.ref.update({
        active: false,
        sessionEnd: Timestamp.now()
      });
      
      // Create a new session
      const newConversationRef = db.collection(`users/${userId}/conversations`).doc();
      conversationId = newConversationRef.id;
      
      const newSessionData: ConversationSession = {
        sessionStart: Timestamp.now(),
        lastActive: Timestamp.now(),
        active: true
      };
      
      await newConversationRef.set(newSessionData);
    } else {
      // Calculate time gap for context
      timeGap = Timestamp.now().toMillis() - sessionData.lastActive.toMillis();
      
      // Update the lastActive timestamp
      await activeSession.ref.update({
        lastActive: Timestamp.now()
      });
    }
  }
  
  // Add the user message to the conversation
  const messageRef = db.collection(`users/${userId}/conversations/${conversationId}/messages`).doc();
  const messageData: Message = {
    role: 'user',
    content: userMessage,
    timestamp: Timestamp.now()
  };
  
  if (userEmotion) {
    messageData.emotion = userEmotion;
  }
  
  await messageRef.set(messageData);
  
  // Get appropriate contextual prompt if needed
  let sessionPrompt: string | undefined;
  if (isNewSession || timeGap > 3600000) { // 1 hour threshold for welcome back
    sessionPrompt = await getContextualPrompt(userId, isNewSession, timeGap, userEmotion);
  }
  
  return { conversationId, isNewSession, sessionPrompt, timeGap };
};

/**
 * Gets the appropriate contextual prompt based on session state
 */
const getContextualPrompt = async (
  userId: string,
  isNewSession: boolean,
  timeGap?: number,
  emotion?: string
): Promise<string | undefined> => {
  let triggerType: string;
  
  // Determine the type of prompt needed
  if (isNewSession) {
    // Check if this is the user's first-ever conversation
    const previousConversationsRef = db.collection(`users/${userId}/conversations`);
    const conversationCount = (await previousConversationsRef.count().get()).data().count;
    
    triggerType = conversationCount <= 1 ? 'first_time' : 'new_day';
  } else if (timeGap && timeGap > 3600000) { // 1 hour+ gap
    triggerType = 'gap_reconnect';
  } else if (emotion) {
    triggerType = 'emotion_detected';
  } else {
    return undefined; // No special prompt needed
  }
  
  // Query for the appropriate prompt
  const promptQuery = db.collection('admin/prompts')
    .where('active', '==', true)
    .where('trigger.type', '==', triggerType);
    
  // Add emotion filter if relevant
  let promptQueryWithEmotion = promptQuery;
  if (triggerType === 'emotion_detected' && emotion) {
    promptQueryWithEmotion = promptQuery.where('trigger.condition.emotion', '==', emotion);
  }
    
  const promptSnapshot = await promptQueryWithEmotion.limit(1).get();
  
  // If no emotion-specific prompt found, try the general one for that trigger
  if (promptSnapshot.empty && triggerType === 'emotion_detected') {
    const generalPromptSnapshot = await promptQuery.limit(1).get();
    if (!generalPromptSnapshot.empty) {
      return generalPromptSnapshot.docs[0].data().content;
    }
    return undefined;
  }
  
  if (!promptSnapshot.empty) {
    return promptSnapshot.docs[0].data().content;
  }
  
  return undefined;
};

/**
 * Gets previous messages for context up to a limit
 */
const getPreviousMessages = async (
  userId: string,
  conversationId: string,
  limit: number = 10
): Promise<Message[]> => {
  const messagesRef = db
    .collection(`users/${userId}/conversations/${conversationId}/messages`)
    .orderBy('timestamp', 'desc')
    .limit(limit);
    
  const messagesSnapshot = await messagesRef.get();
  
  const messages: Message[] = [];
  messagesSnapshot.forEach(doc => {
    messages.push(doc.data() as Message);
  });
  
  // Return in chronological order
  return messages.reverse();
};

/**
 * Handles the assistant's response and stores it
 */
const handleAssistantResponse = async (
  userId: string,
  conversationId: string,
  context: Message[],
  systemPrompt?: string
): Promise<{ content: string; usage: { promptTokens: number, completionTokens: number, totalTokens: number } }> => {
  // Prepare messages for OpenAI API
  const messagesForAPI = context.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  // Add system prompt if provided
  if (systemPrompt) {
    messagesForAPI.unshift({
      role: 'system',
      content: systemPrompt
    });
  }
  
  const apiKey = OPENAI_API_KEY.value();
  const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
  const transactionId = `session-${conversationId}-${Date.now()}`;
  
  // Create OpenAI instance
  const openai = new OpenAI({ apiKey });
  
  // Initialize transaction usage
  await initializeTransactionUsage(
    userId,
    transactionId,
    "openai_chat",
    defaultModel
  );
  
  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: defaultModel,
    messages: messagesForAPI,
    max_tokens: 1000,
    user: userId,
  });
  
  const content = completion.choices?.[0]?.message?.content || "No reply generated.";
  const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  
  // Store the assistant's response
  const messageRef = db.collection(`users/${userId}/conversations/${conversationId}/messages`).doc();
  const messageData: Message = {
    role: 'assistant',
    content: content,
    timestamp: Timestamp.now()
  };
  
  await messageRef.set(messageData);
  
  // Record token usage
  await recordTransactionSubcall(
    userId,
    transactionId,
    "primary_call",
    usage.prompt_tokens,
    usage.completion_tokens,
    usage.total_tokens,
    defaultModel
  );
  
  // Return the response
  return {
    content,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    }
  };
};

/**
 * Cloud Function to process a user message and return a response
 */
export const processUserMessage = onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<{ message: string; emotion?: string }>) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new Error('You must be logged in to use this feature.');
    }
    
    const userId = request.auth.uid;
    const { message, emotion } = request.data;
    
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string.');
    }
    
    try {
      // Create or resume session
      const { 
        conversationId, 
        isNewSession, 
        sessionPrompt,
        timeGap 
      } = await createOrResumeSession(userId, message, emotion);
      
      // Get previous messages for context
      const previousMessages = await getPreviousMessages(userId, conversationId);
      
      // Get system prompt based on session state
      let systemPrompt: string | undefined;
      
      if (sessionPrompt) {
        systemPrompt = sessionPrompt;
      } else {
        // Get default system prompt if no special context prompt
        const defaultPromptSnapshot = await db
          .collection('admin/prompts')
          .where('category', '==', 'default')
          .where('active', '==', true)
          .limit(1)
          .get();
          
        if (!defaultPromptSnapshot.empty) {
          systemPrompt = defaultPromptSnapshot.docs[0].data().content;
        }
      }
      
      // Generate assistant response
      const response = await handleAssistantResponse(
        userId,
        conversationId,
        previousMessages,
        systemPrompt
      );
      
      // Increment interaction count
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        interactionCount: FieldValue.increment(1)
      });
      
      // Return response to client
      return {
        content: response.content,
        conversationId,
        isNewSession,
        timeGapInMinutes: timeGap ? Math.floor(timeGap / 60000) : 0
      };
    } catch (error) {
      console.error('Error processing user message:', error);
      throw new Error(`An error occurred processing your message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Cloud Function to end a session manually
 */
export const endConversationSession = onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<{ conversationId: string; generateSummary?: boolean }>) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new Error('You must be logged in to use this feature.');
    }
    
    const userId = request.auth.uid;
    const { conversationId, generateSummary } = request.data;
    
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('Conversation ID must be a non-empty string.');
    }
    
    try {
      const conversationRef = db.doc(`users/${userId}/conversations/${conversationId}`);
      const conversationSnapshot = await conversationRef.get();
      
      if (!conversationSnapshot.exists) {
        throw new Error('Conversation not found.');
      }
      
      // End the session
      await conversationRef.update({
        active: false,
        sessionEnd: Timestamp.now()
      });
      
      // Generate summary if requested
      if (generateSummary) {
        await generateSessionSummary(userId, conversationId);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error ending conversation session:', error);
      throw new Error(`An error occurred ending the conversation session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Function to generate a session summary
 */
const generateSessionSummary = async (
  userId: string,
  conversationId: string
): Promise<string> => {
  // Get all messages in the conversation
  const messagesRef = db
    .collection(`users/${userId}/conversations/${conversationId}/messages`)
    .orderBy('timestamp', 'asc');
    
  const messagesSnapshot = await messagesRef.get();
  
  if (messagesSnapshot.empty) {
    return 'No messages in this conversation.';
  }
  
  const messages: Message[] = [];
  messagesSnapshot.forEach(doc => {
    messages.push(doc.data() as Message);
  });
  
  // Create a summary prompt
  const summaryPrompt = `You are an AI assistant tasked with summarizing a conversation. 
  Create a concise summary (2-3 sentences) highlighting the main topics discussed 
  and any emotional themes present. Focus on being helpful and insightful.`;
  
  // Convert messages to a format OpenAI can understand
  const messagesForAPI = [
    {
      role: 'system' as const,
      content: summaryPrompt
    },
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    {
      role: 'user' as const,
      content: 'Please summarize our conversation in 2-3 sentences.'
    }
  ];
  
  const apiKey = OPENAI_API_KEY.value();
  const defaultModel = "gpt-3.5-turbo"; // Use cheaper model for summary
  const transactionId = `summary-${conversationId}-${Date.now()}`;
  
  // Create OpenAI instance
  const openai = new OpenAI({ apiKey });
  
  // Initialize transaction usage
  await initializeTransactionUsage(
    userId,
    transactionId,
    "summary",
    defaultModel
  );
  
  // Call OpenAI API for summary
  const completion = await openai.chat.completions.create({
    model: defaultModel,
    messages: messagesForAPI,
    max_tokens: 200,
    user: userId,
  });
  
  const summary = completion.choices?.[0]?.message?.content || "No summary generated.";
  const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  
  // Store the summary
  await db.doc(`users/${userId}/conversations/${conversationId}`).update({
    summary
  });
  
  // Record token usage
  await recordTransactionSubcall(
    userId,
    transactionId,
    "summary_generation",
    usage.prompt_tokens,
    usage.completion_tokens,
    usage.total_tokens,
    defaultModel
  );
  
  return summary;
};

// Helper functions for token tracking (copied from your callOpenAI.ts file)

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