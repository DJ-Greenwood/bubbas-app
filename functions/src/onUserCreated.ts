// src/functions/createUserProfile.ts
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

  const now = new Date().toISOString();
  const userPassPhrase = event.customClaims?.passphrase || uid; // fallback to UID

  try {
    await userRef.set({
      email: event.email || '',
      username: event.displayName || '',
      phoneNumber: event.phoneNumber || '',
      createdAt: now,
      passPhrase: userPassPhrase, // 🔐 Encrypt or salt client-side later if needed
      agreedTo: {
        terms: now,
        privacy: now,
        ethics: now,
      },
      preferences: {
        emotionCharacterSet: 'Bubba',         // UI theme
        emotionIconSize: 64,        // Size of the emotion icon nummber of pixils
        localStorageEnabled: false, // ✨ Whether journals are saved locally too
      },
      usage: {
        tokens: {
          lifetime: 0,
          monthly: {},            // e.g., { "2024-05": 12000 }
        },
        voiceChars: {
          tts: {
            lifetime: 0,
            monthly: {},          // e.g., { "2024-05": 35000 }
          },
          stt: {
            lifetime: 0,
            monthly: {},          // e.g., { "2024-05": 1200 }
          },
        },
      },
      subscription: {
        tier: 'free',              // free, basic, pro, etc.
        activationDate: now,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
      },
      features: {
        memory: true,              // Memory feature enabled
        tts: true,                 // Text-to-Speech feature enabled
        stt: true,                 // Speech-to-Text feature enabled
        emotionalInsights: true,   // Emotional analysis feature
      },
    });

    console.log("✅ User profile created:", uid);
  } catch (err) {
    console.error("❌ Failed to create user profile:", err);
  }

  try {
    await journalRootRef.set({ initializedAt: FieldValue.serverTimestamp() });
    console.log("✅ Journal root initialized:", journalRootRef.path);
  } catch (err) {
    console.error("❌ Failed to create journal root:", err);
  }

  try {
    console.log("📌 Creating welcome journal entry:", journalEntryRef.path);
    await journalEntryRef.set({
      encryptedData: "", // empty first, user will save real data later
      createdAt: FieldValue.serverTimestamp(),
      emotion: "joyful",
      note: "Welcome journal created automatically.",
      deleted: false,
      version: 1,
      promptToken: 0, // optional, for tracking prompt tokens
      completionToken: 0, // optional, for tracking completion tokens
      totalToken: 0, // optional, for tracking total tokens
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, },
    });
    console.log("✅ Welcome journal entry created");
  } catch (err) {
    console.error("❌ Failed to create welcome journal entry:", err);
  }
});
