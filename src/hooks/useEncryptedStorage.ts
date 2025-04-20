// 📁 functions/sendEncouragement.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import * as crypto from "crypto";

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const SALT = process.env.SALT || "bubbasSalt2025";

function getUserKey(uid: string) {
  return crypto.createHash("sha256").update(uid + SALT).digest("hex");
}

function decryptAES(cipherText: string, key: string): string {
  const bytes = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "hex"), Buffer.alloc(16, 0));
  let decrypted = bytes.update(Buffer.from(cipherText, "base64"), undefined, "utf8");
  decrypted += bytes.final("utf8");
  return decrypted;
}

export const sendEncouragement = onSchedule("every 24 hours", async () => {
  const snapshot = await db.collection("optins").get();

  for (const docSnap of snapshot.docs) {
    const { encrypted, fcmToken } = docSnap.data();
    const uid = docSnap.id;
    const key = getUserKey(uid);

    try {
      const decrypted = decryptAES(encrypted, key);

      await messaging.send({
        token: fcmToken,
        notification: {
          title: "🐾 Bubba Check-In",
          body: "Hey! Bubba here — just reminding you that you matter. 💙",
        },
      });

      logger.info(`Notification sent to UID: ${uid}`);
    } catch (err) {
      logger.error(`Failed to send notification to ${uid}`, err);
    }
  }
});