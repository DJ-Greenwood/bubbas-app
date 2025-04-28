// src/utils/encryption.ts
import CryptoJS from "crypto-js";

const appSalt = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || "default-app-salt-please-change-me";

let userUID = ""; // Initialize empty

// Set user UID at login/signup
export const setUserUID = (uid: string) => {
  userUID = uid;
};

// Get encryption key (passPhrase + per-user salt)
export const getKey = (passPhrase: string): string => {
  if (!userUID) {
    throw new Error("User UID not set! Please call setUserUID(uid) after login.");
  }
  const userSpecificSalt = userUID + appSalt;
  return CryptoJS.SHA256(passPhrase + userSpecificSalt).toString();
};

// Encrypt a full data object
export const encryptData = (data: object, passPhrase: string): string => {
  const rawData = JSON.stringify(data);
  const key = getKey(passPhrase);
  return CryptoJS.AES.encrypt(rawData, key).toString();
};

// Decrypt a full data object
export const decryptData = (encryptedData: string, key: string): string => {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      console.warn("⚠️ No data to decrypt or invalid type");
      return "[Invalid]";
    }

    // Optional: Validate if it's probably encrypted (quick basic check)
    if (!encryptedData.includes("Salted__")) {
      console.warn("⚠️ Data does not look encrypted, skipping decryption");
      return encryptedData;
    }

    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      console.warn("⚠️ Decryption failed, empty result");
      return "[Decryption Error]";
    }

    return decrypted;
  } catch (error) {
    console.error("❌ Decryption failed:", error);
    return "[Error]";
  }
};

// Encrypt a single field
export const encryptField = (text: string, passPhrase: string): string => {
  const key = getKey(passPhrase);
  return CryptoJS.AES.encrypt(text, key).toString();
};

// Decrypt a single field
export const decryptField = (cipherText: string, passPhrase: string): string => {
  const key = getKey(passPhrase);
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// ----------------------
// NEW: Device Secret Handshake logic
// ----------------------

// Generate a new device secret (random UUID)
export const generateDeviceSecret = (): string => {
  // Use random UUID or randomHex here
  return crypto.randomUUID(); // Built-in secure random generator
};

// Encrypt the device secret using user passPhrase
export const encryptDeviceSecret = (deviceSecret: string, userPassPhrase: string): string => {
  const key = getKey(userPassPhrase);
  return CryptoJS.AES.encrypt(deviceSecret, key).toString();
};

// Decrypt the device secret using user passPhrase
export const decryptDeviceSecret = (encryptedDeviceSecret: string, userPassPhrase: string): string => {
  try {
    const key = getKey(userPassPhrase);
    const bytes = CryptoJS.AES.decrypt(encryptedDeviceSecret, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Device secret decryption failed:", error);
    return "[Error decrypting device secret]";
  }
};

// Derive encryption key from device secret (for journal encryption)
export const getEncryptionKeyFromDeviceSecret = (deviceSecret: string): string => {
  return CryptoJS.SHA256(deviceSecret + appSalt).toString(); // Add salt for extra safety
};
