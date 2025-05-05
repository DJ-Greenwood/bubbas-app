'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntry } from '@/types/JournalEntry';
import JournalCard from './Journal/JournalCard';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebaseClient'; // Adjust the import based on your project structure 
import { setUserUID } from '@/utils/encryption';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { loadChats, softDeleteConversation, editConversation, getPassPhrase } from '@/utils/chatServices';
import { stopSpeaking } from '@/utils/tts'; // Assuming this is defined elsewhere

const JournalPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passPhrase, setPassPhrase] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // State to store the authenticated user
  const router = useRouter();

  const initializeUserData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);

    try {
      // Set user UID for encryption utilities
      setUserUID(uid);

      // Get passphrase once and store it
      const phrase = await getPassPhrase();
      if (!phrase) {
        console.debug('Retrieved passphrase:', phrase);
        setError('Could not retrieve encryption key. Please check your user profile or contact support.');
        setLoading(false);
        setEntries([]);
        return false;
      }

      // Store the passphrase for future use
      setPassPhrase(phrase);
      return true;
    } catch (err) {
      console.error('Failed to initialize user data:', err);
      setError('Failed to initialize: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
      setEntries([]);
      return false;
    }
  }, []);

  const loadJournalEntries = useCallback(async () => {
    if (!passPhrase || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Load active chat entries with the stored passphrase
      const journalEntries = await loadChats('active', passPhrase, user.uid);

      // Handle the case where journalEntries is null or undefined
      if (!journalEntries) {
        console.log('No journal entries returned, setting empty array');
        setEntries([]);
      } else {
        // Set the entries
        setEntries(journalEntries);
      }
    } catch (err) {
      console.error('Failed to load journal entries:', err);
      setError('Failed to load journal entries: ' + (err instanceof Error ? err.message : String(err)));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [passPhrase, user]);

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
      stopSpeaking(); // Stop any speech when component unmounts
    };
  }, [initializeUserData]);

  useEffect(() => {
    loadJournalEntries();
  }, [loadJournalEntries]);

  const handleSoftDelete = async (timestamp: string) => {
    try {
      setEntries((prev) => prev.filter((entry) => entry.timestamp !== timestamp));

      if (!user) {
        setError('User not authenticated. Please log in.');
        return;
      }

      await softDeleteConversation(timestamp, user.uid);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      setError('Failed to delete entry: ' + (error instanceof Error ? error.message : String(error)));
      loadJournalEntries();
    }
  };

  const handleEdit = async (timestamp: string, newText: string) => {
    try {
      if (!user || !passPhrase) {
        setError('User not authenticated or encryption key not available.');
        return;
      }

      await editConversation(timestamp, newText, user.uid, passPhrase);
      await loadJournalEntries();
    } catch (error) {
      console.error('Failed to edit entry:', error);
      setError('Failed to edit entry: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const goToTrash = () => {
    router.push('/Journal/trash');
  };

  if (loading && entries.length === 0) {
    return <div className="text-center py-8">Loading your journal entries...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      {error && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Journal</h1>
        <button
          onClick={goToTrash}
          className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors"
          title="View Trash"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
          <span>Trash</span>
        </button>
      </div>

      {loading && entries.length > 0 ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p>Updating your journal entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-2">
            You don't have any journal entries yet. Start chatting with Bubba to create some!
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Start New Chat
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <JournalCard
              key={entry.timestamp}
              entry={entry}
              onEdit={(newText) => handleEdit(entry.timestamp, newText)}
              onSoftDelete={() => handleSoftDelete(entry.timestamp)}
            />
          ))}
        </div>
      )}

      <div className="flex space-x-4 mt-6">
        <button
          onClick={loadJournalEntries}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh Journal'}
        </button>

        {error && (
          <button
            onClick={() => setError(null)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
          >
            Dismiss Error
          </button>
        )}
      </div>
    </div>
  );
};

export default JournalPage;
