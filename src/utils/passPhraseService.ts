import { auth, db } from '../utils/firebaseClient';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Fetches the user's encrypted passPhrase from Firestore.
 * Returns the passPhrase as a string if found, otherwise null.
 */
export const fetchPassPhrase = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userPreferencesRef = collection(db, "users", user.uid, "preferences");
    const snapshot = await getDocs(userPreferencesRef);
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.passPhrase) {
        return data.passPhrase;
      }
    }

    console.warn("⚠️ No passphrase found for this user.");
    return null;
  } catch (error) {
    console.error("Failed to fetch passphrase:", error);
    return null;
  }
};
