// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/utils/firebaseClient'; // Adjust import
import { onAuthStateChanged } from 'firebase/auth'; // Adjust import
import { setUserUID } from '@/utils/encryption'; 
import RecoveryModal from '@/components/RecoveryModal'; // Assuming this path is correct

interface AuthContextType {
  currentUser: any; // Use proper Firebase User type
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
  
  const value: AuthContextType = {
    currentUser,
    loading,
    encryptionReady,
    needsRecovery,
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