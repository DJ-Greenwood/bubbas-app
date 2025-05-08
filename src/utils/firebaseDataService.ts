// src/utils/firebaseDataService.ts
import { db, auth } from './firebaseClient'; // assumes firebase is initialized
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs, query, where, 
  orderBy, increment, serverTimestamp, Timestamp, limit as firestoreLimit, 
  startAfter as firestoreStartAfter
} from 'firebase/firestore';
import { encryptField, decryptField, getPassPhrase } from './encryption';
import { JournalEntry } from '@/types/JournalEntry';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { EmotionCharacterKey } from '@/types/emotionCharacters';
import { saveTokenUsage } from './TokenDataService'; // Assuming this is the correct import path

// Helper function to get current user UID
export const getCurrentUserUid = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
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

// Modified saveJournalEntry function to ensure emotionCharacterSet is saved
export const saveJournalEntry = async (
  userText: string,
  bubbaReply: string,
  detectedEmotionText: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
) => {
  const uid = getCurrentUserUid();
  const now = new Date();
  const timestamp = now.toISOString();

  try {
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
      emotionCharacterSet: characterSet || 'bubba' // Ensure we save the character set
    };

    // Fix: Use a proper Firestore path with odd number of segments
    const journalRef = doc(db, 'users', uid, 'journal', timestamp);
    await setDoc(journalRef, newEntry);
    
    // Make sure token usage is saved separately as well for billing persistence
    await saveTokenUsage(
      usage,
      'journal',
      timestamp,
      userText.substring(0, 50) + (userText.length > 50 ? '...' : '')
    );
    
    console.log('✅ Saved journal entry!');
    return { id: timestamp, ...newEntry };
  } catch (error) {
    console.error('❌ Error saving journal entry:', error);
    throw error;
  }
};

// Edit a journal entry
export const editJournalEntry = async (
  entryId: string,
  newUserText: string,
  uid?: string
) => {
  try {
    const userUID = uid || getCurrentUserUid();
    // Fix: Update path to match the new structure
    const ref = doc(db, 'users', userUID, 'journal', entryId);
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

// Load journal entries by status - Improved efficiency version
export const getJournalEntries = async (
  status: 'active' | 'trash' = 'active',
  uid?: string
) => {
  try {
    const userUID = uid || getCurrentUserUid();
    
    // Fix: Updated to match the new structure
    const journalRef = collection(db, 'users', userUID, 'journal');
    const journalSnapshot = await getDocs(journalRef);
    
    if (journalSnapshot.empty) {
      console.log(`No journal entries found`);
      return [];
    }
    
    const entries: JournalEntry[] = [];
    
    // Process each journal document directly
    for (const doc of journalSnapshot.docs) {
      const data = doc.data() as JournalEntry;
      
      // Only add entries with the correct status
      if (data.status === status) {
        // For backward compatibility - if emotionCharacterSet is missing, use 'Bubba'
        if (!data.emotionCharacterSet) {
          data.emotionCharacterSet = 'Bubba';
        }
        
        entries.push({
          ...data,
          timestamp: doc.id // Use doc ID as timestamp
        });
      }
    }
    
    // Sort by timestamp descending
    entries.sort((a, b) => {
      if (a.timestamp > b.timestamp) return -1;
      if (a.timestamp < b.timestamp) return 1;
      return 0;
    });
    
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
    // Fix: Update path to match the new structure
    const ref = doc(db, 'users', userUID, 'journal', entryId);
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
    // Fix: Update path to match the new structure
    const ref = doc(db, 'users', userUID, 'journal', entryId);
    const docSnap = await getDoc(ref);
    
    if (!docSnap.exists()) {
      throw new Error('Journal entry not found');
    }
    
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
    // Fix: Update path to match the new structure
    const ref = doc(db, 'users', userUID, 'journal', entryId);
    const entryDoc = await getDoc(ref);
    
    if (!entryDoc.exists()) {
      throw new Error('Journal entry not found');
    }
    
    // Delete the entry document
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
// Backwards Compatibility Functions
//------------------------------------------------------------------------------

// For backwards compatibility with older code
export const saveConversation = saveJournalEntry;
export const loadConversation = getJournalEntries;
export const editConversation = editJournalEntry;
export const softDeleteConversation = softDeleteJournalEntry;
export const recoverConversation = recoverJournalEntry;
export const hardDeleteConversation = hardDeleteJournalEntry;