"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTransactionUsage = initializeTransactionUsage;
exports.recordTransactionSubcall = recordTransactionSubcall;
exports.saveConversationHistory = saveConversationHistory;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
async function initializeTransactionUsage(userId, transactionId, type, model) {
    try {
        const timestamp = new Date();
        const currentMonth = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
        const usageDocRef = db
            .collection("users")
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
            completed: false,
        });
        console.log(`[initializeTransactionUsage] Init done: ${transactionId}`);
    }
    catch (error) {
        console.error("[initializeTransactionUsage] Error:", error);
    }
}
async function recordTransactionSubcall(userId, transactionId, subcallType, promptTokens, completionTokens, totalTokens, model) {
    try {
        const timestamp = new Date();
        const estimatedCost = calculateGeminiCost(model, promptTokens, completionTokens);
        const usageDocRef = db
            .collection("users")
            .doc(userId)
            .collection("token_usage")
            .doc(transactionId);
        await usageDocRef.collection("subcalls").doc(subcallType).set({
            timestamp,
            promptTokens,
            completionTokens,
            totalTokens,
            model,
            estimatedCost,
        });
        await usageDocRef.update({
            totalPromptTokens: firestore_1.FieldValue.increment(promptTokens),
            totalCompletionTokens: firestore_1.FieldValue.increment(completionTokens),
            totalTokens: firestore_1.FieldValue.increment(totalTokens),
            estimatedCost: firestore_1.FieldValue.increment(estimatedCost),
            lastUpdated: timestamp,
        });
        console.log(`[recordTransactionSubcall] ${subcallType} recorded for ${transactionId}`);
    }
    catch (error) {
        console.error("[recordTransactionSubcall] Error:", error);
    }
}
async function saveConversationHistory(userId, sessionId, userMessage, assistantMessage, model, transactionId) {
    try {
        const timestamp = new Date();
        const isoTimestamp = timestamp.toISOString();
        await db.collection('conversations').add({
            userId,
            sessionId,
            timestamp: isoTimestamp,
            userMessage,
            assistantMessage,
            model,
            transactionId,
            createdAt: timestamp,
        });
        console.log(`[saveConversationHistory] Saved session: ${sessionId}`);
    }
    catch (error) {
        console.error("[saveConversationHistory] Error:", error);
    }
}
function calculateGeminiCost(model, promptTokens, completionTokens) {
    // Example pricing (adjust if needed)
    const rate = {
        'gemini-pro': { prompt: 0.0000025, completion: 0.0000075 },
    };
    const pricing = rate[model] || rate['gemini-pro'];
    const cost = (promptTokens * pricing.prompt) +
        (completionTokens * pricing.completion);
    return parseFloat(cost.toFixed(6));
}
//# sourceMappingURL=usage.js.map