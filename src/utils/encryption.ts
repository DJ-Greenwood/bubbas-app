// src/utils/encryption.ts
import CryptoJS from "crypto-js";

// Dynamic user-specific key
const getKey = (passPhrase: string): string => {
  return CryptoJS.SHA256(passPhrase).toString();
};

// Encrypts full object OR string safely
export const encryptData = (data: object | string, passPhrase: string): string => {
  const rawData = typeof data === "string" ? data : JSON.stringify(data);
  const key = getKey(passPhrase);
  return CryptoJS.AES.encrypt(rawData, key).toString();
};

// Decrypts safely and returns parsed object or string
export const decryptData = (encryptedData: string, passPhrase: string): any => {
  try {
    const key = getKey(passPhrase);
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error("Empty decryption result");
    try {
      return JSON.parse(decrypted); // Try to parse as object
    } catch {
      return decrypted; // If not JSON, return as plain string
    }
  } catch (error) {
    console.error("Decryption failed:", error);
    return undefined;
  }
};

// Encrypts small fields (e.g., passphrase) securely
export const encryptField = (text: string, passPhrase: string): string => {
  const key = getKey(passPhrase);
  return CryptoJS.AES.encrypt(text, key).toString();
};

// Decrypts small fields with error fallback
export const decryptField = (cipherText: string, passPhrase: string): string => {
  try {
    const key = getKey(passPhrase);
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error("Empty decrypted field");
    return decrypted;
  } catch (error) {
    console.error("Field decryption failed:", error);
    return "[Error decrypting]";
  }
};
