'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntry } from '@/types/JournalEntry';
import JournalCard from './Journal/JournalCard';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebaseClient';
import { setUserUID, decryptData, getPassPhrase } from '@/utils/encryption'; // Import directly from encryption.ts
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { stopSpeaking } from '@/utils/tts';
import { getJournalEntries, editJournalEntry, softDeleteJournalEntry } from '@/utils/firebaseDataService'; // Import database functions from firebaseDataService.ts
import { useToast } from '@/hooks/use-toast';

const UpdatedJournalPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const initializeUserData = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      setUserUID(uid);
      // No need to fetch and store passphrase separately as encryption.ts will handle it
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
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const encryptedEntries = await getJournalEntries('active');

      // Decrypt each entry's user text and Bubba reply
      const decrypted = await Promise.all(
        encryptedEntries.map(async (entry) => {
          try {
            // Use the updated decryption functions
            const userText = await decryptData(entry.encryptedUserText ?? '');
            const bubbaReply = await decryptData(entry.encryptedBubbaReply ?? '');

            return {
              ...entry,
              userText,
              bubbaReply
            };
          } catch (decryptionError) {
            console.error(`Failed to decrypt journal entry ${entry.timestamp}:`, decryptionError);
            return {
              ...entry,
              userText: '[Failed to decrypt]',
              bubbaReply: '[Failed to decrypt]'
            };
          }
        })
      );

      setEntries(decrypted);
    } catch (err) {
      console.error('Failed to load journal entries:', err);
      setError('Failed to load journal entries: ' + (err instanceof Error ? err.message : String(err)));
      setEntries([]);
      toast({
        title: "Error Loading Journal",
        description: "There was a problem loading your entries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserUID(firebaseUser.uid);
        initializeUserData(firebaseUser.uid);
      }
    });

    return () => {
      unsubscribe();
      stopSpeaking();
    };
  }, [initializeUserData]);

  useEffect(() => {
    if (user) {
      loadJournalEntries();
    }
  }, [user, loadJournalEntries]);

  const handleSoftDelete = async (timestamp: string) => {
    try {
      if (!user) {
        setError('User not authenticated.');
        return;
      }
      setEntries((prev) => prev.filter((entry) => entry.timestamp !== timestamp));
      await softDeleteJournalEntry(timestamp, user.uid);
      toast({ title: "Entry Moved to Trash", description: "Journal entry has been moved to the trash." });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      setError('Failed to delete entry: ' + (error instanceof Error ? error.message : String(error)));
      loadJournalEntries();
      toast({ title: "Error", description: "Failed to move entry to trash.", variant: "destructive" });
    }
  };

  const handleEdit = async (timestamp: string, newText: string) => {
    try {
      if (!user) {
        setError('User not authenticated or encryption key not available.');
        return;
      }
      await editJournalEntry(timestamp, newText, user.uid);
      await loadJournalEntries();
      toast({ title: "Entry Updated", description: "Your journal entry has been updated successfully." });
    } catch (error) {
      console.error('Failed to edit entry:', error);
      setError('Failed to edit entry: ' + (error instanceof Error ? error.message : String(error)));
      toast({ title: "Error", description: "Failed to update your journal entry.", variant: "destructive" });
    }
  };

  const goToTrash = () => router.push('/Journal/trash');

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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            onClick={() => router.push('/EmotionChat')}
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

export default UpdatedJournalPage;