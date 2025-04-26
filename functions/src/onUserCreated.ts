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

  const userPassPhrase = event.customClaims?.passphrase || uid; // Use UID as fallback";
  

  try {
    await userRef.set({
      email: event.email || '',
      username: event.displayName || '',
      phoneNumber: event.phoneNumber || '',
      createdAt: new Date().toISOString(),
      passPhrase: userPassPhrase, // ✨ Save encrypted
      agreedTo: {
        terms: new Date().toISOString(),
        privacy: new Date().toISOString(),
        ethics: new Date().toISOString(),
      },
      preferences: {
        tone: 'friendly',
        theme: 'light',
        startPage: '/chat',
      },
      usage: {
        tokens: { lifetime: 0, monthly: {} },
        voiceChars: {
          tts: { lifetime: 0, monthly: {} },
          stt: { lifetime: 0, monthly: {} },
        },
      },
      subscription: {
        tier: 'free',
        activationDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
      },
      features: {
        memory: true,
        tts: true,
        stt: true,
        emotionalInsights: true,
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
