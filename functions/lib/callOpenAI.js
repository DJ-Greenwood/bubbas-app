"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEmotionalChat = exports.continueConversation = exports.analyzeEmotionWithTracking = exports.startEmotionalSupportSession = exports.callOpenAI = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const openai_1 = __importDefault(require("openai"));
const uuid_1 = require("uuid");
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
// Helper function to generate or validate transaction ID
function getTransactionId(providedId) {
    return providedId || (0, uuid_1.v4)();
}
// Main Firebase Callable Function that handles OpenAI API calls
exports.callOpenAI = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
    console.log("[callOpenAI] Received request");
    // ✅ Extract request data with defaults
    const { messages, model, maxTokens = 1000, userId, saveHistory = false, sessionId, transactionId: providedTransactionId } = request.data;
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    console.log(`[callOpenAI] Using transaction ID: ${transactionId}`);
    // ✅ Get authentication context
    const auth = request.auth;
    if (!auth && userId) {
        // Only authenticated users can specify a userId
        throw new Error("Authentication required to specify userId");
    }
    // Allow authenticated users or requests without userId
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    // ✅ Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
        throw new Error("UserId mismatch with authenticated user");
    }
    // ✅ Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error("Missing or invalid 'messages' array");
    }
    // ✅ Type assertion to match OpenAI expectations
    const typedMessages = messages;
    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
    const selectedModel = model || defaultModel;
    // Create OpenAI instance
    const openai = new openai_1.default({ apiKey });
    try {
        // If we have a user ID, initialize the transaction usage tracker
        if (effectiveUserId) {
            await initializeTransactionUsage(effectiveUserId, transactionId, "openai_chat", selectedModel);
        }
        // ✅ Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages: typedMessages,
            max_tokens: maxTokens,
            user: effectiveUserId || undefined, // Pass user ID for OpenAI's usage tracking
        });
        const reply = completion.choices?.[0]?.message?.content || "No reply generated.";
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        console.log("[callOpenAI] OpenAI reply received");
        // ✅ Save token usage if userId is provided
        if (effectiveUserId) {
            await recordTransactionSubcall(effectiveUserId, transactionId, "primary_call", usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, selectedModel);
        }
        // ✅ Save conversation history if requested and userId is available
        if (saveHistory && effectiveUserId && sessionId) {
            await saveConversationHistory(effectiveUserId, sessionId, typedMessages[typedMessages.length - 1], { role: "assistant", content: reply }, selectedModel, transactionId);
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
    }
    catch (error) {
        console.error("[callOpenAI] Error calling OpenAI:", error);
        throw new Error("Failed to fetch response from OpenAI");
    }
});
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
// Function to save conversation history
async function saveConversationHistory(userId, sessionId, userMessage, assistantMessage, model, transactionId) {
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
    }
    catch (error) {
        console.error("[saveConversationHistory] Error saving conversation:", error);
        // Continue execution even if saving conversation fails
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
    return parseFloat(cost.toFixed(6));
}
// Emotional support session specialized endpoint
exports.startEmotionalSupportSession = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
    console.log("[startEmotionalSupportSession] Starting session");
    // Extract request data
    const { userId, transactionId: providedTransactionId } = request.data;
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    console.log(`[startEmotionalSupportSession] Using transaction ID: ${transactionId}`);
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
        throw new Error("Authentication required to specify userId");
    }
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
        throw new Error("UserId mismatch with authenticated user");
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
    const messages = [
        { role: "system", content: emotionalPrompt }
    ];
    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
    // Create OpenAI instance
    const openai = new openai_1.default({ apiKey });
    try {
        // Initialize transaction if user is authenticated
        if (effectiveUserId) {
            await initializeTransactionUsage(effectiveUserId, transactionId, "emotional_support", defaultModel);
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
            await recordTransactionSubcall(effectiveUserId, transactionId, "start_session", usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, defaultModel);
            // Save this as the first message in a new conversation
            await saveConversationHistory(effectiveUserId, sessionId, { role: "system", content: emotionalPrompt }, { role: "assistant", content: reply }, defaultModel, transactionId);
        }
        // Simplified emotion detection - would normally use a more sophisticated system
        let emotion = "neutral";
        if (reply.toLowerCase().includes("sorry") || reply.toLowerCase().includes("understand your frustration")) {
            emotion = "empathetic";
        }
        else if (reply.toLowerCase().includes("great") || reply.toLowerCase().includes("wonderful")) {
            emotion = "happy";
        }
        else if (reply.toLowerCase().includes("hmm") || reply.toLowerCase().includes("interesting")) {
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
    }
    catch (error) {
        console.error("[startEmotionalSupportSession] Error:", error);
        throw new Error("Failed to start emotional support session");
    }
});
// Enhanced emotion analysis function
exports.analyzeEmotionWithTracking = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
    console.log("[analyzeEmotionWithTracking] Analyzing emotion");
    // Extract request data
    const { text, userId, transactionId: providedTransactionId } = request.data;
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
        throw new Error("Authentication required to specify userId");
    }
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
        throw new Error("UserId mismatch with authenticated user");
    }
    // Validate text input
    if (!text) {
        throw new Error("Text input is required");
    }
    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = "gpt-3.5-turbo"; // Use cheaper model for emotion analysis
    // Create OpenAI instance
    const openai = new openai_1.default({ apiKey });
    try {
        // Initialize transaction if first call in chain and user is authenticated
        if (effectiveUserId && providedTransactionId === undefined) {
            await initializeTransactionUsage(effectiveUserId, transactionId, "emotion_analysis", defaultModel);
        }
        // Create emotion analysis prompt
        const messages = [
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
            await recordTransactionSubcall(effectiveUserId, transactionId, "emotion_analysis", usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, defaultModel);
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
        }
        catch (error) {
            console.error("[analyzeEmotionWithTracking] Error parsing JSON:", error);
            throw new Error("Failed to parse emotion analysis response");
        }
    }
    catch (error) {
        console.error("[analyzeEmotionWithTracking] Error:", error);
        throw new Error("Failed to analyze emotion");
    }
});
// Function to continue an existing conversation
exports.continueConversation = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
    console.log("[continueConversation] Continuing conversation");
    // Extract request data
    const { sessionId, message, userId, transactionId: providedTransactionId } = request.data;
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
        throw new Error("Authentication required to specify userId");
    }
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
        throw new Error("UserId mismatch with authenticated user");
    }
    // Validate required fields
    if (!sessionId) {
        throw new Error("Session ID is required");
    }
    if (!message) {
        throw new Error("Message is required");
    }
    try {
        // Initialize transaction if new and user is authenticated
        if (effectiveUserId && providedTransactionId === undefined) {
            // Determine session type based on session ID format
            const sessionType = sessionId.startsWith('emotional-support') ? 'emotional_support' : 'conversation';
            await initializeTransactionUsage(effectiveUserId, transactionId, sessionType, OPENAI_MODEL.value() || "gpt-4o");
        }
        // Fetch conversation history if user is authenticated
        let conversationHistory = [];
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
            }
            else {
                // If no history found, start with a generic system message
                conversationHistory = [
                    { role: "system", content: "You are a helpful assistant." }
                ];
            }
        }
        else {
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
        const openai = new openai_1.default({ apiKey });
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
            await recordTransactionSubcall(effectiveUserId, transactionId, "continue_conversation", usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, defaultModel);
            await saveConversationHistory(effectiveUserId, sessionId, { role: "user", content: message }, { role: "assistant", content: reply }, defaultModel, transactionId);
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
    }
    catch (error) {
        console.error("[continueConversation] Error:", error);
        throw new Error("Failed to continue conversation");
    }
});
// Function to handle multi-step AI processes with transaction tracking
exports.processEmotionalChat = (0, https_1.onCall)({
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
}, async (request) => {
    console.log("[processEmotionalChat] Processing emotional chat");
    // Extract request data
    const { message, sessionId: existingSessionId, userId, analyzeEmotion = true, transactionId: providedTransactionId } = request.data;
    // Generate or use provided transaction ID
    const transactionId = getTransactionId(providedTransactionId);
    // Authentication check
    const auth = request.auth;
    if (!auth && userId) {
        throw new Error("Authentication required to specify userId");
    }
    const authenticatedUserId = auth?.uid;
    const effectiveUserId = authenticatedUserId || null;
    // Security check - prevent impersonation
    if (userId && userId !== effectiveUserId) {
        throw new Error("UserId mismatch with authenticated user");
    }
    // Validate message
    if (!message) {
        throw new Error("Message is required");
    }
    // Get API key and default model
    const apiKey = OPENAI_API_KEY.value();
    const defaultModel = OPENAI_MODEL.value() || "gpt-4o";
    const emotionModel = "gpt-3.5-turbo"; // Use cheaper model for emotion analysis
    // Create OpenAI instance
    const openai = new openai_1.default({ apiKey });
    try {
        // Initialize transaction if user is authenticated
        if (effectiveUserId) {
            await initializeTransactionUsage(effectiveUserId, transactionId, "emotional_chat", defaultModel);
        }
        // Create or continue session
        let sessionId = existingSessionId;
        let conversationHistory = [];
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
        }
        else if (sessionId && effectiveUserId) {
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
            }
            else {
                // Session ID provided but no history found
                throw new Error("Session not found");
            }
        }
        else {
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
            const emotionMessages = [
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
                await recordTransactionSubcall(effectiveUserId, transactionId, "emotion_analysis", emotionUsage.prompt_tokens, emotionUsage.completion_tokens, emotionUsage.total_tokens, emotionModel);
            }
            // Parse the emotion data
            try {
                emotionData = JSON.parse(emotionReply);
            }
            catch (error) {
                console.error("[processEmotionalChat] Error parsing emotion JSON:", error);
                emotionData = { primaryEmotion: "neutral", intensity: 1, briefExplanation: "Error analyzing emotion." };
            }
            // Optionally enhance the system message with emotion context
            if (conversationHistory[0].role === "system") {
                const systemMessage = conversationHistory[0].content;
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
            await recordTransactionSubcall(effectiveUserId, transactionId, "generate_response", usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, defaultModel);
            // Save the conversation history
            await saveConversationHistory(effectiveUserId, sessionId, { role: "user", content: message }, { role: "assistant", content: reply }, defaultModel, transactionId);
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
    }
    catch (error) {
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
                    error: typeof error === "object" && error !== null && "message" in error ? error.message : "Unknown error",
                    completedAt: new Date()
                });
            }
            catch (updateError) {
                console.error("[processEmotionalChat] Error updating transaction status:", updateError);
            }
        }
        throw new Error("Failed to process emotional chat: " +
            (typeof error === "object" && error !== null && "message" in error
                ? error.message
                : String(error)));
    }
});
//# sourceMappingURL=callOpenAI.js.map