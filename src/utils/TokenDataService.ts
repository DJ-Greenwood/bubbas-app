// src/utils/firebaseDataService.ts
import { db, auth } from './firebaseClient'; // assumes firebase is initialized
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs, query, where, 
  orderBy, increment, serverTimestamp, Timestamp, limit as firestoreLimit, startAfter as firestoreStartAfter
} from 'firebase/firestore';
import { removeUndefinedValues, getCurrentUserUid } from './firebaseDataService';
import { encryptField, decryptField, getPassPhrase } from './encryption';
import { JournalEntry } from '@/types/JournalEntry';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

//------------------------------------------------------------------------------
// Token Usage Operations
//------------------------------------------------------------------------------

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
  
  // Save token usage
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
  
  // Update aggregated token usage stats
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
  
  // Check if the user has exceeded their limits for the current period
  export const checkTokenLimits = async (): Promise<{
    canUseService: boolean;
    message?: string;
    limits?: {
      dailyRemaining: number;
      monthlyRemaining: number;
      dailyLimit: number;
      monthlyLimit: number;
    };
  }> => {
    try {
      const stats = await getTokenUsageStats();
      const { limits } = stats;
      
      // Check if daily limit is exceeded
      if (limits.dailyRemaining <= 0) {
        return {
          canUseService: false,
          message: `You've reached your daily chat limit. This will reset at midnight.`,
          limits
        };
      }
      
      // Check if monthly token limit is exceeded
      if (limits.monthlyRemaining <= 0) {
        return {
          canUseService: false,
          message: `You've reached your monthly token limit. Consider upgrading your plan for more tokens.`,
          limits
        };
      }
      
      return {
        canUseService: true,
        limits
      };
    } catch (error) {
      console.error('Error checking token limits:', error);
      // Default to allowing service on error
      return { canUseService: true };
    }
  };
  
  // Get token usage statistics
  export const getTokenUsageStats = async (): Promise<{
    daily: Record<string, any>;
    monthly: Record<string, any>;
    lifetime: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      count: number;
    };
    limits: {
      dailyRemaining: number;
      monthlyRemaining: number;
      dailyUsed: number;
      monthlyUsed: number;
      dailyLimit: number;
      monthlyLimit: number;
    };
  }> => {
    // Implementation would be similar to the one in tokenTrackingService.ts
    // ... (existing implementation)
    return {
      daily: {},
      monthly: {},
      lifetime: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        count: 0
      },
      limits: {
        dailyRemaining: 0,
        monthlyRemaining: 0, 
        dailyUsed: 0,
        monthlyUsed: 0,
        dailyLimit: 0,
        monthlyLimit: 0
      }
    };
  };
  
  export const getTokenUsageSummary = async (): Promise<{
    daily: Record<string, any>;
    monthly: Record<string, any>;
    lifetime: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      count: number;
    };
  }> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const statsRef = doc(db, 'users', user.uid, 'stats', 'token_usage');
      const statsDoc = await getDoc(statsRef);
      
      if (!statsDoc.exists()) {
        throw new Error('Token usage stats not found');
      }
      
      return statsDoc.data() as any; // Cast to appropriate type
    } catch (error) {
      console.error('Error getting token usage summary:', error);
      throw error;
    }
  }
  
  //------------------------------------------------------------------------------
  // Token Usage History and Stats Functions
  //------------------------------------------------------------------------------
  
  /**
   * Get the user's token usage history with optional filtering and pagination
   * 
   * @param options.limit - Maximum number of records to return (default: 50)
   * @param options.startAfter - Timestamp to start after for pagination
   * @param options.chatType - Filter by chat type (emotion, basic, journal, other)
   * @param options.startDate - Filter for entries after this date
   * @param options.endDate - Filter for entries before this date
   * @param options.uid - Optional user ID, defaults to current user
   * @returns Promise with token usage history records
   */
  export const getTokenUsageHistory = async (options: {
    limit?: number;
    startAfter?: string; 
    chatType?: 'emotion' | 'basic' | 'journal' | 'other';
    startDate?: Date;
    endDate?: Date;
    uid?: string;
  } = {}): Promise<TokenRecord[]> => {
    try {
      const {
        limit = 50,
        startAfter,
        chatType,
        startDate,
        endDate,
        uid,
      } = options;
      
      const userUID = uid || getCurrentUserUid();
      const tokenUsageRef = collection(db, 'users', userUID, 'token_usage');
      
      // Build query with filters
      const maxLimit = 50; // Define a numeric value for maxLimit
      let tokenQuery: any = query(tokenUsageRef, orderBy('timestamp', 'desc'), firestoreLimit(maxLimit));
      
      // Add chat type filter if specified
      if (chatType) {
        tokenQuery = query(tokenQuery, where('chatType', '==', chatType));
      }
      
      // Add date range filters if specified
      if (startDate) {
        const startTimestamp = startDate.toISOString();
        tokenQuery = query(tokenQuery, where('timestamp', '>=', startTimestamp));
      }
      
      if (endDate) {
        const endTimestamp = endDate.toISOString();
        tokenQuery = query(tokenQuery, where('timestamp', '<=', endTimestamp));
      }
      
      // Add pagination if startAfter is provided
      if (startAfter) {
        // Get the document to start after
        const startAfterDocRef = doc(db, 'users', userUID, 'token_usage', startAfter);
        const startAfterDoc = await getDoc(startAfterDocRef);
        
        if (startAfterDoc.exists()) {
          tokenQuery = query(tokenQuery, firestoreStartAfter(startAfterDoc)); // Ensure startAfter is imported correctly
        }
      }
      
      // Execute the query
      const snapshot = await getDocs(tokenQuery);
      
      if (snapshot.empty) {
        return [];
      }
      
      // Map documents to TokenRecord objects
      const records: TokenRecord[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as TokenRecord;
        records.push({
          ...data,
          id: doc.id, // Add document ID to the record
        } as any);
      });
      
      return records;
    } catch (error) {
      console.error('Error getting token usage history:', error);
      throw error;
    }
  };
  
  /**
   * Get aggregated token usage statistics for different time periods
   * 
   * @param options.timeframe - Time period to aggregate (daily, monthly, yearly, all)
   * @param options.startDate - Start date for custom time range
   * @param options.endDate - End date for custom time range
   * @param options.chatType - Filter by chat type
   * @param options.uid - Optional user ID, defaults to current user
   * @returns Promise with aggregated token statistics
   */
  export const getAggregatedTokenStats = async (options: {
    timeframe?: 'daily' | 'monthly' | 'yearly' | 'all';
    startDate?: Date;
    endDate?: Date;
    chatType?: 'emotion' | 'basic' | 'journal' | 'other';
    uid?: string;
  } = {}): Promise<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    count: number;
    averagePerInteraction: number;
    timeframe: string;
    chatType?: string;
  }> => {
    try {
      const {
        timeframe = 'all',
        startDate,
        endDate,
        chatType,
        uid,
      } = options;
      
      const userUID = uid || getCurrentUserUid();
      
      // For 'all' timeframe with no filters, we can use the aggregated stats
      if (timeframe === 'all' && !startDate && !endDate && !chatType) {
        try {
          const statsRef = doc(db, 'users', userUID, 'stats', 'token_usage');
          const statsDoc = await getDoc(statsRef);
          
          if (statsDoc.exists()) {
            const data = statsDoc.data();
            const lifetime = data.lifetime || {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              count: 0
            };
            
            return {
              promptTokens: lifetime.promptTokens || 0,
              completionTokens: lifetime.completionTokens || 0,
              totalTokens: lifetime.totalTokens || 0,
              count: lifetime.count || 0,
              averagePerInteraction: lifetime.count > 0 ? lifetime.totalTokens / lifetime.count : 0,
              timeframe: 'all'
            };
          }
        } catch (error) {
          console.warn('Error getting aggregated stats, falling back to manual calculation:', error);
          // Continue to manual calculation as fallback
        }
      }
      
      // For specific timeframes or with filters, we need to calculate manually
      const tokenUsageRef = collection(db, 'users', userUID, 'token_usage');
      
      // Determine date range based on timeframe
      let queryStartDate: Date | undefined = startDate;
      let queryEndDate: Date | undefined = endDate;
      
      if (!startDate) {
        const now = new Date();
        
        switch (timeframe) {
          case 'daily':
            // Start of current day
            queryStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'monthly':
            // Start of current month
            queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'yearly':
            // Start of current year
            queryStartDate = new Date(now.getFullYear(), 0, 1);
            break;
          // For 'all', leave queryStartDate undefined
        }
      }
      
      // Build query with filters
      let tokenQuery: any = query(tokenUsageRef);
      
      // Add chat type filter if specified
      if (chatType) {
        tokenQuery = query(tokenQuery, where('chatType', '==', chatType));
      }
      
      // Add date range filters
      if (queryStartDate) {
        const startTimestamp = queryStartDate.toISOString();
        tokenQuery = query(tokenQuery, where('timestamp', '>=', startTimestamp));
      }
      
      if (queryEndDate) {
        const endTimestamp = queryEndDate.toISOString();
        tokenQuery = query(tokenQuery, where('timestamp', '<=', endTimestamp));
      }
      
      // Execute the query
      const snapshot = await getDocs(tokenQuery);
      
      if (snapshot.empty) {
        return {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          count: 0,
          averagePerInteraction: 0,
          timeframe,
          chatType
        };
      }
      
      // Aggregate the data
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalTokensCount = 0;
      let recordCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data() as TokenRecord;
        totalPromptTokens += data.promptTokens || 0;
        totalCompletionTokens += data.completionTokens || 0;
        totalTokensCount += data.totalTokens || 0;
        recordCount++;
      });
      
      // Calculate average tokens per interaction
      const averagePerInteraction = recordCount > 0 ? totalTokensCount / recordCount : 0;
      
      return {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalTokensCount,
        count: recordCount,
        averagePerInteraction,
        timeframe,
        chatType
      };
    } catch (error) {
      console.error('Error getting aggregated token stats:', error);
      throw error;
    }
  };