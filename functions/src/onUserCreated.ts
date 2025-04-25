import { auth } from "firebase-functions/v1";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

export const createUserProfile = auth.user().onCreate(async (event) => {
  const uid = event.uid;
  const userRef = db.doc(`users/${uid}`);
  const journalRootRef = db.doc(`journals/${uid}`);
  const journalEntryRef = db.collection(`journals/${uid}/entries`).doc();

  try {
    await userRef.set({
      email: event.email || "",
      createdAt: FieldValue.serverTimestamp(),
      agreedTo: {
        terms: FieldValue.serverTimestamp(),
        privacy: FieldValue.serverTimestamp(),
        ethics: FieldValue.serverTimestamp()
      },
      preferences: {
        tone: "friendly",
        theme: "light",
        startPage: "journal"
      },
      usage: {
        tokens: { lifetime: 0, monthly: {} },
        voiceChars: {
          tts: { lifetime: 0, monthly: {} },
          stt: { lifetime: 0, monthly: {} },
        }
      },
      subscription: {
        tier: "free",
        activationDate: FieldValue.serverTimestamp(),
        expirationDate: ""
      },
      features: {
        memory: true,
        tts: false,
        stt: false
      }
    });
    console.log("✅ User profile created:", uid);
  } catch (err) {
    console.error("❌ Failed to create user profile:", err);
  }

  try {
    await journalRootRef.set({ initializedAt: FieldValue.serverTimestamp() });
    console.log("✅ Journal root created:", journalRootRef.path);
  } catch (err) {
    console.error("❌ Failed to create journal root:", err);
  }

  try {
    console.log("📌 New journal entry path:", journalEntryRef.path);
    await journalEntryRef.set({
      encryptedData: "",
      createdAt: FieldValue.serverTimestamp(),
      emotion: "joyful",
      note: "Welcome journal created automatically."
    });
    console.log("✅ Welcome journal entry created");
  } catch (err) {
    console.error("❌ Failed to create welcome journal entry:", err);
  }
});
