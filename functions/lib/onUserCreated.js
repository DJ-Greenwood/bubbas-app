"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserProfile = void 0;
const v1_1 = require("firebase-functions/v1");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
exports.createUserProfile = v1_1.auth.user().onCreate(async (event) => {
    const uid = event.uid;
    const userRef = db.doc(`users/${uid}`);
    const journalRootRef = db.doc(`journals/${uid}`);
    const journalEntryRef = db.collection(`journals/${uid}/entries`).doc();
    try {
        await userRef.set({
            email: event.email || "",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            agreedTo: {
                terms: firestore_1.FieldValue.serverTimestamp(),
                privacy: firestore_1.FieldValue.serverTimestamp(),
                ethics: firestore_1.FieldValue.serverTimestamp()
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
                activationDate: firestore_1.FieldValue.serverTimestamp(),
                expirationDate: ""
            },
            features: {
                memory: true,
                tts: false,
                stt: false
            }
        });
        console.log("✅ User profile created:", uid);
    }
    catch (err) {
        console.error("❌ Failed to create user profile:", err);
    }
    try {
        await journalRootRef.set({ initializedAt: firestore_1.FieldValue.serverTimestamp() });
        console.log("✅ Journal root created:", journalRootRef.path);
    }
    catch (err) {
        console.error("❌ Failed to create journal root:", err);
    }
    try {
        console.log("📌 New journal entry path:", journalEntryRef.path);
        await journalEntryRef.set({
            encryptedData: "",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            emotion: "joyful",
            note: "Welcome journal created automatically."
        });
        console.log("✅ Welcome journal entry created");
    }
    catch (err) {
        console.error("❌ Failed to create welcome journal entry:", err);
    }
});
//# sourceMappingURL=onUserCreated.js.map