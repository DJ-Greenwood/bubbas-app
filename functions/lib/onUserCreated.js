"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserProfile = void 0;
const v1_1 = require("firebase-functions/v1");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)(); // ✅ Safe — will only run once
}
const db = (0, firestore_1.getFirestore)();
exports.createUserProfile = v1_1.auth.user().onCreate(async (event) => {
    const user = event;
    const uid = user.uid;
    const userRef = db.doc(`users/${uid}`);
    await userRef.set({
        email: user.email || "",
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
});
//# sourceMappingURL=onUserCreated.js.map