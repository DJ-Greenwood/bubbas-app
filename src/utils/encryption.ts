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

// Generate a strong random encryption key (not based on Decryption Key)
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
export const setupEncryption = async (userDecryptionKey: string): Promise<{recoveryCode: string}> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User UID not set! Please log in first.");
  }
  
  const userUID = user.uid;
  
  // Generate a random encryption key
  const encryptionKey = generateEncryptionKey();
  
  // Generate a recovery code
  const recoveryCode = generateRecoveryCode();
  
  // Encrypt master key with Decryption Key
  const decryptionKey = CryptoJS.PBKDF2(userDecryptionKey, userUID + appSalt, { 
    keySize: 256/32, 
    iterations: 10000 
  }).toString();
  
  const encryptedMasterKey = CryptoJS.AES.encrypt(encryptionKey, decryptionKey).toString();
  
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
    console.log("Using masterKey from session storage");
    return storedKey;
  }
  
  try {
    // Try to get from cloud storage
    console.log("Trying to get masterKey from cloud");
    const key = await getKeyFromUserCloud();
    if (key) {
      console.log("Got masterKey from cloud");
      sessionStorage.setItem('masterKey', key);
      return key;
    }
    console.log("No masterKey in cloud");
  } catch (error) {
    console.error("Error getting key from cloud:", error);
  }
  
  // If we can't get from cloud, try using Decryption Key as a fallback
  try {
    console.log("Trying to use Decryption Key as fallback for masterKey");
    const decryptionKey = await getDecryptionKey();
    if (decryptionKey) {
      console.log("Using Decryption Key as masterKey");
      sessionStorage.setItem('masterKey', decryptionKey);
      return decryptionKey;
    }
  } catch (decryptionKeyError) {
    console.error("Error getting Decryption Key:", decryptionKeyError);
  }
  
  // Generate a deterministic key as last resort
  const user = auth.currentUser;
  if (user) {
    console.log("Generating deterministic masterKey as last resort");
    const deterministicKey = CryptoJS.SHA256(user.uid + appSalt).toString();
    sessionStorage.setItem('masterKey', deterministicKey);
    return deterministicKey;
  }
  
  // If we can't get from cloud or generate a fallback, throw an error
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

// Get the user's Decryption Key from the database
export const getDecryptionKey = async (): Promise<string> => {
  console.log("getDecryptionKey called");
  const user = auth.currentUser;
  if (!user) {
    console.warn("No authenticated user found");
    throw new Error("User not authenticated");
  }

  try {
    // First try looking in the userKeys collection
    console.log("Checking userKeys collection");
    const keyDoc = doc(db, "userKeys", user.uid);
    const keySnap = await getDoc(keyDoc);
    
    if (keySnap.exists() && keySnap.data().encryptionKey) {
      console.log("Found encryption key in userKeys");
      return keySnap.data().encryptionKey;
    }

    // Then try user document
    console.log("Checking user document");
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      // Try multiple possible paths
      const userData = userDocSnap.data();
      
      // Check all possible paths for Decryption Key
      const decryptionKey = 
        userData?.preferences?.security?.decryptionKey || 
        userData?.preferences?.security?.DecryptionKey || 
        userData?.decryptionKey ||
        userData?.DecryptionKey;

      if (decryptionKey) {
        console.log("Found Decryption Key in user document");
        return decryptionKey;
      }
    }

    // Generate a deterministic Decryption Key as fallback
    console.log("Generating deterministic Decryption Key");
    return CryptoJS.SHA256(user.uid + appSalt).toString();
  } catch (error) {
    console.error("Failed to fetch Decryption Key:", error);
    
    // Generate a deterministic Decryption Key as fallback
    console.log("Generating deterministic Decryption Key after error");
    return CryptoJS.SHA256(user.uid + appSalt).toString();
  }
};

// IMPORTANT: Make decryptData and encryptField use the same encryption system
// for compatibility between components

// Encrypt data object - now uses the unified key system
export const encryptData = async (data: object): Promise<string> => {
  const rawData = JSON.stringify(data);
  // Always use getMasterKey for consistency
  const masterKey = await getMasterKey();
  return CryptoJS.AES.encrypt(rawData, masterKey).toString();
};

// Decrypt data - now uses the unified key system
export const decryptData = async (encryptedData: string): Promise<string> => {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      console.warn("⚠️ No data to decrypt or invalid type");
      return "[Invalid]";
    }

    // Always use getMasterKey for consistency
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

// Encrypt a single field - uses the unified key system
export const encryptField = async (text: string): Promise<string> => {
  // Always use getMasterKey for consistency
  const masterKey = await getMasterKey();
  return CryptoJS.AES.encrypt(text, masterKey).toString();
};

// Decrypt a single field - uses the unified key system
export const decryptField = async (cipherText: string): Promise<string> => {
  try {
    // Always use getMasterKey for consistency
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


// Recover with Decryption Key
export const recoverWithDecryptionKey = async (decryptionKey: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const userUID = user.uid;

    // Derive the Decryption Key
    const derivedDecryptionKey = CryptoJS.PBKDF2(decryptionKey, userUID + appSalt, {
      keySize: 256 / 32,
      iterations: 10000,
    }).toString();

    // Fetch the encrypted master key from Firestore
    const userDocRef = doc(collection(db, "users"), userUID);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.error("User document not found");
      return false;
    }

    const encryptedMasterKey = userDocSnap.data()?.encryptedMasterKey;
    if (!encryptedMasterKey) {
      console.error("Encrypted master key not found");
      return false;
    }

    // Decrypt the master key
    const bytes = CryptoJS.AES.decrypt(encryptedMasterKey, derivedDecryptionKey);
    const decryptedMasterKey = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedMasterKey) {
      console.error("Failed to decrypt master key");
      return false;
    }

    sessionStorage.setItem("masterKey", decryptedMasterKey);
    console.log("Master key successfully recovered and stored");
    return true;

  } catch (error) {
    console.error("Error during recovery with Decryption Key:", error);
    return false;
  }
};

// Recover with code
export const recoverWithCode = async (recoveryCode: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const userUID = user.uid;

    // Derive the recovery key
    const recoveryKey = CryptoJS.SHA256(recoveryCode + appSalt).toString();

    // Fetch the encrypted master key from Firestore
    const userDocRef = doc(collection(db, "users"), userUID);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.error("User document not found");
      return false;
    }

    const encryptedRecoveryKey = userDocSnap.data()?.encryptedRecoveryKey;
    if (!encryptedRecoveryKey) {
      console.error("Encrypted recovery key not found");
      return false;
    }

    // Decrypt the master key
    const bytes = CryptoJS.AES.decrypt(encryptedRecoveryKey, recoveryKey);
    const decryptedMasterKey = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedMasterKey) {
      console.error("Failed to decrypt master key");
      return false;
    }

    sessionStorage.setItem("masterKey", decryptedMasterKey);
    console.log("Master key successfully recovered and stored");
    return true;

  } catch (error) {
    console.error("Error during recovery with code:", error);
    return false;
  }
};
