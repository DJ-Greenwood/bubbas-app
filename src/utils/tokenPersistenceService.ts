// src/utils/tokenPersistenceService.ts
'use client';

import { 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  getDocs,
  Timestamp,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db, auth } from './firebaseClient';

// Define token usage interfaces
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    created?: Timestamp; // Optional, will be set by Firestore
  }
  
  export interface TokenRecord extends TokenUsage {
    timestamp: string;
    journalEntryId?: string | null; // Can be string or null, but not undefined
    chatType: 'emotion' | 'basic' | 'journal' | 'other';
    userPrompt?: string | null; // First ~50 chars of prompt for reference (optional)
    model?: string | null; // Model used
  }

  /**
 * Helper function to remove undefined values from an object before saving to Firestore
 */
const removeUndefinedValues = (obj: Record<string, any>): Record<string, any> => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      // Skip undefined values
      if (value !== undefined) {
        // If value is an object but not null, recursively clean it
        if (value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Timestamp)) {
          acc[key] = removeUndefinedValues(value);
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {} as Record<string, any>);
  };
  
  /**
   * Save token usage to a dedicated collection that won't be affected by journal entry deletion
   */
  export const saveTokenUsage = async (
    usage: TokenUsage,
    chatType: 'emotion' | 'basic' | 'journal' | 'other' = 'other',
    journalEntryId?: string | null,
    userPrompt?: string,
    model?: string
  ): Promise<string | null> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('User not authenticated');
        return null;
      }
  
      const timestamp = new Date().toISOString();
      
      // Prepare token usage record
      const tokenRecord: TokenRecord = {
        ...usage,
        timestamp,
        chatType,
        model: model || process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o"
      };
      
      // Only add journalEntryId if it's not null or undefined
      if (journalEntryId) {
        tokenRecord.journalEntryId = journalEntryId;
      }
      
      // Add truncated prompt if provided
      if (userPrompt) {
        tokenRecord.userPrompt = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : '');
      }
  
      // Clean the record to remove any undefined values
      const cleanRecord = removeUndefinedValues(tokenRecord);
  
      // Save to token_usage collection
      const tokenRef = collection(db, 'users', user.uid, 'token_usage');
      const docRef = await addDoc(tokenRef, {
        ...cleanRecord,
        created: serverTimestamp(),
      });
  
      // Also update aggregated stats document - this is faster to query for dashboards
      await updateAggregatedStats(usage, user.uid);
      
      return docRef.id;
    } catch (error) {
      console.error('Error saving token usage:', error);
      return null;
    }
  };

/**
 * Update aggregated token usage stats for faster dashboard queries
 */
const updateAggregatedStats = async (usage: TokenUsage, userId: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM
    
    const statsRef = doc(db, 'users', userId, 'stats', 'token_usage');
    
    try {
      // First check if the document exists
      const statsDoc = await getDoc(statsRef);
      
      if (!statsDoc.exists()) {
        // Create new stats document if it doesn't exist
        await setDoc(statsRef, {
          daily: {
            [today]: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              count: 1,
              lastUpdated: now.toISOString()
            }
          },
          monthly: {
            [currentMonth]: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              count: 1,
              lastUpdated: now.toISOString()
            }
          },
          lifetime: {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            count: 1,
            lastUpdated: now.toISOString()
          }
        });
      } else {
        // Update existing stats document with increments
        // First create the update object
        const updateData: Record<string, any> = {
          [`daily.${today}.promptTokens`]: increment(usage.promptTokens),
          [`daily.${today}.completionTokens`]: increment(usage.completionTokens),
          [`daily.${today}.totalTokens`]: increment(usage.totalTokens),
          [`daily.${today}.count`]: increment(1),
          [`daily.${today}.lastUpdated`]: now.toISOString(),
          
          [`monthly.${currentMonth}.promptTokens`]: increment(usage.promptTokens),
          [`monthly.${currentMonth}.completionTokens`]: increment(usage.completionTokens),
          [`monthly.${currentMonth}.totalTokens`]: increment(usage.totalTokens),
          [`monthly.${currentMonth}.count`]: increment(1),
          [`monthly.${currentMonth}.lastUpdated`]: now.toISOString(),
          
          'lifetime.promptTokens': increment(usage.promptTokens),
          'lifetime.completionTokens': increment(usage.completionTokens),
          'lifetime.totalTokens': increment(usage.totalTokens),
          'lifetime.count': increment(1),
          'lifetime.lastUpdated': now.toISOString()
        };
        
        // Check if the daily and monthly objects exist first
        const statsData = statsDoc.data();
        if (!statsData.daily) {
          updateData.daily = {
            [today]: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              count: 1,
              lastUpdated: now.toISOString()
            }
          };
        } else if (!statsData.daily[today]) {
          updateData[`daily.${today}`] = {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            count: 1,
            lastUpdated: now.toISOString()
          };
        }
        
        if (!statsData.monthly) {
          updateData.monthly = {
            [currentMonth]: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              count: 1,
              lastUpdated: now.toISOString()
            }
          };
        } else if (!statsData.monthly[currentMonth]) {
          updateData[`monthly.${currentMonth}`] = {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            count: 1,
            lastUpdated: now.toISOString()
          };
        }
        
        if (!statsData.lifetime) {
          updateData.lifetime = {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            count: 1,
            lastUpdated: now.toISOString()
          };
        }
        
        // Now update the document with the prepared data
        await updateDoc(statsRef, updateData);
      }
    } catch (error) {
      console.error('Error updating aggregated stats:', error);
      // If the error is about a missing document, try to create it
      if (error instanceof Error && error.message.includes('No document to update')) {
        try {
          await setDoc(statsRef, {
            daily: {
              [today]: {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
                count: 1,
                lastUpdated: now.toISOString()
              }
            },
            monthly: {
              [currentMonth]: {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
                count: 1,
                lastUpdated: now.toISOString()
              }
            },
            lifetime: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              count: 1,
              lastUpdated: now.toISOString()
            }
          });
        } catch (setDocError) {
          console.error('Error creating stats document:', setDocError);
        }
      }
    }
  };
/**
 * Get token usage history for a specific time period
 */
export const getTokenUsageHistory = async (
  period: 'day' | 'week' | 'month' | 'all' = 'all'
): Promise<TokenRecord[]> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      return [];
    }

    const tokenRef = collection(db, 'users', user.uid, 'token_usage');
    let tokenQuery: any;

    if (period === 'day') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      tokenQuery = query(
        tokenRef,
        where('created', '>=', today),
        orderBy('created', 'desc')
      );
    } else if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      tokenQuery = query(
        tokenRef,
        where('created', '>=', weekAgo),
        orderBy('created', 'desc')
      );
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      tokenQuery = query(
        tokenRef,
        where('created', '>=', monthAgo),
        orderBy('created', 'desc')
      );
    } else {
      // All time, but still sorted by most recent first
      tokenQuery = query(tokenRef, orderBy('created', 'desc'));
    }

    const querySnapshot = await getDocs(tokenQuery);
    
    const tokenRecords: TokenRecord[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as TokenRecord;
      
      // Convert Firestore Timestamp to string
      let timestamp = data.timestamp || '';
      if (data.created instanceof Timestamp) {
        timestamp = data.created.toDate().toISOString();
      }
      
      tokenRecords.push({
        promptTokens: data.promptTokens || 0,
        completionTokens: data.completionTokens || 0,
        totalTokens: data.totalTokens || 0,
        timestamp,
        journalEntryId: data.journalEntryId,
        chatType: data.chatType || 'other',
        userPrompt: data.userPrompt,
        model: data.model
      });
    });

    return tokenRecords;
  } catch (error) {
    console.error('Error getting token usage history:', error);
    return [];
  }
};

/**
 * Get aggregated token usage statistics
 */
export const getAggregatedTokenStats = async (): Promise<{
  daily: Record<string, any>;
  monthly: Record<string, any>;
  lifetime: TokenUsage & { count: number };
}> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM

    const statsRef = doc(db, 'users', user.uid, 'stats', 'token_usage');
    const statsDoc = await getDoc(statsRef);

    if (!statsDoc.exists()) {
      // Create new stats document if it doesn't exist
      await setDoc(statsRef, {
        daily: {
          [today]: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            count: 0,
            lastUpdated: now.toISOString()
          }
        },
        monthly: {
          [currentMonth]: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            count: 0,
            lastUpdated: now.toISOString()
          }
        },
        lifetime: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          count: 0,
          lastUpdated: now.toISOString()
        }
      });
    }

    const statsData = statsDoc.data() || {};
    return {
      daily: statsData.daily || {},
      monthly: statsData.monthly || {},
      lifetime: {
        promptTokens: statsData.lifetime?.promptTokens || 0,
        completionTokens: statsData.lifetime?.completionTokens || 0,
        totalTokens: statsData.lifetime?.totalTokens || 0,
        count: statsData.lifetime?.count || 0
      }
    };
  } catch (error) {
    console.error('Error getting aggregated token stats:', error);
    throw error;
  }
};
