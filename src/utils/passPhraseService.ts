// src/utils/passPhraseService.ts
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebaseClient';
import { decryptData } from './encryption';

// Cache the passphrase in memory for the session
let cachedPassPhrase: string | null = null;

// Fetch the passphrase from Firestore and decrypt it if necessary
export const fetchPassPhrase = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) {
    console.warn("No authenticated user");
    return null;
  }

  try {
    // Get user document
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.warn("User document not found");
      return null;
    }

    const userData = userDocSnap.data();
    const encryptedPassPhrase = userData?.preferences?.security?.passPhrase;

    if (!encryptedPassPhrase) {
      console.warn("No passphrase found in user preferences");
      return null;
    }

    try {
      // Try to decrypt the passphrase - it might be stored as an object
      const decryptedData = decryptData(encryptedPassPhrase, encryptedPassPhrase);
      try {
        // Try to parse as JSON if it was stored that way
        const parsed = JSON.parse(decryptedData);
        return parsed.key || parsed.passPhrase || decryptedData;
      } catch {
        // If not JSON, return the raw decrypted value
        return decryptedData;
      }
    } catch (error) {
      // If decryption fails, it might be stored in plaintext
      console.log("Using passphrase directly");
      return encryptedPassPhrase;
    }
  } catch (error) {
    console.error("Error fetching passphrase:", error);
    return null;
  }
};

// Function to get the passphrase, using cache if available
export const getPassPhrase = async (): Promise<string | null> => {
  if (cachedPassPhrase) return cachedPassPhrase;
  
  const passPhrase = await fetchPassPhrase();
  if (passPhrase) {
    cachedPassPhrase = passPhrase;
  }
  
  return passPhrase;
};

// Clear the cached passphrase (e.g., on logout)
export const clearCachedPassPhrase = () => {
  cachedPassPhrase = null;
};