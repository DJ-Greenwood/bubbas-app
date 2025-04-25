import CryptoJS from "crypto-js";
import { JournalEntry } from "@/types/JournalEntry";

const ENCRYPT_KEY = process.env.NEXT_PUBLIC_BUBBA_ENCRYPT_KEY!;

const encryptField = (text: string): string => {
  return CryptoJS.AES.encrypt(text, ENCRYPT_KEY).toString();
};

const decryptField = (cipher: string): string => {
  const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPT_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// 🔐 Only encrypt/decrypt userText and bubbaReply
export const encryptData = (entry: JournalEntry): JournalEntry => {
  return {
    ...entry,
    userText: encryptField(entry.userText),
    bubbaReply: encryptField(entry.bubbaReply),
  };
};

export const decryptData = (entry: JournalEntry): JournalEntry => {
  return {
    ...entry,
    userText: decryptField(entry.userText),
    bubbaReply: decryptField(entry.bubbaReply),
  };
};

export const encryptDataArray = (entries: JournalEntry[]): JournalEntry[] => {
  return entries.map(encryptData);
};

export const decryptDataArray = (entries: JournalEntry[]): JournalEntry[] => {
  return entries.map(decryptData);
};
