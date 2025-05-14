"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordInteraction = exports.getTokenUsage = exports.recordTokenUsage = void 0;
// src/recordTokenUsage.ts
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Records token usage for a user
 */
const recordTokenUsage = async (userId, usage) => {
    try {
        // Create a new token usage document
        const tokenUsageRef = db.collection(`users/${userId}/token_usage`).doc();
        await tokenUsageRef.set(usage);
        // Update monthly aggregates
        const now = usage.timestamp.toDate();
        const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthlyStatsRef = db.doc(`users/${userId}/usage_stats/monthly_${yearMonth}`);
        // Try to update existing document or create if it doesn't exist
        try {
            await db.runTransaction(async (transaction) => {
                const monthlyStatsDoc = await transaction.get(monthlyStatsRef);
                if (monthlyStatsDoc.exists) {
                    // Update existing document
                    transaction.update(monthlyStatsRef, {
                        promptTokens: admin.firestore.FieldValue.increment(usage.promptTokens),
                        completionTokens: admin.firestore.FieldValue.increment(usage.completionTokens),
                        totalTokens: admin.firestore.FieldValue.increment(usage.totalTokens),
                        [`${usage.type}Count`]: admin.firestore.FieldValue.increment(1),
                        [`${usage.type}Tokens`]: admin.firestore.FieldValue.increment(usage.totalTokens),
                        lastUpdated: admin.firestore.Timestamp.now()
                    });
                }
                else {
                    // Create new document
                    const stats = {
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                        totalTokens: usage.totalTokens,
                        month: yearMonth,
                        chatCount: 0,
                        journalCount: 0,
                        summaryCount: 0,
                        ttsCount: 0,
                        chatTokens: 0,
                        journalTokens: 0,
                        summaryTokens: 0,
                        ttsTokens: 0,
                        createdAt: admin.firestore.Timestamp.now(),
                        lastUpdated: admin.firestore.Timestamp.now()
                    };
                    // Increment the specific type count and tokens
                    stats[`${usage.type}Count`] = 1;
                    stats[`${usage.type}Tokens`] = usage.totalTokens;
                    transaction.set(monthlyStatsRef, stats);
                }
            });
        }
        catch (error) {
            console.error('Error updating monthly stats:', error);
            throw error;
        }
        // Update user's total usage
        const userRef = db.doc(`users/${userId}`);
        await userRef.update({
            totalTokensUsed: admin.firestore.FieldValue.increment(usage.totalTokens),
            [`${usage.type}TokensUsed`]: admin.firestore.FieldValue.increment(usage.totalTokens)
        });
    }
    catch (error) {
        console.error('Error recording token usage:', error);
        throw error;
    }
};
exports.recordTokenUsage = recordTokenUsage;
/**
 * Gets a user's token usage for a specific period
 */
const getTokenUsage = async (userId, period, startDate, endDate) => {
    let query;
    // Default end date is now
    const end = endDate || new Date();
    // Default start date depends on period
    let start;
    if (startDate) {
        start = startDate;
    }
    else {
        start = new Date();
        if (period === 'day') {
            start.setHours(0, 0, 0, 0);
        }
        else if (period === 'month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        }
        else if (period === 'year') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
        }
        else {
            // For 'all', set to a very old date
            start = new Date(2020, 0, 1);
        }
    }
    // If checking monthly stats and the start and end are in the same month,
    // we can use the monthly aggregates for efficiency
    if (period === 'month' &&
        start.getMonth() === end.getMonth() &&
        start.getFullYear() === end.getFullYear()) {
        const yearMonth = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthlyStatsRef = db.doc(`users/${userId}/usage_stats/monthly_${yearMonth}`);
        const monthlyStatsDoc = await monthlyStatsRef.get();
        if (monthlyStatsDoc.exists) {
            return monthlyStatsDoc.data();
        }
    }
    // If we need to query individual records
    query = db.collection(`users/${userId}/token_usage`)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(start))
        .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(end));
    const snapshot = await query.get();
    // Aggregate the results
    const result = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        chatTokens: 0,
        journalTokens: 0,
        summaryTokens: 0,
        ttsTokens: 0,
        chatCount: 0,
        journalCount: 0,
        summaryCount: 0,
        ttsCount: 0
    };
    snapshot.forEach(doc => {
        const data = doc.data();
        result.promptTokens += data.promptTokens;
        result.completionTokens += data.completionTokens;
        result.totalTokens += data.totalTokens;
        // Increment type-specific counters
        result[`${data.type}Count`]++;
        result[`${data.type}Tokens`] += data.totalTokens;
    });
    return result;
};
exports.getTokenUsage = getTokenUsage;
/**
 * Tracks an interaction (not token-based)
 */
const recordInteraction = async (userId, type, metadata) => {
    const now = new Date();
    const interactionRef = db.collection(`users/${userId}/interactions`).doc();
    await interactionRef.set({
        type,
        timestamp: admin.firestore.Timestamp.now(),
        metadata: metadata || {}
    });
    // Update user's interaction counts
    const userRef = db.doc(`users/${userId}`);
    await userRef.update({
        [`${type}Count`]: admin.firestore.FieldValue.increment(1),
        lastInteractionAt: admin.firestore.Timestamp.now()
    });
    // Update monthly interaction stats
    const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthlyStatsRef = db.doc(`users/${userId}/interaction_stats/monthly_${yearMonth}`);
    try {
        await db.runTransaction(async (transaction) => {
            const monthlyStatsDoc = await transaction.get(monthlyStatsRef);
            if (monthlyStatsDoc.exists) {
                // Update existing document
                transaction.update(monthlyStatsRef, {
                    [`${type}Count`]: admin.firestore.FieldValue.increment(1),
                    totalCount: admin.firestore.FieldValue.increment(1),
                    lastUpdated: admin.firestore.Timestamp.now()
                });
            }
            else {
                // Create new document
                const stats = {
                    month: yearMonth,
                    chatCount: 0,
                    journalCount: 0,
                    reflectionCount: 0,
                    totalCount: 1,
                    createdAt: admin.firestore.Timestamp.now(),
                    lastUpdated: admin.firestore.Timestamp.now()
                };
                // Set the specific type count
                stats[`${type}Count`] = 1;
                transaction.set(monthlyStatsRef, stats);
            }
        });
    }
    catch (error) {
        console.error('Error updating monthly interaction stats:', error);
        throw error;
    }
};
exports.recordInteraction = recordInteraction;
//# sourceMappingURL=recordTokenUsage.js.map