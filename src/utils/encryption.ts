// src/utils/encryption.ts
import CryptoJS from "crypto-js";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db } from "@/utils/firebaseClient";
import { useAuth } from "@/components/context/AuthContext";
import { auth } from "@/utils/firebaseClient";

const appSalt = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || "default-app-salt-please-change-me";

// Get the master key for a user from the userKeys collection
export const getMasterKey = async (userUID: string): Promise<string | null> => {
  try {
    const userKeysDocRef = doc(collection(db, "userKeys"), userUID);
    const userKeysDocSnap = await getDoc(userKeysDocRef);

    if (!userKeysDocSnap.exists()) {
      console.error("User keys document not found");
      return null;
    }

    const masterKey = userKeysDocSnap.data()?.masterKey;

    if (!masterKey) {
      console.error("Master key not found in user keys document");
      return null;
    }

    return masterKey as string; // Type assertion based on expected data structure

  } catch (error) {
    console.error("Error getting master key:", error);
    return null;
  }
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
  const { currentUser } = useAuth();
  
  if (!currentUser?.uid) {
    throw new Error("User UID not set! Please log in first.");
  }
  
  const userUID = currentUser.uid;
  
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
  
  return { recoveryCode };
};

// export const getPassPhrase = async (): Promise<string> => {
//   // ... original getPassPhrase logic removed ...
// };

// Recover with passphrase
export const recoverWithPassphrase = async (passphrase: string): Promise<string | null> => {
  try {
    // Use the auth context to get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const userUID = user.uid;

    // Derive the passphrase key
    const passphraseKey = CryptoJS.PBKDF2(passphrase, userUID + appSalt, {
      keySize: 256 / 32,
      iterations: 10000,
    }).toString();

    // Fetch the encrypted master key from Firestore
    const userDocRef = doc(collection(db, "users"), userUID);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.error("User document not found");
      return null;
    }

    const encryptedMasterKey = userDocSnap.data()?.encryptedMasterKey;
    if (!encryptedMasterKey) {
      console.error("Encrypted master key not found");
      return null;
    }

    // Decrypt the master key
    const bytes = CryptoJS.AES.decrypt(encryptedMasterKey, passphraseKey);
    const decryptedMasterKey = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedMasterKey) {
      console.error("Failed to decrypt master key");
      return null;
    }

    // Return the decrypted master key
    return decryptedMasterKey;

  } catch (error) {
    console.error("Error during recovery with passphrase:", error);
    return null;
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

    // We no longer store the master key in session storage here
    console.log("Master key successfully recovered with code (not stored in session storage)");
    // Return the decrypted master key
    return true;

  } catch (error) {
    console.error("Error during recovery with code:", error);
    return false;
  }
};

// Removed getMasterKey function as masterKey is now passed directly

// Encrypt a field using the provided master key
export const encryptField = (masterKey: string, data: string): string | null => {
 return CryptoJS.AES.encrypt(data, masterKey).toString();
};

// Decrypt a field using the master key
export const decryptField = (encryptedData: string, masterKey: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, masterKey);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedData) {
        console.error("Failed to decrypt field");
        return null;
    }
    return decryptedData;
  } catch (error) {
    console.error("Error decrypting field:", error);
    return null;
  }
};

// Suggested code may be subject to a license. Learn more: ~LicenseLog:3216598470.

export const loadMasterKeyAndPerformAction = async <T>(
  userUID: string,
  action: (masterKey: string) => Promise<T>
): Promise<T | null> => {
  try {
    const userDocRef = doc(collection(db, "users"), userUID);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.error("User document not found");
      return null;
    }

    const encryptedMasterKey = userDocSnap.data()?.encryptedMasterKey;
    if (!encryptedMasterKey) {
      console.error("Encrypted master key not found in document");
      return null;
    }

    // Note: To decrypt, we need the passphrase or recovery key.
    // This function assumes the decryption logic happens *before* calling this.
    // A more complete solution would involve decrypting here using a key
    // retrieved elsewhere (e.g., from user session after a successful login/recovery).
    // For this simplified example, we'll just log a warning.

    console.warn("Master key is encrypted in Firestore. Decryption logic required before use.");
    // You would need to add decryption logic here, likely requiring the user's passphrase
    // or the recovery code to derive the correct decryption key.

    // Placeholder: Assuming you had the decrypted master key (decryptedMasterKey)
    // const decryptedMasterKey = "YOUR_DECRYPTED_MASTER_KEY"; // Replace with actual decryption logic

    // For demonstration purposes, let's assume a function `decryptMasterKeyWithSessionKey`
    // exists that uses a temporary key derived during login/recovery.
    // This is a simplification; a robust system needs careful key management.
    
    // Example placeholder for decryption (requires session/passphrase derived key)
    // const sessionDerivedKey = getSessionDerivedKey(); // Function to get key from session
    // if (!sessionDerivedKey) {
    //     console.error("Session key not available for decryption.");
    //     return null;
    // }
    // const bytes = CryptoJS.AES.decrypt(encryptedMasterKey, sessionDerivedKey);
    // const decryptedMasterKey = bytes.toString(CryptoJS.enc.Utf8);
    
    // if (!decryptedMasterKey) {
    //     console.error("Failed to decrypt master key from Firestore.");
    //     return null;
    // }

    // *** IMPORTANT ***
    // The following line is a placeholder and assumes you have the decrypted key.
    // You MUST replace this with logic that safely decrypts the key using a
    // key that IS NOT STORED long-term (e.g., derived from user login passphrase).
    const decryptedMasterKey = "PLACEHOLDER_DECRYPTED_KEY"; // Replace with actual decryption logic

    // Perform the action with the master key
    const result = await action(decryptedMasterKey);

    // No need to explicitly clear from session storage here, as we are loading
    // it for a single action and not storing it long-term in session storage
    // in this updated flow.

    return result;

  } catch (error) {
    console.error("Error loading master key or performing action:", error);
    return null;
  }
};

