"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveEncryptedJournal = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    console.log("[init] Initializing Firebase app...");
    (0, app_1.initializeApp)();
}
else {
    console.log("[init] Firebase app already initialized.");
}
exports.saveEncryptedJournal = (0, https_1.onCall)(async (request) => {
    console.log("[saveEncryptedJournal] Function triggered");
    const { encryptedData } = request.data;
    const uid = request.auth?.uid;
    // 🔐 Authentication check
    if (!uid) {
        console.error("[saveEncryptedJournal] Unauthorized request: Missing user context.");
        throw new Error("Unauthorized: Missing user context.");
    }
    // 🛡️ Data validation
    if (!encryptedData || typeof encryptedData !== "string") {
        console.error("[saveEncryptedJournal] Invalid request: Missing or invalid encryptedData.");
        throw new Error("Invalid request: Encrypted data must be a non-empty string.");
    }
    const db = (0, firestore_1.getFirestore)();
    const timestamp = new Date().toISOString();
    const entryPath = `journals/${uid}/entries/${timestamp}`;
    console.log(`[saveEncryptedJournal] Saving to path: ${entryPath}`);
    try {
        await db
            .collection("journals")
            .doc(uid)
            .collection("entries")
            .doc(timestamp)
            .set({
            encryptedData,
            createdAt: timestamp,
        });
        console.log("[saveEncryptedJournal] Journal entry successfully saved.");
        return { success: true };
    }
    catch (error) {
        console.error("[saveEncryptedJournal] Error saving journal entry:", error);
        throw new Error("Failed to save journal.");
    }
});
//# sourceMappingURL=saveEncryptedJournal.js.map