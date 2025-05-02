'use client';

import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  where,
  query,
  orderBy,
  getFirestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { encryptData, decryptData } from '@/utils/encryption';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { JournalEntry } from '@/types/JournalEntry';
import { saveTokenUsage } from '@/utils/tokenPersistenceService';

const db = getFirestore();
const auth = getAuth();

// Helper function to get user UID
const getUserUID = (): string | null => {
  const user = auth.currentUser;
  return user ? user.uid : null;
};

// Fetch the passphrase from user preferences
export const fetchPassPhrase = async (): Promise<string | null> => {
  const uid = getUserUID();
  if (!uid) return null;

  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData?.preferences?.security?.passPhrase) {
        return userData.preferences.security.passPhrase;
      }
    }
    
    console.warn("User passphrase not found");
    return null;
  } catch (error) {
    console.error("Failed to fetch passPhrase:", error);
    return null;
  }
};

// ✅ Save new chat/journal entry
export async function saveChat(
  userInput: string,
  bubbaReply: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number },
  passPhrase: string,
) {
  const userUID = getUserUID();
  if (!userUID) {
    throw new Error('User not authenticated');
  }

  const now = new Date();
  const timestamp = now.toISOString();

  const encryptedUserText = encryptData({ userText: userInput }, passPhrase);
  const encryptedBubbaReply = encryptData({ bubbaReply }, passPhrase);
  const emotion = await detectEmotion(userInput);

  const newEntry: JournalEntry = {
    version: 1,
    createdAt: timestamp,
    timestamp,
    emotion,
    encryptedUserText,
    encryptedBubbaReply,
    deleted: false,
    usage: {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    },
    status: 'active',
    lastEdited: '',
    lastEditedBy: ''
  };

  const ref = collection(db, 'journals', userUID, 'entries');
  await setDoc(doc(ref, timestamp), newEntry);
  
  // Make sure token usage is saved separately as well for billing persistence
  await saveTokenUsage(
    usage,
    'journal',
    timestamp, // Use timestamp as journal entry ID
    userInput.substring(0, 50) + (userInput.length > 50 ? '...' : '') // Include truncated prompt
  );
  
  console.log('✅ Saved chat and journal entry!');
}

// ✅ For backward compatibility
export const saveConversation = saveChat;

// ✅ Load journal entries by status
export async function loadChats(
  status: 'active' | 'trash' = 'active',
  passPhrase: string,
  uid?: string
): Promise<JournalEntry[]> {
  const userUID = uid || getUserUID();
  if (!userUID) {
    throw new Error('User not authenticated');
  }

  if (!passPhrase) {
    console.warn('❌ Passphrase not available. Skipping journal load.');
    return [];
  }

  try {
    const entriesRef = collection(db, 'journals', userUID, 'entries');
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
    console.error('Failed to load journal entries:', error);
    return [];
  }
}

// ✅ For backward compatibility
export const loadConversation = loadChats;

// ✅ Edit a chat entry
export async function editChat(
  timestamp: string,
  newUserInput: string,
  passPhrase: string,
  uid?: string
) {
  const userUID = uid || getUserUID();
  if (!userUID) {
    throw new Error('User not authenticated');
  }

  try {
    const ref = doc(db, 'journals', userUID, 'entries', timestamp);
    const docSnap = await getDoc(ref);
    
    if (!docSnap.exists()) {
      throw new Error('Journal entry not found');
    }
    
    const detectedEmotion = await detectEmotion(newUserInput);
    await updateDoc(ref, {
      encryptedUserText: encryptData({ userText: newUserInput }, passPhrase),
      emotion: detectedEmotion,
      lastEdited: new Date().toISOString()
    });
    
    console.log('✅ Journal entry edited successfully');
    return true;
  } catch (error) {
    console.error('Failed to edit journal entry:', error);
    throw error;
  }
}

// ✅ For backward compatibility
export const editConversation = async (
  timestamp: string,
  newUserInput: string,
  uid: string,
  passPhrase: string
) => {
  return editChat(timestamp, newUserInput, passPhrase, uid);
};

// ✅ Soft delete (move to trash)
export async function softDeleteChat(
  timestamp: string,
  passPhrase: string,
  uid?: string
) {
  const userUID = uid || getUserUID();
  if (!userUID) {
    throw new Error('User not authenticated');
  }

  try {
    const ref = doc(db, 'journals', userUID, 'entries', timestamp);
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
    console.error('Failed to soft delete journal entry:', error);
    throw error;
  }
}

// ✅ For backward compatibility
export const softDeleteConversation = async (
  timestamp: string,
  uid: string
) => {
  const passPhrase = await fetchPassPhrase();
  if (!passPhrase) throw new Error('No passphrase available');
  return softDeleteChat(timestamp, passPhrase, uid);
};

// ✅ Recover from trash
export async function recoverChat(
  timestamp: string,
  uid?: string
) {
  const userUID = uid || getUserUID();
  if (!userUID) {
    throw new Error('User not authenticated');
  }

  try {
    const ref = doc(db, 'journals', userUID, 'entries', timestamp);
    await updateDoc(ref, { 
      status: 'active',
      deleted: false,
      recoveredAt: new Date().toISOString()
    });
    
    console.log('✅ Journal entry recovered');
    return true;
  } catch (error) {
    console.error('Failed to recover journal entry:', error);
    throw error;
  }
}

// ✅ For backward compatibility
export const recoverConversation = async (
  timestamp: string,
  uid: string
) => {
  return recoverChat(timestamp, uid);
};

// ✅ Hard delete journal entry but KEEP token usage records
export async function hardDeleteChat(
  timestamp: string,
  uid?: string
) {
  const userUID = uid || getUserUID();
  if (!userUID) {
    throw new Error('User not authenticated');
  }

  try {
    // First retrieve the journal entry to check if it exists
    const ref = doc(db, 'journals', userUID, 'entries', timestamp);
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
    console.error('Failed to permanently delete journal entry:', error);
    throw error;
  }
}

// ✅ For backward compatibility
export const hardDeleteConversation = async (
  timestamp: string,
  uid: string
) => {
  return hardDeleteChat(timestamp, uid);
};