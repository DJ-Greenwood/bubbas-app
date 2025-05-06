// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/utils/firebaseClient'; // Adjust import
import { onAuthStateChanged } from 'firebase/auth'; // Adjust import
import { setUserUID, getMasterKey } from '@/utils/encryption';
import RecoveryModal from '@/components/RecoveryModal';

interface AuthContextType {
  currentUser: any; // Use proper Firebase User type
  loading: boolean;
  encryptionReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  encryptionReady: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null); // Use proper Firebase User type
  const [loading, setLoading] = useState(true);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // User is signed in
        setUserUID(user.uid);
        
        // Try to get encryption key
        try {
          await getMasterKey();
          setEncryptionReady(true);
        } catch (error) {
          if (error instanceof Error && error.message === "ENCRYPTION_KEY_REQUIRED") {
            setNeedsRecovery(true);
          } else {
            console.error("Error getting encryption key:", error);
          }
        }
      } else {
        // User is signed out
        setEncryptionReady(false);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  const handleRecoverySuccess = () => {
    setNeedsRecovery(false);
    setEncryptionReady(true);
  };
  
  const handleRecoveryCancel = () => {
    // Log out the user if they cancel recovery
    auth.signOut();
    setNeedsRecovery(false);
  };
  
  const value = {
    currentUser,
    loading,
    encryptionReady
  };
  
  return (
    <AuthContext.Provider value={value}>
      {needsRecovery && (
        <RecoveryModal
          isOpen={true}
          onSuccess={handleRecoverySuccess}
          onCancel={handleRecoveryCancel}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
};