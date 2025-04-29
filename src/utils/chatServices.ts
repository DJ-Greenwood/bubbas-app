import { db, auth } from '@/utils/firebaseClient';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { encryptData, decryptField } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/passPhraseService';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { JournalEntry } from '@/types/JournalEntry';

// Utility to ensure user and passPhrase are valid
async function getUserAndPassPhrase() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated.');
  const passPhrase = await fetchPassPhrase();
  if (!passPhrase) throw new Error('PassPhrase not found.');
  return { uid: user.uid, passPhrase };
}

// Save a new journal/chat entry
export async function saveChat(userInput: string, bubbaReply: string, usage: { promptTokens: number; completionTokens: number; totalTokens: number; }) {
  const { uid, passPhrase } = await getUserAndPassPhrase();
  const now = new Date();
  const timestamp = now.toISOString();

  const encryptedUserText = encryptData({ userText: userInput }, passPhrase);
  const encryptedBubbaReply = encryptData({ bubbaReply: bubbaReply }, passPhrase);
  const emotion = await detectEmotion(userInput);

  const newEntry: JournalEntry = {
    version: 1, // ✅ Version set
    createdAt: now.toISOString(), // ✅ CreatedAt set
    timestamp,
    emotion,
    encryptedUserText,
    encryptedBubbaReply,
    deleted: false, // ✅ No status field
    promptToken: usage.promptTokens,
    completionToken: usage.completionTokens,
    totalToken: usage.totalTokens,
    usage,
  };

  const ref = collection(db, 'journals', uid, 'entries');
  await setDoc(doc(ref, timestamp), newEntry);
}

// Load journal/chat entries
export async function loadChats(status: 'active' | 'trash') {
  const { uid, passPhrase } = await getUserAndPassPhrase();
  const ref = collection(db, 'journals', uid, 'entries');
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

    return { ...entry, userText, bubbaReply }; // ✅ Correct spread
  });
}

// Edit a journal/chat entry
export async function editChat(timestamp: string, newUserInput: string) {
  const { uid, passPhrase } = await getUserAndPassPhrase();
  const ref = doc(db, 'journals', uid, 'entries', timestamp);
  const docSnap = await getDoc(ref);
  if (!docSnap.exists()) throw new Error('Journal entry not found.');

  const detectedEmotion = await detectEmotion(newUserInput);
  await updateDoc(ref, {
    encryptedUserText: encryptData({ userText: newUserInput }, passPhrase),
    emotion: detectedEmotion,
  });
}

// Soft delete (move to trash)
export async function softDeleteChat(timestamp: string) {
  const { uid } = await getUserAndPassPhrase();
  const ref = doc(db, 'journals', uid, 'entries', timestamp);
  await updateDoc(ref, { deleted: true });
}

// Recover from trash
export async function recoverChat(timestamp: string) {
  const { uid } = await getUserAndPassPhrase();
  const ref = doc(db, 'journals', uid, 'entries', timestamp);
  await updateDoc(ref, { deleted: false });
}

// Hard delete (permanently delete)
export async function hardDeleteChat(timestamp: string) {
  const { uid } = await getUserAndPassPhrase();
  const ref = doc(db, 'journals', uid, 'entries', timestamp);
  await deleteDoc(ref);
}
