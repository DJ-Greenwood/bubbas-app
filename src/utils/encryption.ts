'use client';
// src/utils/encryption.ts
import CryptoJS from "crypto-js";
import { db } from "@/utils/firebaseClient"; // Import your Firebase database instance
import { collection, doc, setDoc } from "firebase/firestore"; // Import Firestore functions

// App-wide salt for encryption
// const appSalt = "app-wide-salt"; // Replace with a secure salt
// Note: App-wide salt should be used, howeverI have chosen not to use it. The user is required to provice a passphrase this pass phrase is encrypted with their UID as a salt. 
// This is a more secure approach as it ties the encryption to the user.
// This way, I or any one that has the data and the UID can only have 1 key the passphrase is never required again by the system or the user. The encrypted passphrase is stored in the database as an encrypted field.
// I also include a device secret that is generated and encrypted with the passphrase. This is used to encrypt the device secret and store locally on the device.
// This way, the device secret is never stored in plain text and is tied to the user and the device.

let userUID = ""; // Initialize empty

// Set user UID at login/signup
export const setUserUID = (uid: string) => {
  userUID = uid;
};

// Set encryption passphrase - new function
export const setEncryptionPassphrase = (passphrase: string): string => {
  if (!userUID) {
    throw new Error("User UID not set! Please call setUserUID(uid) after login.");
  }
  
  // Generate a more secure key by combining passphrase with user-specific salt
  const userSpecificSalt = passphrase;
  
  // Encrypt the passphrase itself using the user's UID as part of the key
  const encryptedPassphrase = CryptoJS.AES.encrypt(
    passphrase, 
    CryptoJS.SHA256(userUID + userSpecificSalt).toString()
  ).toString();
  
  return encryptedPassphrase;
};



// Encrypt a device-specific secret
export const encryptDeviceSecret = (deviceSecret: string, passPhrase: string): string => {
  const key = getKey(passPhrase);
  return CryptoJS.AES.encrypt(deviceSecret, key).toString();
};

// Get encryption key (passPhrase + per-user salt)
export const getKey = (passPhrase: string): string => {
  if (!userUID) {
    throw new Error("User UID not set! Please call setUserUID(uid) after login.");
  }

  return CryptoJS.SHA256(passPhrase + userUID).toString();
};

// Encrypt a full data object
export const encryptData = (data: object, passPhrase: string): string => {
  const rawData = JSON.stringify(data);
  const key = getKey(passPhrase);
  return CryptoJS.AES.encrypt(rawData, key).toString();
};

// Decrypt a full data object
export const decryptData = (encryptedData: string, passPhrase: string): string => {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      console.warn("⚠️ No data to decrypt or invalid type");
      return "[Invalid]";
    }

    const key = getKey(passPhrase);
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

