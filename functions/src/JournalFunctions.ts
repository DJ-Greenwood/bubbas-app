import { onCall } from "firebase-functions/v2/https";
import { CallableRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { Emotion, EmotionCharacterKey } from "./types/emotionTypes";


// Initialize Firebase app if not already initialized
if (!getApps().length) {
  console.log("Initializing Firebase Admin app...");
  initializeApp();
}

// Get Firestore instance
const db = getFirestore();
const auth = getAuth();

// Helper function to remove undefined values from an object before saving to Firestore
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

// Helper function to verify user authentication
const verifyAuth = (request: CallableRequest<any>, userId?: string): string => {
  // Check if the request is authenticated
  if (!request.auth) {
    throw new Error("Authentication required for this operation");
  }
  
  // If userId is provided, check if it matches the authenticated user
  if (userId && userId !== request.auth.uid) {
    throw new Error("Operation not permitted - user ID mismatch");
  }
  
  return request.auth.uid;
};

//------------------------------------------------------------------------------
// User Document Operations
//------------------------------------------------------------------------------

// Get user document data
export const getUserDoc = onCall(async (request: CallableRequest<{ userId?: string }>) => {
  try {
    const { userId } = request.data || {};
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const effectiveUserId = userId || authenticatedUserId;
    
    const ref = db.collection('users').doc(effectiveUserId);
    const snap = await ref.get();
    
    if (!snap.exists) {
      return { exists: false, data: null };
    }
    
    return { exists: true, data: snap.data() };
  } catch (error) {
    console.error("Error in getUserDoc:", error);
    throw new Error(`Failed to get user document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Update user document data
export const updateUserDoc = onCall(async (request: CallableRequest<{ userId?: string; data: any }>) => {
  try {
    const { userId, data } = request.data;
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const effectiveUserId = userId || authenticatedUserId;
    
    // Remove undefined values
    const cleanedData = removeUndefinedValues(data);
    
    // Add update timestamp
    cleanedData.updatedAt = FieldValue.serverTimestamp();
    
    const ref = db.collection('users').doc(effectiveUserId);
    await ref.update(cleanedData);
    
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserDoc:", error);
    throw new Error(`Failed to update user document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Get user's emotion character set preference
export const getUserEmotionCharacterSet = onCall(async (request: CallableRequest<{ userId?: string }>) => {
  try {
    const { userId } = request.data || {};
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const effectiveUserId = userId || authenticatedUserId;
    
    const userDocRef = db.collection('users').doc(effectiveUserId);
    const userDocSnap = await userDocRef.get();
    
    if (userDocSnap.exists) {
      const userData = userDocSnap.data();
      return userData?.preferences?.emotionCharacterSet || 'Bubba'; // Default to 'Bubba' if not set
    }
    
    return 'Bubba'; // Default character set
  } catch (error) {
    console.error("Error in getUserEmotionCharacterSet:", error);
    return 'Bubba'; // Default on error
  }
});

//------------------------------------------------------------------------------
// Journal Entry Operations
//------------------------------------------------------------------------------

// Save a new journal entry
export const saveJournalEntry = onCall(async (request: CallableRequest<{
  userId?: string;
  encryptedUserText: string;  // Already encrypted on client
  encryptedBubbaReply: string;  // Already encrypted on client
  emotion: Emotion;  // Already detected on client
  detectedEmotionText?: string;  // Optional raw text used for emotion detection
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}>) => {
  try {
    const { 
      userId, 
      encryptedUserText, 
      encryptedBubbaReply, 
      emotion, 
      detectedEmotionText, 
      usage 
    } = request.data;
    
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const uid = userId || authenticatedUserId;
    
    const now = new Date();
    const timestamp = now.toISOString();
    
    // Get the current character set from user preferences
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();
    const userData = userDocSnap.exists ? userDocSnap.data() : null;
    const characterSet = userData?.preferences?.emotionCharacterSet || 'Bubba';
    
    const newEntry = {
      version: 1,
      createdAt: timestamp,
      timestamp,
      emotion,
      encryptedUserText,  // Store pre-encrypted data
      encryptedBubbaReply,  // Store pre-encrypted data
      detectedEmotionText: detectedEmotionText || '',
      deleted: false,
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
      status: 'active',
      lastEdited: '',
      lastEditedBy: '',
      emotionCharacterSet: characterSet || 'Bubba',
      serverTimestamp: FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    const journalRef = db.collection('users').doc(uid).collection('journal').doc(timestamp);
    await journalRef.set(newEntry);
    
    // Save token usage record
    const tokenUsageRef = db.collection('tokenUsage').doc();
    await tokenUsageRef.set({
      userId: uid,
      tokens: usage.totalTokens,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      timestamp,
      source: 'journal',
      preview: detectedEmotionText ? detectedEmotionText.substring(0, 50) + (detectedEmotionText.length > 50 ? '...' : '') : '[Encrypted]',
      createdAt: FieldValue.serverTimestamp()
    });
    
    console.log('✅ Saved journal entry for user:', uid);
    return { success: true, id: timestamp, entry: newEntry };
  } catch (error) {
    console.error('❌ Error saving journal entry:', error);
    throw new Error(`Failed to save journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Edit a journal entry
export const editJournalEntry = onCall(async (request: CallableRequest<{
  userId?: string;
  entryId: string;
  encryptedUserText: string;  // Already encrypted on client
  emotion: Emotion;  // Already detected on client
}>) => {
  try {
    const { userId, entryId, encryptedUserText, emotion } = request.data;
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const uid = userId || authenticatedUserId;
    
    // Get the entry
    const ref = db.collection('users').doc(uid).collection('journal').doc(entryId);
    const docSnap = await ref.get();
    
    if (!docSnap.exists) {
      throw new Error('Journal entry not found');
    }
    
    // Update the entry
    await ref.update({
      encryptedUserText,  // Store pre-encrypted data
      emotion,
      lastEdited: new Date().toISOString(),
      lastEditedBy: uid,
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error editing journal entry:', error);
    throw new Error(`Failed to edit journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Get journal entries
export const getJournalEntries = onCall(async (request: CallableRequest<{
  userId?: string;
  status?: 'active' | 'trash';
  limit?: number;
}>) => {
  try {
    const { userId, status = 'active', limit = 100 } = request.data || {};
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const uid = userId || authenticatedUserId;
    
    // Get journal entries
    let journalQuery = db.collection('users').doc(uid).collection('journal')
      .where('status', '==', status)
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    const journalSnapshot = await journalQuery.get();
    
    if (journalSnapshot.empty) {
      return { entries: [] };
    }
    
    // Process entries - returning encrypted data to client for decryption
    const entries = journalSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // For backward compatibility - if emotionCharacterSet is missing, use 'Bubba'
      if (!data.emotionCharacterSet) {
        data.emotionCharacterSet = 'Bubba';
      }
      
      return {
        ...data,
        timestamp: doc.id // Use doc ID as timestamp
      };
    });
    
    return { entries };
  } catch (error) {
    console.error('Error getting journal entries:', error);
    throw new Error(`Failed to get journal entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Soft delete journal entry (move to trash)
export const softDeleteJournalEntry = onCall(async (request: CallableRequest<{
  userId?: string;
  entryId: string;
}>) => {
  try {
    const { userId, entryId } = request.data;
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const uid = userId || authenticatedUserId;
    
    // Get the entry
    const ref = db.collection('users').doc(uid).collection('journal').doc(entryId);
    const docSnap = await ref.get();
    
    if (!docSnap.exists) {
      throw new Error('Journal entry not found');
    }
    
    // Update the entry
    await ref.update({ 
      status: 'trash',
      deleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error soft-deleting journal entry:', error);
    throw new Error(`Failed to soft-delete journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Recover journal entry from trash
export const recoverJournalEntry = onCall(async (request: CallableRequest<{
  userId?: string;
  entryId: string;
}>) => {
  try {
    const { userId, entryId } = request.data;
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const uid = userId || authenticatedUserId;
    
    // Get the entry
    const ref = db.collection('users').doc(uid).collection('journal').doc(entryId);
    const docSnap = await ref.get();
    
    if (!docSnap.exists) {
      throw new Error('Journal entry not found');
    }
    
    // Update the entry
    await ref.update({ 
      status: 'active',
      deleted: false,
      recoveredAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error recovering journal entry:', error);
    throw new Error(`Failed to recover journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Hard delete journal entry
export const hardDeleteJournalEntry = onCall(async (request: CallableRequest<{
  userId?: string;
  entryId: string;
}>) => {
  try {
    const { userId, entryId } = request.data;
    const authenticatedUserId = verifyAuth(request, userId);
    
    // Use the verified user ID
    const uid = userId || authenticatedUserId;
    
    // Get the entry
    const ref = db.collection('users').doc(uid).collection('journal').doc(entryId);
    const entryDoc = await ref.get();
    
    if (!entryDoc.exists) {
      throw new Error('Journal entry not found');
    }
    
    // Delete the entry document
    await ref.delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting journal entry:', error);
    throw new Error(`Failed to permanently delete journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Export all functions at once
export const journalFunctions = {
  getUserDoc,
  updateUserDoc,
  getUserEmotionCharacterSet,
  saveJournalEntry,
  editJournalEntry,
  getJournalEntries,
  softDeleteJournalEntry,
  recoverJournalEntry,
  hardDeleteJournalEntry
};