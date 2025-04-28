import { getFirestore, collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth } from '@/utils/firebaseClient';
import { JournalEntry } from '@/types/JournalEntry';
import { encryptData } from '@/utils/encryption';

const db = getFirestore();

// 🧹 Load journals
export const loadJournalEntries = async (status: 'active' | 'trash') => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const journalRef = collection(db, 'journals', user.uid, 'entries');
  const q = query(journalRef, where('deleted', '==', status === 'trash'));
  const snapshot = await getDocs(q);

  const entries = snapshot.docs.map(doc => ({
    ...(doc.data() as any),
    timestamp: doc.id,
  })) as JournalEntry[];

  return { entries };
};

// 🖊️ Save new edited journal as a new document
export const saveEditedJournalEntry = async (
  originalEntry: JournalEntry,
  updatedUserText: string,
  emotion: string,
  passPhrase: string
) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const journalRef = collection(db, 'journals', user.uid, 'entries');

  const now = new Date();
  const timestamp = now.toISOString();

  await addDoc(journalRef, {
    createdAt: timestamp,
    timestamp: timestamp,
    deleted: false,
    emotion: emotion,
    encryptedUserText: encryptData({ userText: updatedUserText }, passPhrase),
    encryptedBubbaReply: encryptData({ bubbaReply: originalEntry.bubbaReply }, passPhrase),
    promptToken: originalEntry.promptToken ?? 0,
    completionToken: originalEntry.completionToken ?? 0,
    totalToken: originalEntry.totalToken ?? 0,
  });
};

// 🗑️ Soft-delete an entry
export const softDeleteJournalEntry = async (timestamp: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const entryRef = doc(db, 'journals', user.uid, 'entries', timestamp);
  await updateDoc(entryRef, { deleted: true });
};

// ♻️ Recover (un-delete) a journal
export const recoverJournalEntry = async (timestamp: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const entryRef = doc(db, 'journals', user.uid, 'entries', timestamp);
  await updateDoc(entryRef, { deleted: false });
};

// 🧹 Hard delete forever
export const hardDeleteJournalEntry = async (timestamp: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const entryRef = doc(db, 'journals', user.uid, 'entries', timestamp);
  await deleteDoc(entryRef);
};
