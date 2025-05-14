"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.endConversationSession = exports.processUserMessage = void 0;
// src/conversationSessionFunctions.ts
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const openai_1 = __importDefault(require("openai"));
// Initialize Firebase app if not already initialized
if (!(0, app_1.getApps)().length) {
    console.log("Initializing Firebase app...");
    (0, app_1.initializeApp)(); // Safe — only runs once
}
// Get Firestore instance
const db = (0, firestore_1.getFirestore)();
// Define secrets for OpenAI API key and model
const OPENAI_API_KEY = (0, params_1.defineSecret)("openai-key");
const OPENAI_MODEL = (0, params_1.defineSecret)("openai-model");
/**
 * Determines if a new session should be created based on time gap and other factors
 */
const shouldCreateNewSession = async (userId, lastActiveTimestamp) => {
    // If no previous timestamp, it's the first session
    if (!lastActiveTimestamp) {
        return true;
    }
    const now = firestore_1.Timestamp.now();
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
const createOrResumeSession = async (userId, userMessage, userEmotion) => {
    // Find the most recent active session for this user
    const activeSessionsRef = db
        .collection(`users/${userId}/conversations`)
        .where('active', '==', true)
        .orderBy('lastActive', 'desc')
        .limit(1);
    const activeSessionsSnapshot = await activeSessionsRef.get();
    let conversationId;
    let isNewSession = false;
    let timeGap = 0;
    if (activeSessionsSnapshot.empty) {
        // No active sessions, create a new one
        isNewSession = true;
        const newConversationRef = db.collection(`users/${userId}/conversations`).doc();
        conversationId = newConversationRef.id;
        const sessionData = {
            sessionStart: firestore_1.Timestamp.now(),
            lastActive: firestore_1.Timestamp.now(),
            active: true
        };
        await newConversationRef.set(sessionData);
    }
    else {
        // Found an active session
        const activeSession = activeSessionsSnapshot.docs[0];
        conversationId = activeSession.id;
        const sessionData = activeSession.data();
        // Check if we should create a new session based on time gap
        isNewSession = await shouldCreateNewSession(userId, sessionData.lastActive);
        if (isNewSession) {
            // End the current session
            await activeSession.ref.update({
                active: false,
                sessionEnd: firestore_1.Timestamp.now()
            });
            // Create a new session
            const newConversationRef = db.collection(`users/${userId}/conversations`).doc();
            conversationId = newConversationRef.id;
            const newSessionData = {
                sessionStart: firestore_1.Timestamp.now(),
                lastActive: firestore_1.Timestamp.now(),
                active: true
            };
            await newConversationRef.set(newSessionData);
        }
        else {
            // Calculate time gap for context
            timeGap = firestore_1.Timestamp.now().toMillis() - sessionData.lastActive.toMillis();
            // Update the lastActive timestamp
            await activeSession.ref.update({
                lastActive: firestore_1.Timestamp.now()
            });
        }
    }
    // Add the user message to the conversation
    const messageRef = db.collection(`users/${userId}/conversations/${conversationId}/messages`).doc();
    const messageData = {
        role: 'user',
        content: userMessage,
        timestamp: firestore_1.Timestamp.now()
    };
    if (userEmotion) {
        messageData.emotion = userEmotion;
    }
    await messageRef.set(messageData);
    // Get appropriate contextual prompt if needed
    let sessionPrompt;
    if (isNewSession || timeGap > 3600000) { // 1 hour threshold for welcome back
        sessionPrompt = await getContextualPrompt(userId, isNewSession, timeGap, userEmotion);
    }
    return { conversationId, isNewSession, sessionPrompt, timeGap };
};
/**
 * Gets the appropriate contextual prompt based on session state
 */
const getContextualPrompt = async (userId, isNewSession, timeGap, emotion) => {
    let triggerType;
    // Determine the type of prompt needed
    if (isNewSession) {
        // Check if this is the user's first-ever conversation
        const previousConversationsRef = db.collection(`users/${userId}/conversations`);
        const conversationCount = (await previousConversationsRef.count().get()).data().count;
        triggerType = conversationCount <= 1 ? 'first_time' : 'new_day';
    }
    else if (timeGap && timeGap > 3600000) { // 1 hour+ gap
        triggerType = 'gap_reconnect';
    }
    else if (emotion) {
        triggerType = 'emotion_detected';
    }
    else {
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
const getPreviousMessages = async (userId, conversationId, limit = 10) => {
    const messagesRef = db
        .collection(`users/${userId}/conversations/${conversationId}/messages`)
        .orderBy('timestamp', 'desc')
        .limit(limit);
    const messagesSnapshot = await messagesRef.get();
    const messages = [];
    messagesSnapshot.forEach(doc => {
        messages.push(doc.data());
    });
    // Return in chronological order
    return messages.reverse();
};
/**
 * Handles the assistant's response and stores it
 */
const handleAssistantResponse = async (userId, conversationId, context, systemPrompt) => {
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
    const openai = new openai_1.default({ apiKey });
    // Initialize transaction usage
    await initializeTransactionUsage(userId, transactionId, "openai_chat", defaultModel);
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
    const messageData = {
        role: 'assistant',
        content: content,
        timestamp: firestore_1.Timestamp.now()
    };
    await messageRef.set(messageData);
    // Record token usage
    await recordTransactionSubcall(userId, transactionId, "primary_call", usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, defaultModel);
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
exports.processUserMessage = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
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
        const { conversationId, isNewSession, sessionPrompt, timeGap } = await createOrResumeSession(userId, message, emotion);
        // Get previous messages for context
        const previousMessages = await getPreviousMessages(userId, conversationId);
        // Get system prompt based on session state
        let systemPrompt;
        if (sessionPrompt) {
            systemPrompt = sessionPrompt;
        }
        else {
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
        const response = await handleAssistantResponse(userId, conversationId, previousMessages, systemPrompt);
        // Increment interaction count
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            interactionCount: firestore_1.FieldValue.increment(1)
        });
        // Return response to client
        return {
            content: response.content,
            conversationId,
            isNewSession,
            timeGapInMinutes: timeGap ? Math.floor(timeGap / 60000) : 0
        };
    }
    catch (error) {
        console.error('Error processing user message:', error);
        throw new Error(`An error occurred processing your message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Cloud Function to end a session manually
 */
exports.endConversationSession = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
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
            sessionEnd: firestore_1.Timestamp.now()
        });
        // Generate summary if requested
        if (generateSummary) {
            await generateSessionSummary(userId, conversationId);
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error ending conversation session:', error);
        throw new Error(`An error occurred ending the conversation session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Function to generate a session summary
 */
const generateSessionSummary = async (userId, conversationId) => {
    // Get all messages in the conversation
    const messagesRef = db
        .collection(`users/${userId}/conversations/${conversationId}/messages`)
        .orderBy('timestamp', 'asc');
    const messagesSnapshot = await messagesRef.get();
    if (messagesSnapshot.empty) {
        return 'No messages in this conversation.';
    }
    const messages = [];
    messagesSnapshot.forEach(doc => {
        messages.push(doc.data());
    });
    // Create a summary prompt
    const summaryPrompt = `You are an AI assistant tasked with summarizing a conversation. 
  Create a concise summary (2-3 sentences) highlighting the main topics discussed 
  and any emotional themes present. Focus on being helpful and insightful.`;
    // Convert messages to a format OpenAI can understand
    const messagesForAPI = [
        {
            role: 'system',
            content: summaryPrompt
        },
        ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
        })),
        {
            role: 'user',
            content: 'Please summarize our conversation in 2-3 sentences.'
        }
    ];
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = "gpt-3.5-turbo"; // Use cheaper model for summary
    const transactionId = `summary-${conversationId}-${Date.now()}`;
    // Create OpenAI instance
    const openai = new openai_1.default({ apiKey });
    // Initialize transaction usage
    await initializeTransactionUsage(userId, transactionId, "summary", defaultModel);
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
    await recordTransactionSubcall(userId, transactionId, "summary_generation", usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, defaultModel);
    return summary;
};
// Helper functions for token tracking (copied from your callOpenAI.ts file)
// Initialize a transaction usage document
async function initializeTransactionUsage(userId, transactionId, type, model) {
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
    }
    catch (error) {
        console.error("[initializeTransactionUsage] Error:", error);
        // Continue execution even if usage initialization fails
    }
}
// Record a subcall within a transaction
async function recordTransactionSubcall(userId, transactionId, subcallType, promptTokens, completionTokens, totalTokens, model) {
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
            totalPromptTokens: firestore_1.FieldValue.increment(promptTokens),
            totalCompletionTokens: firestore_1.FieldValue.increment(completionTokens),
            totalTokens: firestore_1.FieldValue.increment(totalTokens),
            estimatedCost: firestore_1.FieldValue.increment(estimatedCost),
            lastUpdated: timestamp
        });
        // Also update the global usage stats
        await updateGlobalUsageStats(userId, promptTokens, completionTokens, totalTokens, model, subcallType, estimatedCost);
        console.log(`[recordTransactionSubcall] Recorded subcall ${subcallType} for transaction ${transactionId}`);
    }
    catch (error) {
        console.error("[recordTransactionSubcall] Error:", error);
        // Continue execution even if recording fails
    }
}
// Function to update global usage statistics
async function updateGlobalUsageStats(userId, promptTokens, completionTokens, totalTokens, model, source, estimatedCost) {
    try {
        const timestamp = new Date();
        const currentMonth = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
        const currentDay = timestamp.getDay();
        const currentHour = timestamp.getHours();
        // Update user profile with usage stats
        const userRef = db.collection('users').doc(userId);
        const fieldUpdates = {
            [`token_usage.lifetime`]: firestore_1.FieldValue.increment(totalTokens),
            [`token_usage.monthly.${currentMonth}`]: firestore_1.FieldValue.increment(totalTokens),
            [`token_usage.by_model.${model}`]: firestore_1.FieldValue.increment(totalTokens),
            [`token_usage.by_source.${source}`]: firestore_1.FieldValue.increment(totalTokens),
            [`token_usage.by_hour.${currentHour}`]: firestore_1.FieldValue.increment(totalTokens),
            [`token_usage.by_day.${currentDay}`]: firestore_1.FieldValue.increment(totalTokens),
            [`token_cost.lifetime`]: firestore_1.FieldValue.increment(estimatedCost),
            [`token_cost.monthly.${currentMonth}`]: firestore_1.FieldValue.increment(estimatedCost),
            [`token_usage.last_updated`]: timestamp,
            'lastApiCall': timestamp,
            'updatedAt': timestamp,
            // Legacy field for backward compatibility
            'preferences.totalTokensUsed': firestore_1.FieldValue.increment(totalTokens)
        };
        await userRef.update(fieldUpdates);
        // Update monthly summary collection
        const usageSummaryRef = db.collection('usageSummary').doc(currentMonth);
        await usageSummaryRef.set({
            [`users.${userId}`]: firestore_1.FieldValue.increment(totalTokens),
            [`models.${model}`]: firestore_1.FieldValue.increment(totalTokens),
            [`sources.${source}`]: firestore_1.FieldValue.increment(totalTokens),
            totalTokens: firestore_1.FieldValue.increment(totalTokens),
            totalCost: firestore_1.FieldValue.increment(estimatedCost),
            updatedAt: timestamp
        }, { merge: true });
        console.log(`[updateGlobalUsageStats] Updated global stats for user ${userId}`);
    }
    catch (error) {
        console.error("[updateGlobalUsageStats] Error:", error);
        // Continue execution even if global stats update fails
    }
}
/**
 * Calculates the cost of an OpenAI API call in USD.
 * @param model - The model used (e.g., "gpt-4o", "gpt-4", "gpt-3.5-turbo", "gpt-4o-mini")
 * @param promptTokens - Number of tokens used in the prompt
 * @param completionTokens - Number of tokens generated in the response
 * @returns The cost in USD
 */
function calculateCost(model, promptTokens, completionTokens) {
    const pricing = {
        'gpt-4o': {
            promptRate: 0.000005, // $5.00 / 1M tokens
            completionRate: 0.000015 // $15.00 / 1M tokens
        },
        'gpt-4': {
            promptRate: 0.00003, // $30.00 / 1M tokens
            completionRate: 0.00006 // $60.00 / 1M tokens
        },
        'gpt-3.5-turbo': {
            promptRate: 0.0000005, // $0.50 / 1M tokens
            completionRate: 0.0000015 // $1.50 / 1M tokens
        },
        'gpt-4o-mini': {
            promptRate: 0.00000015, // $0.15 / 1M tokens
            completionRate: 0.0000006 // $0.60 / 1M tokens
        }
    };
    const modelKey = model;
    const rates = pricing[modelKey] || pricing['gpt-3.5-turbo']; // fallback to 3.5 if unknown
    const cost = (promptTokens * rates.promptRate) +
        (completionTokens * rates.completionRate);
    return parseFloat(cost.toFixed(6)); // Round to 6 decimal places
}
//# sourceMappingURL=conversationSessionFunctions.js.map