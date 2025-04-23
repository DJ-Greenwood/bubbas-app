import { auth } from "firebase-functions/v1";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp(); // ✅ Safe — will only run once
}
const db = getFirestore();

export const createUserProfile = auth.user().onCreate(async (event) => {
  const user = event;
  const uid = user.uid;
  const userRef = db.doc(`users/${uid}`);

  await userRef.set({
    email: user.email || "",
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
})
