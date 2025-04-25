"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveJournalEntry = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
exports.saveJournalEntry = (0, https_1.onCall)(async (request) => {
    const { entryData } = request.data;
    const uid = request.auth?.uid;
    if (!uid) {
        throw new Error("Unauthorized: Missing user context.");
    }
    if (!entryData || typeof entryData !== "object") {
        throw new Error("Invalid request: entryData must be an object.");
    }
    const db = (0, firestore_1.getFirestore)();
    const timestamp = new Date().toISOString();
    await db
        .collection("journals")
        .doc(uid)
        .collection("entries")
        .doc(timestamp)
        .set({
        ...entryData,
        createdAt: timestamp,
    });
    return { success: true };
});
//# sourceMappingURL=saveJournalEntry.js.map