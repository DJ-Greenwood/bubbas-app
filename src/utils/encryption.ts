// src/utils/encryption.ts
import CryptoJS from "crypto-js";
import { JournalEntry } from "@/types/JournalEntry";

const ENCRYPT_KEY = process.env.NEXT_PUBLIC_BUBBA_ENCRYPT_KEY!;

export const encryptEntry = (data: JournalEntry): string => {
  const raw = JSON.stringify(data);
  return CryptoJS.AES.encrypt(raw, ENCRYPT_KEY).toString();
};

export const decryptEntry = (encrypted: string): JournalEntry => {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPT_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted);
};