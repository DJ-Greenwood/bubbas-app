import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp();
}

export const saveJournalEntry = onCall(async (request) => {
  const { entryData } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new Error("Unauthorized: Missing user context.");
  }

  if (!entryData || typeof entryData !== "object") {
    throw new Error("Invalid request: entryData must be an object.");
  }

  const db = getFirestore();
  const timestamp = new Date().toISOString();

  await db
    .collection("journals")
    .doc(uid)
    .collection("entries")
    .doc(timestamp)
    .set({
      ...entryData,
      createdAt: timestamp,
    });

  return { success: true };
});
