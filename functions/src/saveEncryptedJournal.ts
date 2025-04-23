import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp(); // ✅ Safe — will only run once
}

export const saveEncryptedJournal = onCall({ enforceAppCheck: true }, async (request) => {
  const { encryptedData } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new Error("Unauthorized: Missing user context.");
  }

  const db = getFirestore();
  const timestamp = new Date().toISOString();

  try {
    await db.collection("journals").doc(uid).collection("entries").doc(timestamp).set({
      encryptedData,
      createdAt: timestamp,
    });
    return { success: true };
  } catch (error) {
    console.error("Error saving journal:", error);
    throw new Error("Failed to save journal.");
  }
});
