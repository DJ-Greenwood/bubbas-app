// src/utils/emotionChatService.ts
'use client';

import { collection, doc, setDoc, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebaseClient';

// 📋 Type for Saving a Journal Entry
interface SaveJournalEntry {
  version: number;
  createdAt: string;
  timestamp: string; // ⏰ Used as Firestore document ID
  emotion: string;
  encryptedUserText: string;
  encryptedBubbaReply: string;
  deleted?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ✅ Save Journal Entry (timestamp = doc ID)
export const saveJournalEntry = async (entry: SaveJournalEntry) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No authenticated user.");

  const entriesRef = collection(db, "journals", currentUser.uid, "entries");
  const entryRef = doc(entriesRef, entry.timestamp); // 🆔 Use timestamp as document ID

  const existingDoc = await getDoc(entryRef);

  if (existingDoc.exists()) {
    throw new Error("A journal entry with this timestamp already exists.");
  }

  await setDoc(entryRef, {
    encryptedUserText: entry.encryptedUserText,
    encryptedBubbaReply: entry.encryptedBubbaReply,
    emotion: entry.emotion,
    timestamp: entry.timestamp,
    createdAt: entry.createdAt,
    deleted: entry.deleted ?? false,
    version: entry.version,
    usage: entry.usage ?? {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  });

  console.log("✅ Journal entry saved:", entry.timestamp);
};

// ✅ Load All Journal Entries
export const loadJournalEntries = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No authenticated user.");

  const entriesRef = collection(db, "journals", currentUser.uid, "entries");

  const snapshot = await getDocs(entriesRef);
  const entries: any[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    entries.push(data);
  });

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // 📅 Sort newest first
};

// ✅ Hard Delete a Journal Entry
export const hardDeleteJournalEntry = async (timestamp: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No authenticated user.");

  const entryRef = doc(db, "journals", currentUser.uid, "entries", timestamp);

  await deleteDoc(entryRef);
  console.log("✅ Hard deleted journal entry:", timestamp);
};
