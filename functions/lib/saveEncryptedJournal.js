"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveEncryptedJournal = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    firebase_admin_1.default.initializeApp(); // ✅ Safe — will only run once
}
exports.saveEncryptedJournal = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    const { encryptedData } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new Error("Unauthorized: Missing user context.");
    }
    const db = (0, firestore_1.getFirestore)();
    const timestamp = new Date().toISOString();
    try {
        await db.collection("journals").doc(uid).collection("entries").doc(timestamp).set({
            encryptedData,
            createdAt: timestamp,
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error saving journal:", error);
        throw new Error("Failed to save journal.");
    }
});
//# sourceMappingURL=saveEncryptedJournal.js.map