import { db, auth } from '../../utils/firebaseClient';
import { encryptData, decryptData } from '../../utils/encryption';
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { JournalEntry } from '@/types/JournalEntry';

const JOURNAL_ENCRYPTION_VERSION = 1;

// 1. Save journal entry (partial encryption)
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

// 2. Load journal entries (partial decryption)
export const loadJournalEntries = async (
  passPhrase: string,
  onlyDeleted = false,
  pageSize = 20,
  startAfterDoc?: any
): Promise<{ entries: JournalEntry[]; lastDoc: any }> => {
  const user = auth.currentUser;
  if (!user) return { entries: [], lastDoc: null };

  const ref = collection(db, "journals", user.uid, "entries");
  let q = query(
    ref,
    where("deleted", "==", onlyDeleted),
    orderBy("timestamp", "desc"),
    limit(pageSize)
  );

  if (startAfterDoc) {
    q = query(
      ref,
      where("deleted", "==", onlyDeleted),
      orderBy("timestamp", "desc"),
      startAfter(startAfterDoc),
      limit(pageSize)
    );
  }

  const snapshot = await getDocs(q);
  const entries: JournalEntry[] = [];

  snapshot.forEach(docSnap => {
    try {
      const docData = docSnap.data();
      const encrypted = docData.encryptedData;
      const decrypted = decryptData(encrypted, passPhrase) || {};

      const entry: JournalEntry = {
        userText: decrypted.userText || "",
        bubbaReply: decrypted.bubbaReply || "",
        emotion: docData.emotion,
        timestamp: docData.timestamp,
        deleted: docData.deleted ?? false,
        version: docData.version ?? 1,
      };

      entries.push(entry);
    } catch (error) {
      console.error("Failed to decrypt journal entry:", error);
    }
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  return { entries, lastDoc };
};

// 3. Edit (only updates userText and/or bubbaReply)
export const editJournalEntry = async (timestamp: string, updates: Partial<Pick<JournalEntry, "userText" | "bubbaReply">>, passPhrase: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const entryRef = doc(db, "journals", user.uid, "entries", timestamp);

  const docSnap = await getDoc(entryRef);
  if (!docSnap.exists()) throw new Error("Entry not found.");

  const docData = docSnap.data();
  const decrypted = decryptData(docData.encryptedData, passPhrase) || {};

  const newEncrypted = encryptData({
    userText: updates.userText ?? decrypted.userText,
    bubbaReply: updates.bubbaReply ?? decrypted.bubbaReply,
  }, passPhrase);

  await updateDoc(entryRef, { encryptedData: newEncrypted });
};

// 4. Soft delete
export const softDeleteJournalEntry = async (timestamp: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const entryRef = doc(db, "journals", user.uid, "entries", timestamp);
  await updateDoc(entryRef, { deleted: true });
};

// 5. Recover journal entry
export const recoverJournalEntry = async (timestamp: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const entryRef = doc(db, "journals", user.uid, "entries", timestamp);
  await updateDoc(entryRef, { deleted: false });
};

// 6. Hard delete
export const hardDeleteJournalEntry = async (timestamp: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const entryRef = doc(db, "journals", user.uid, "entries", timestamp);
  await deleteDoc(entryRef);
};
