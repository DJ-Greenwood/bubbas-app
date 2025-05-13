'use client';

// src/utils/journalService.ts - Client-side adapter for Firebase Functions
import { functions } from './firebaseClient';
import { httpsCallable } from "firebase/functions";
import { JournalEntry } from '@/types/JournalEntry';
import { encryptField, decryptData } from './encryption';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { Emotion } from '@/components/emotion/emotionAssets';

// Connect to Firebase Functions
const callGetUserDoc = httpsCallable(functions, "getUserDoc");
const callUpdateUserDoc = httpsCallable(functions, "updateUserDoc");
const callGetUserEmotionCharacterSet = httpsCallable(functions, "getUserEmotionCharacterSet");
const callSaveJournalEntry = httpsCallable(functions, "saveJournalEntry");
const callEditJournalEntry = httpsCallable(functions, "editJournalEntry");
const callGetJournalEntries = httpsCallable(functions, "getJournalEntries");
const callSoftDeleteJournalEntry = httpsCallable(functions, "softDeleteJournalEntry");
const callRecoverJournalEntry = httpsCallable(functions, "recoverJournalEntry");
const callHardDeleteJournalEntry = httpsCallable(functions, "hardDeleteJournalEntry");

// Helper function for typescript casting
function typedResult<T>(result: any): T {
  return result as T;
}

//------------------------------------------------------------------------------
// User Document Operations
//------------------------------------------------------------------------------

// Get user document data
export const getUserDoc = async (userId?: string) => {
  try {
    const result = await callGetUserDoc({ userId });
    return typedResult<{ exists: boolean, data: any }>(result.data);
  } catch (error) {
    console.error("Error in getUserDoc:", error);
    throw error;
  }
};

// Update user document data
export const updateUserDoc = async (data: any, userId?: string) => {
  try {
    const result = await callUpdateUserDoc({ userId, data });
    return typedResult<{ success: boolean }>(result.data);
  } catch (error) {
    console.error("Error in updateUserDoc:", error);
    throw error;
  }
};

// Get user's emotion character set preference
export const getUserEmotionCharacterSet = async () => {
  try {
    const result = await callGetUserEmotionCharacterSet({});
    // The result is directly the character set string
    return typedResult<string>(result.data);
  } catch (error) {
    console.error("Error in getUserEmotionCharacterSet:", error);
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
  detectedEmotionText: string | Emotion,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
) => {
  try {
    // Client-side encryption before sending to server
    const encryptedUserText = await encryptField(userText);
    const encryptedBubbaReply = await encryptField(bubbaReply);
    
    // Handle emotion detection
    let emotion: Emotion;
    if (typeof detectedEmotionText === 'string') {
      emotion = await detectEmotion(detectedEmotionText);
    } else {
      emotion = detectedEmotionText;
    }
    
    const result = await callSaveJournalEntry({
      encryptedUserText,
      encryptedBubbaReply,
      emotion,
      detectedEmotionText: typeof detectedEmotionText === 'string' ? detectedEmotionText : '',
      usage
    });
    
    return typedResult<{ success: boolean, id: string, entry: any }>(result.data);
  } catch (error) {
    console.error("Error in saveJournalEntry:", error);
    throw error;
  }
};

// Edit a journal entry
export const editJournalEntry = async (
  entryId: string,
  newUserText: string,
  userId?: string
) => {
  try {
    // Client-side encryption before sending to server
    const encryptedUserText = await encryptField(newUserText);
    
    // Client-side emotion detection
    const emotion = await detectEmotion(newUserText);
    
    const result = await callEditJournalEntry({
      userId,
      entryId,
      encryptedUserText,
      emotion
    });
    
    return typedResult<{ success: boolean }>(result.data);
  } catch (error) {
    console.error("Error in editJournalEntry:", error);
    throw error;
  }
};

// Get journal entries
export const getJournalEntries = async (
  status: 'active' | 'trash' = 'active',
  userId?: string,
  limit?: number
) => {
  try {
    const result = await callGetJournalEntries({
      userId,
      status,
      limit
    });
    
    const encryptedEntries = typedResult<{ entries: JournalEntry[] }>(result.data).entries;
    
    // Client-side decryption of returned entries
    // This preserves the end-to-end encryption model
    const decryptedEntries = await Promise.all(
      encryptedEntries.map(async (entry) => {
        try {
          // We'll get a JournalEntry type with encryptedUserText and encryptedBubbaReply
          // We need to return the same type with additional decrypted fields
          return {
            ...entry,
            // Add these fields for use in components like JournalCard
            userText: entry.encryptedUserText ? await decryptData(entry.encryptedUserText) : '[Failed to decrypt]',
            bubbaReply: entry.encryptedBubbaReply ? await decryptData(entry.encryptedBubbaReply) : '[Failed to decrypt]',
          };
        } catch (error) {
          console.error(`Failed to decrypt entry ${entry.timestamp}:`, error);
          return {
            ...entry,
            userText: '[Failed to decrypt]',
            bubbaReply: '[Failed to decrypt]',
          };
        }
      })
    );
    
    return decryptedEntries;
  } catch (error) {
    console.error("Error in getJournalEntries:", error);
    return [];
  }
};

// Soft delete journal entry (move to trash)
export const softDeleteJournalEntry = async (
  entryId: string,
  userId?: string
) => {
  try {
    const result = await callSoftDeleteJournalEntry({
      userId,
      entryId
    });
    
    return typedResult<{ success: boolean }>(result.data).success;
  } catch (error) {
    console.error("Error in softDeleteJournalEntry:", error);
    throw error;
  }
};

// Recover journal entry from trash
export const recoverJournalEntry = async (
  entryId: string,
  userId?: string
) => {
  try {
    const result = await callRecoverJournalEntry({
      userId,
      entryId
    });
    
    return typedResult<{ success: boolean }>(result.data).success;
  } catch (error) {
    console.error("Error in recoverJournalEntry:", error);
    throw error;
  }
};

// Hard delete journal entry
export const hardDeleteJournalEntry = async (
  entryId: string,
  userId?: string
) => {
  try {
    const result = await callHardDeleteJournalEntry({
      userId,
      entryId
    });
    
    return typedResult<{ success: boolean }>(result.data).success;
  } catch (error) {
    console.error("Error in hardDeleteJournalEntry:", error);
    throw error;
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