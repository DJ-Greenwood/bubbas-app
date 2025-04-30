
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import { encryptData, decryptField } from '@/utils/encryption';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { JournalEntry } from '@/types/JournalEntry';

import { getAuth } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

export const fetchPassPhrase = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDocRef = doc(db, "users", user.uid, "preferences", "security");
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const preferences = userDocSnap.data().preferences;
      return preferences?.passPhrase || null;
    } else {
      console.warn("User document not found.");
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch passPhrase:", error);
    return null;
  }
};

// Utility to ensure user and passPhrase are valid
async function getUserUID() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated.');
  
  return { uid: user.uid};
}

// Save a new journal/chat entry
export async function saveChat(
  userInput: string,
  bubbaReply: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number },
  passPhrase: string,
) {
  const { uid } = await getUserUID(); // Only get UID, not fetching passPhrase anymore
  const phrase = await fetchPassPhrase(); // Fetch passphrase from secure storage


  const now = new Date();
  const timestamp = now.toISOString();

  const encryptedUserText = encryptData({ userText: userInput }, passPhrase);
  const encryptedBubbaReply = encryptData({ bubbaReply: bubbaReply }, passPhrase);
  const emotion = await detectEmotion(userInput);

  const newEntry: JournalEntry = {
    version: 1,
    createdAt: now.toISOString(),
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
  };

  const ref = collection(db, 'journals', uid, 'entries');
  await setDoc(doc(ref, timestamp), newEntry);

  console.log('✅ Saved chat and journal entry!');
}


// Load journal/chat entries
export async function loadChats(
  status: 'active' | 'trash' = 'active',
  passPhrase: string,
  Uid: string
) {
  const ref = collection(db, 'journals', Uid, 'entries');
  const snapshot = await getDocs(ref);

  const entries: JournalEntry[] = [];
  snapshot.forEach(docSnap => {
    const raw = docSnap.data() as JournalEntry;
    if ((status === 'trash' && raw.deleted) || (status === 'active' && !raw.deleted)) {
      entries.push({ ...raw }); // ✅ Correct spread
    }
  });

  return entries.map(entry => {
    let userText = '[Missing]';
    let bubbaReply = '[Missing]';

    try {
      if (entry.encryptedUserText) {
        const parsed = JSON.parse(decryptField(entry.encryptedUserText, passPhrase));
        userText = parsed.userText;
      }
    } catch (e) {
      console.warn('Failed to decrypt userText:', e);
    }

    try {
      if (entry.encryptedBubbaReply) {
        const parsed = JSON.parse(decryptField(entry.encryptedBubbaReply, passPhrase));
        bubbaReply = parsed.bubbaReply;
      }
    } catch (e) {
      console.warn('Failed to decrypt bubbaReply:', e);
    }

    return { ...entry, userText, bubbaReply };
  });
}

// Edit a journal/chat entry
export async function editChat(
  timestamp: string,
  newUserInput: string,
  passPhrase: string,
  Uid: string
  ) {
  const ref = doc(db, 'journals', Uid, 'entries', timestamp);
  const docSnap = await getDoc(ref);
  if (!docSnap.exists()) throw new Error('Journal entry not found.');

  const detectedEmotion = await detectEmotion(newUserInput);
  await updateDoc(ref, {
    encryptedUserText: encryptData({ userText: newUserInput }, passPhrase),
    emotion: detectedEmotion,
  });
}

// Soft delete (move to trash)
export async function softDeleteChat(
  timestamp: string,
  passPhrase: string,
  Uid: string ) {
  const ref = doc(db, 'journals', Uid, 'entries', timestamp);
  await updateDoc(ref, { deleted: true });
}

// Recover from trash
export async function recoverChat(
  timestamp: string,
  passPhrase: string,
  Uid: string ) {
  const ref = doc(db, 'journals', Uid, 'entries', timestamp);
  await updateDoc(ref, { deleted: false });
}

// Hard delete (permanently delete)
export async function hardDeleteChat(
  timestamp: string,
  passPhrase: string,
  Uid: string ) {
  const ref = doc(db, 'journals', Uid, 'entries', timestamp);
  await deleteDoc(ref);
}
