'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/utils/firebaseClient';
import { User, onAuthStateChanged } from 'firebase/auth';
import { getPassPhrase } from '@/utils/chatServices';
import { setUserUID } from '@/utils/encryption';

import { ReactNode } from 'react';

const JournalLoader = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phrase, setPassPhrase] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Initialize authentication and user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserUID(firebaseUser.uid); // Set user UID for encryption

        // Initialize app data
        initializeUserData(firebaseUser.uid);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize user data, passphrase, and user profile
  const initializeUserData = async (userId: string) => {
    try {
      // Get passphrase for encryption
      const phrase = await getPassPhrase();
      if (phrase) {
        setPassPhrase(phrase);
      } else {
        console.error("No passphrase found for user");
      }
            
    }
    catch (error) {
      console.error("Error initializing user data:", error);
      setError("Failed to initialize user data. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return <div className="text-center py-8">Loading your journal...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-red-700">Error Loading Journal</h2>
          <p className="text-red-600">{error}</p>
          <div className="mt-4">
            <p className="text-gray-700">This may be because:</p>
            <ul className="list-disc pl-5 mt-2 text-gray-700">
              <li>Your account is not fully set up</li>
              <li>You need to refresh your browser</li>
              <li>There's a temporary service issue</li>
            </ul>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Refresh Page
              </button>
              <button
                onClick={() => router.push('/settings/security')}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Go to Security Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default JournalLoader;
