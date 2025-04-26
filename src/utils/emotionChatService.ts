// src/utils/emotionChatService.ts
import { db, auth } from '../utils/firebaseClient';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { encryptData, decryptData } from './encryption';
import { JournalEntry } from '@/types/JournalEntry';

const JOURNAL_ENCRYPTION_VERSION = 1;

export const saveJournalEntry = async (entry: JournalEntry, passPhrase: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const encryptedPayload = encryptData({
    userText: entry.userText,
    bubbaReply: entry.bubbaReply,
  }, passPhrase);

  const entryRef = doc(db, "journals", user.uid, "entries", entry.timestamp);

  await setDoc(entryRef, {
    encryptedData: encryptedPayload,
    emotion: entry.emotion,
    timestamp: entry.timestamp,
    deleted: entry.deleted ?? false,
    version: JOURNAL_ENCRYPTION_VERSION,
  });
};

export const loadJournalEntries = async (passPhrase: string): Promise<JournalEntry[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  const ref = collection(db, "journals", user.uid, "entries");
  const snapshot = await getDocs(ref);

  const entries: JournalEntry[] = [];
  snapshot.forEach(docSnap => {
    try {
      const rawData = docSnap.data();
      const decrypted = decryptData(rawData.encryptedData, passPhrase) as Partial<JournalEntry>;

      if (decrypted) {
        entries.push({
          userText: decrypted.userText || '',
          bubbaReply: decrypted.bubbaReply || '',
          emotion: rawData.emotion,
          timestamp: rawData.timestamp,
          deleted: rawData.deleted ?? false,
          version: rawData.version ?? 1,
        });
      }
    } catch (error) {
      console.error("Decryption failed:", error);
    }
  });

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};
