import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp();
}

export const loadJournalEntries = onCall(async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new Error("Unauthorized: Missing user context.");
  }

  const db = getFirestore();

  try {
    const snapshot = await db
      .collection("journals")
      .doc(uid)
      .collection("entries")
      .orderBy("createdAt", "desc")
      .get();

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, entries };
  } catch (error) {
    console.error("Error loading journal entries:", error);
    throw new Error("Failed to load journal entries.");
  }
});
