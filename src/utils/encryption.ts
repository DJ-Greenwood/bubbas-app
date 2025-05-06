// src/utils/encryption.ts
import CryptoJS from "crypto-js";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db, auth } from "@/utils/firebaseClient";

const appSalt = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || "default-app-salt-please-change-me";

// Set user UID at login/signup
export const setUserUID = (uid: string) => {
  // This should be handled by the auth system, not stored locally
  console.log("Setting user UID:", uid.substring(0, 4) + "...");
};

// Generate a strong random encryption key (not based on passphrase)
export const generateEncryptionKey = (): string => {
  const array = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// Generate a human-readable recovery code
export const generateRecoveryCode = (): string => {
  const words = ["APPLE", "BANANA", "CHERRY", "DOG", "ELEPHANT", "FISH", 
                "GREEN", "HORSE", "IGLOO", "JUMP", "KITE", "LEMON",
                "MOON", "NIGHT", "ORANGE", "PURPLE", "QUEEN", "RED",
                "STAR", "TREE", "UMBRELLA", "VIOLET", "WHITE", "YELLOW"];
  
  const randomWords = [];
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    randomWords.push(words[randomIndex]);
  }
  
  // Add 4 random digits
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  
  return randomWords.join('-') + '-' + digits;
};

// Setup encryption during signup
export const setupEncryption = async (userPassphrase: string): Promise<{recoveryCode: string}> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User UID not set! Please log in first.");
  }
  
  const userUID = user.uid;
  
  // Generate a random encryption key
  const encryptionKey = generateEncryptionKey();
  
  // Generate a recovery code
  const recoveryCode = generateRecoveryCode();
  
  // Encrypt master key with passphrase
  const passphraseKey = CryptoJS.PBKDF2(userPassphrase, userUID + appSalt, { 
    keySize: 256/32, 
    iterations: 10000 
  }).toString();
  
  const encryptedMasterKey = CryptoJS.AES.encrypt(encryptionKey, passphraseKey).toString();
  
  // Encrypt master key with recovery code
  const recoveryKey = CryptoJS.SHA256(recoveryCode + appSalt).toString();
  const encryptedRecoveryKey = CryptoJS.AES.encrypt(encryptionKey, recoveryKey).toString();
  
  // Store the encrypted keys in Firestore
  const usersCollection = collection(db, "users");
  const docRef = doc(usersCollection, userUID);
  
  await setDoc(docRef, {
    encryptedMasterKey,
    encryptedRecoveryKey,
    encryptionEnabled: true,
    encryptionSetupDate: new Date()
  }, { merge: true });
  
  // Store the encryption key in the user's cloud account
  await storeKeyInUserCloud(encryptionKey);
  
  // Also store locally
  sessionStorage.setItem('masterKey', encryptionKey);
  
  return { recoveryCode };
};

// Store the key in user's cloud account
const storeKeyInUserCloud = async (encryptionKey: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not logged in");
  }
  
  // Store in a special Firestore collection with tight security rules
  const keysCollection = collection(db, "userKeys");
  const keyDoc = doc(keysCollection, user.uid);
  
  await setDoc(keyDoc, {
    encryptionKey: encryptionKey,
    lastUpdated: new Date()
  }, { merge: true });
};

// Get the master key - this tries cloud storage first
export const getMasterKey = async (): Promise<string> => {
  // First check if we have it in session storage
  const storedKey = sessionStorage.getItem('masterKey');
  if (storedKey) {
    return storedKey;
  }
  
  try {
    // Try to get from cloud storage
    const key = await getKeyFromUserCloud();
    if (key) {
      sessionStorage.setItem('masterKey', key);
      return key;
    }
  } catch (error) {
    console.error("Error getting key from cloud:", error);
  }
  
  // If we can't get from cloud, try recovery with passphrase
  throw new Error("ENCRYPTION_KEY_REQUIRED");
};

// Get key from user's cloud account
const getKeyFromUserCloud = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  
  // Read from Firestore
  const keysCollection = collection(db, "userKeys");
  const keyDoc = doc(keysCollection, user.uid);
  const keySnap = await getDoc(keyDoc);
  
  if (keySnap.exists()) {
    return keySnap.data().encryptionKey || null;
  }
  
  return null;
};

// Get the user's passphrase from the database
export const getPassPhrase = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) {
    console.warn("No authenticated user found");
    return null;
  }

  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data() as { preferences?: { security?: { passPhrase?: string } } };
      const passPhrase = userData?.preferences?.security?.passPhrase;

      if (passPhrase) {
        return passPhrase;
      }
    }

    console.warn("User passphrase not found in Firestore");
    return null;
  } catch (error) {
    console.error("Failed to fetch passPhrase from Firestore:", error);
    throw new Error("Failed to fetch passPhrase");
  }
};

// Recover using passphrase
export const recoverWithPassphrase = async (passphrase: string): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }
  
  const userUID = user.uid;
  
  const usersCollection = collection(db, "users");
  const docRef = doc(usersCollection, userUID);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return false;
  }
  
  const userData = docSnap.data();
  const encryptedMasterKey = userData.encryptedMasterKey;
  
  if (!encryptedMasterKey) {
    return false;
  }
  
  try {
    // Derive the passphrase key
    const passphraseKey = CryptoJS.PBKDF2(passphrase, userUID + appSalt, { 
      keySize: 256/32, 
      iterations: 10000 
    }).toString();
    
    // Decrypt the master key
    const bytes = CryptoJS.AES.decrypt(encryptedMasterKey, passphraseKey);
    const masterKey = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!masterKey) {
      return false;
    }
    
    // Store the key in cloud and session
    await storeKeyInUserCloud(masterKey);
    sessionStorage.setItem('masterKey', masterKey);
    
    return true;
  } catch (error) {
    console.error("Error recovering with passphrase:", error);
    return false;
  }
};

// Recover using recovery code
export const recoverWithCode = async (recoveryCode: string): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }
  
  const userUID = user.uid;
  
  const usersCollection = collection(db, "users");
  const docRef = doc(usersCollection, userUID);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return false;
  }
  
  const userData = docSnap.data();
  const encryptedRecoveryKey = userData.encryptedRecoveryKey;
  
  if (!encryptedRecoveryKey) {
    return false;
  }
  
  try {
    // Derive the recovery key
    const recoveryKey = CryptoJS.SHA256(recoveryCode + appSalt).toString();
    
    // Decrypt the master key
    const bytes = CryptoJS.AES.decrypt(encryptedRecoveryKey, recoveryKey);
    const masterKey = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!masterKey) {
      return false;
    }
    
    // Store the key in cloud and session
    await storeKeyInUserCloud(masterKey);
    sessionStorage.setItem('masterKey', masterKey);
    
    return true;
  } catch (error) {
    console.error("Error recovering with code:", error);
    return false;
  }
};

// Encrypt data object
export const encryptData = async (data: object): Promise<string> => {
  const rawData = JSON.stringify(data);
  const masterKey = await getMasterKey();
  return CryptoJS.AES.encrypt(rawData, masterKey).toString();
};

// Decrypt data object
export const decryptData = async (encryptedData: string): Promise<string> => {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      console.warn("⚠️ No data to decrypt or invalid type");
      return "[Invalid]";
    }

    const masterKey = await getMasterKey();
    const bytes = CryptoJS.AES.decrypt(encryptedData, masterKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      console.warn("⚠️ Decryption failed, empty result");
      return "[Decryption Error]";
    }

    return decrypted;
  } catch (error) {
    if (error instanceof Error && error.message === "ENCRYPTION_KEY_REQUIRED") {
      throw error; // Rethrow this specific error
    }
    console.error("❌ Decryption failed:", error);
    return "[Error]";
  }
};

// Encrypt a single field
export const encryptField = async (text: string): Promise<string> => {
  const masterKey = await getMasterKey();
  return CryptoJS.AES.encrypt(text, masterKey).toString();
};

// Decrypt a single field
export const decryptField = async (cipherText: string): Promise<string> => {
  try {
    const masterKey = await getMasterKey();
    const bytes = CryptoJS.AES.decrypt(cipherText, masterKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    if (error instanceof Error && error.message === "ENCRYPTION_KEY_REQUIRED") {
      throw error; // Rethrow this specific error
    }
    console.error("❌ Field decryption failed:", error);
    return "[Error]";
  }
};