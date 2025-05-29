
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/utils/firebaseClient'; // Adjust import
import { onAuthStateChanged } from 'firebase/auth'; // Adjust import
import RecoveryModal from '@/components/RecoveryModal'; // Assuming this path is correct
import { User } from 'firebase/auth'; // Import User type

// Assuming you have a function to check recovery status
// This is a placeholder and needs to be implemented based on your app's logic
async function checkIfUserNeedsRecovery(uid: string): Promise<boolean> {
  // Example: Check if a user's encryption key is missing or marked for recovery in your database
  // Replace with actual logic
  console.log(`Checking if user ${uid} needs recovery...`);
  // For demonstration, let's say a user with specific UID needs recovery
  // return uid === "some-uid-that-needs-recovery";
  return false; // Default to false for now
}

interface AuthContextType {
  currentUser: User | null; // Use Firebase User type
  loading: boolean;
  needsRecovery: boolean; // Added needsRecovery to AuthContextType
  encryptionReady: boolean;
  }
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  encryptionReady: false,
 needsRecovery: false,
});

export const useAuth = () => useContext(AuthContext);

export const setUserUID = (uid: string): void => {
  sessionStorage.setItem("userUID", uid);
};

export const getUserUID = (): string | null => {
  return sessionStorage.getItem("userUID");
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Use Firebase User type
  const [loading, setLoading] = useState(true);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // User is signed in
        setUserUID(user.uid);

        // *** Determine if recovery is needed ***
        try {
          const userNeedsRecovery = await checkIfUserNeedsRecovery(user.uid);
          setNeedsRecovery(userNeedsRecovery);

          // If no recovery is needed, encryption is ready
          if (!userNeedsRecovery) {
            setEncryptionReady(true);
          }
        } catch (error) {
          console.error("Error checking recovery status:", error);
          // Decide how to handle this error, e.g., assume recovery is needed or log out
          setNeedsRecovery(true); // Or set an error state
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []); // Empty dependency array means this runs once on mount

  const handleRecoverySuccess = () => {
    setNeedsRecovery(false);
    setEncryptionReady(true);
  };
  
  const handleRecoveryCancel = () => {
    // Log out the user if they cancel recovery
    auth.signOut();
    setUserUID(""); // Clear UID from session storage on logout
    setNeedsRecovery(false);
    setEncryptionReady(false); // Reset encryptionReady as well
  };
  const value: AuthContextType = {
    currentUser,
    loading,
    encryptionReady,
    needsRecovery,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
      {needsRecovery && (
        <RecoveryModal
          isOpen={needsRecovery} // Pass needsRecovery directly
          onSuccess={handleRecoverySuccess}
          onCancel={handleRecoveryCancel}
        />
      )}
    </AuthContext.Provider>
  );
};
