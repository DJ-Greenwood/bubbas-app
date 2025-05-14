// src/recordTokenUsage.ts
import * as admin from 'firebase-admin';

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelUsed: string;
  type: 'chat' | 'journal' | 'summary' | 'tts';
  timestamp: admin.firestore.Timestamp;
}

/**
 * Records token usage for a user
 */
export const recordTokenUsage = async (
  userId: string,
  usage: TokenUsage
): Promise<void> => {
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
        } else {
          // Create new document
          const stats: Record<string, any> = {
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
    } catch (error) {
      console.error('Error updating monthly stats:', error);
      throw error;
    }
    
    // Update user's total usage
    const userRef = db.doc(`users/${userId}`);
    await userRef.update({
      totalTokensUsed: admin.firestore.FieldValue.increment(usage.totalTokens),
      [`${usage.type}TokensUsed`]: admin.firestore.FieldValue.increment(usage.totalTokens)
    });
    
  } catch (error) {
    console.error('Error recording token usage:', error);
    throw error;
  }
};

/**
 * Gets a user's token usage for a specific period
 */
export const getTokenUsage = async (
  userId: string,
  period: 'day' | 'month' | 'year' | 'all',
  startDate?: Date,
  endDate?: Date
): Promise<{
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  chatTokens: number;
  journalTokens: number;
  summaryTokens: number;
  ttsTokens: number;
  chatCount: number;
  journalCount: number;
  summaryCount: number;
  ttsCount: number;
}> => {
  let query;
  
  // Default end date is now
  const end = endDate || new Date();
  
  // Default start date depends on period
  let start;
  if (startDate) {
    start = startDate;
  } else {
    start = new Date();
    if (period === 'day') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    } else {
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
      return monthlyStatsDoc.data() as any;
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
    const data = doc.data() as TokenUsage;
    result.promptTokens += data.promptTokens;
    result.completionTokens += data.completionTokens;
    result.totalTokens += data.totalTokens;
    
    // Increment type-specific counters
    result[`${data.type}Count`]++;
    result[`${data.type}Tokens`] += data.totalTokens;
  });
  
  return result;
};

/**
 * Tracks an interaction (not token-based)
 */
export const recordInteraction = async (
  userId: string,
  type: 'chat' | 'journal' | 'reflection',
  metadata?: Record<string, any>
): Promise<void> => {
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
      } else {
        // Create new document
        const stats: Record<string, any> = {
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
  } catch (error) {
    console.error('Error updating monthly interaction stats:', error);
    throw error;
  }
};