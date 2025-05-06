// src/utils/firebaseDataService.ts
import { db, auth } from './firebaseClient'; // assumes firebase is initialized
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs, query, where, 
  orderBy, increment, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { encryptField, decryptField, getPassPhrase } from './encryption';
import { JournalEntry } from '@/types/JournalEntry';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { EmotionCharacterKey } from '@/types/emotionCharacters';
import { time } from 'console';

// Helper function to get current user UID
export const getCurrentUserUid = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
};

// Helper Function to create a unique ID for journal entries
export const createUniqueId = (): string => {
  return new Date().toISOString(); // Use ISO string as unique ID
};

// Helper function to remove undefined values from an object before saving to Firestore
export const removeUndefinedValues = (obj: Record<string, any>): Record<string, any> => {
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

//------------------------------------------------------------------------------
// User Document Operations
//------------------------------------------------------------------------------

// Get user document data
export const getUserDoc = async (userId: string) => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

// Update user document data
export const updateUserDoc = async (userId: string, data: any) => {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, data);
};

// Get user's emotion character set preference
export const getUserEmotionCharacterSet = async (): Promise<EmotionCharacterKey | null> => {
  try {
    const uid = getCurrentUserUid();
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return userData?.preferences?.emotionCharacterSet || 'Bubba'; // Default to 'Bubba' if not set
    }
    
    return 'Bubba'; // Default character set
  } catch (error) {
    console.error("Failed to fetch emotion character set:", error);
    return 'Bubba'; // Default on error
  }
};

//------------------------------------------------------------------------------
// Journal Entry Operations
//------------------------------------------------------------------------------

// Save a new journal entry
export const saveJournalEntry = async (
  userText: string,
  bubbaReply: string,
  detectedEmotionText: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
) => {
  const uid = getCurrentUserUid();
  const now = new Date();
  const timestamp = now.toISOString();

  const encryptedUserText = await encryptField(userText);
  const encryptedBubbaReply = await encryptField(bubbaReply);
  const emotion = await detectEmotion(detectedEmotionText);
  
  // Get the current character set from user preferences
  const characterSet = await getUserEmotionCharacterSet();

  const newEntry: JournalEntry = {
    version: 1,
    createdAt: timestamp,
    timestamp,
    emotion,
    encryptedUserText,
    encryptedBubbaReply,
    detectedEmotionText,
    deleted: false,
    usage: {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    },
    status: 'active',
    lastEdited: '',
    lastEditedBy: '',
    // Add the character set to the journal entry
    emotionCharacterSet: characterSet || 'Bubba'
  };

  const entryId = createUniqueId(); // Create a unique ID for the entry
  
  if (!uid) {
      throw new Error('User UID is undefined');
  }
  const ref = doc(db, 'users', uid, 'journal', entryId, 'entries');
  
  await setDoc(doc(ref, timestamp), newEntry);
  
  // Make sure token usage is saved separately as well for billing persistence
  await saveTokenUsage(
    usage,
    'journal',
    timestamp, // Use timestamp as journal entry ID
    userText.substring(0, 50) + (userText.length > 50 ? '...' : '') // Include truncated prompt
  );
  
  console.log('✅ Saved journal entry!');
  return { id: timestamp, ...newEntry };
};

// Edit a journal entry
export const editJournalEntry = async (
  entryId: string,
  newUserText: string,
  uid?: string
) => {
  try {
    const userUID = uid || getCurrentUserUid();
    if (!uid) {
        throw new Error('User UID is undefined');
    }
    const ref = doc(db, 'users', uid, 'journal', entryId, 'entries');
    const docSnap = await getDoc(ref);
    
    if (!docSnap.exists()) {
      throw new Error('Journal entry not found');
    }
    
    const encryptedUserText = await encryptField(newUserText);
    const emotion = await detectEmotion(newUserText);
    
    await updateDoc(ref, {
      encryptedUserText,
      emotion,
      lastEdited: new Date().toISOString(),
      lastEditedBy: userUID
    });
    
    return true;
  } catch (error) {
    console.error('Error editing journal entry:', error);
    throw error;
  }
};

// Load journal entries by status (active or trash)
export const getJournalEntries = async (
  status: 'active' | 'trash' = 'active',
  
) => {
  try {
    const entryId = createUniqueId(); // Create a unique ID for the entry
    const entriesRef = collection(db, 'journals', entryId, 'entries');
    const q = query(
      entriesRef,
      where('status', '==', status),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`No ${status} entries found`);
      return [];
    }
    
    const entries: JournalEntry[] = [];
    
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data() as JournalEntry;
        
        // Only process entries with the correct status
        if (data.status !== status) continue;
        
        // For backward compatibility - if emotionCharacterSet is missing, use 'Bubba'
        if (!data.emotionCharacterSet) {
          data.emotionCharacterSet = 'Bubba';
        }
        
        entries.push({
          ...data,
          timestamp: doc.id // Use doc ID as timestamp
        });
      } catch (error) {
        console.error(`Error processing document ${doc.id}:`, error);
      }
    }
    
    return entries;
  } catch (error) {
    console.error('Error getting journal entries:', error);
    return [];
  }
};

// Soft delete journal entry (move to trash)
export const softDeleteJournalEntry = async (
  entryId: string,
  uid?: string
) => {
  try {
    const userUID = uid || getCurrentUserUid();
    const ref = doc(db, 'journals', userUID, 'entries', entryId);
    const docSnap = await getDoc(ref);
    
    if (!docSnap.exists()) {
      throw new Error('Journal entry not found');
    }
    
    await updateDoc(ref, { 
      status: 'trash',
      deleted: true,
      deletedAt: new Date().toISOString()
    });
    
    console.log('✅ Journal entry moved to trash');
    return true;
  } catch (error) {
    console.error('Error soft-deleting journal entry:', error);
    throw error;
  }
};

// Recover journal entry from trash
export const recoverJournalEntry = async (
  entryId: string,
  uid?: string
) => {
  try {
    const userUID = uid || getCurrentUserUid();
    const ref = doc(db, 'journals', userUID, 'entries', entryId);
    await updateDoc(ref, { 
      status: 'active',
      deleted: false,
      recoveredAt: new Date().toISOString()
    });
    
    console.log('✅ Journal entry recovered');
    return true;
  } catch (error) {
    console.error('Error recovering journal entry:', error);
    throw error;
  }
};

// Hard delete journal entry
export const hardDeleteJournalEntry = async (
  entryId: string,
  uid?: string
) => {
  try {
    const userUID = uid || getCurrentUserUid();
    const ref = doc(db, 'journals', userUID, 'entries', entryId);
    const entryDoc = await getDoc(ref);
    
    if (!entryDoc.exists()) {
      throw new Error('Journal entry not found');
    }
    
    // Then delete the journal entry
    await deleteDoc(ref);
    
    // Note: We do NOT delete the token usage record - it stays for billing/analytics
    
    console.log('✅ Journal entry permanently deleted (token usage records preserved)');
    return true;
  } catch (error) {
    console.error('Error permanently deleting journal entry:', error);
    throw error;
  }
};

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

//-------------------------------------------------------------------------------
// Token Usage Operations (continued)
//-------------------------------------------------------------------------------
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

// Get token usage summary for display on profile
export const getTokenUsageSummary = async (): Promise<{
  daily: { used: number; limit: number; percent: number };
  monthly: { used: number; limit: number; percent: number };
  lifetime: number;
}> => {
  try {
    const stats = await getTokenUsageStats();
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    
    const dailyUsed = stats.daily[today]?.count || 0;
    const monthlyUsed = stats.monthly[currentMonth]?.totalTokens || 0;
    const lifetimeTokens = stats.lifetime.totalTokens || 0;
    
    return {
      daily: {
        used: dailyUsed,
        limit: stats.limits.dailyLimit,
        percent: Math.min(100, Math.round((dailyUsed / stats.limits.dailyLimit) * 100) || 0)
      },
      monthly: {
        used: monthlyUsed,
        limit: stats.limits.monthlyLimit,
        percent: Math.min(100, Math.round((monthlyUsed / stats.limits.monthlyLimit) * 100) || 0)
      },
      lifetime: lifetimeTokens
    };
  } catch (error) {
    console.error('Error getting usage summary:', error);
    return {
      daily: { used: 0, limit: 0, percent: 0 },
      monthly: { used: 0, limit: 0, percent: 0 },
      lifetime: 0
    };
  }
};

//------------------------------------------------------------------------------
// Backwards Compatibility Functions
//------------------------------------------------------------------------------

// For backwards compatibility with older code
export const saveConversation = saveJournalEntry;
export const loadConversation = getJournalEntries;
export const editConversation = editJournalEntry;
export const softDeleteConversation = softDeleteJournalEntry;
export const recoverConversation = recoverJournalEntry;
export const hardDeleteConversation = hardDeleteJournalEntry;