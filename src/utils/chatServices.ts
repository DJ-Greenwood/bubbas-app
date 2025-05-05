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
import { EmotionCharacterKey } from '@/types/emotionCharacters'; // Import the CharacterSet type

const db = getFirestore();
const auth = getAuth();

// Helper function to get user UID
const getUserUID = (): string | null => {
  const user = auth.currentUser;
  return user ? user.uid : null;
};

// Renamed from fetchPassPhrase to getPassPhrase
export const getPassPhrase = async (): Promise<string | null> => {
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
  const passPhrase = await getPassPhrase();
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


// Get the current user's emotion character set preference
export const getUserEmotionCharacterSet = async (): Promise<EmotionCharacterKey | null> => {
  const uid = getUserUID();
  if (!uid) return null;

  try {
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

// ✅ Save new chat/journal entry - now with character set
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
  
  // Get the current character set from user preferences
  const characterSet = await getUserEmotionCharacterSet();

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
    lastEditedBy: '',
    // Add the character set to the journal entry
    emotionCharacterSet: characterSet || 'Bubba'
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
    console.error('Failed to load journal entries:', error);
    return [];
  }
}

// ✅ For backward compatibility
export const loadConversation = loadChats;

async function editChat(
  timestamp: string,
  newUserInput: string,
  passPhrase: string,
  uid: string
): Promise<boolean> {
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

    const existingData = docSnap.data() as JournalEntry;

    const encryptedUserText = encryptData({ userText: newUserInput }, passPhrase);
    const emotion = await detectEmotion(newUserInput);

    await updateDoc(ref, {
      encryptedUserText,
      emotion,
      lastEdited: new Date().toISOString(),
      lastEditedBy: userUID,
    });

    console.log('✅ Journal entry updated successfully');
    return true;
  } catch (error) {
    console.error('Failed to edit journal entry:', error);
    throw error;
  }
}
