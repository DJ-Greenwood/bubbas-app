'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntry } from '@/types/JournalEntry';
import JournalCard from './Journal/JournalCard';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebaseClient';
import { setUserUID, decryptData, getPassPhrase } from '@/utils/encryption';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { stopSpeaking } from '@/utils/tts';
import { getJournalEntries, editJournalEntry, softDeleteJournalEntry } from '@/utils/firebaseDataService';
import { useToast } from '@/hooks/use-toast';

// Define a type that extends JournalEntry to include decrypted fields
type DecryptedJournalEntry = JournalEntry & {
  userText: string;
  bubbaReply: string;
};

const UpdatedJournalPage = () => {
  const [entries, setEntries] = useState<DecryptedJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  const [passPhrase, setPassPhrase] = useState<string | null>(null);
  const entriesLoaded = useRef(false);


  // Listen for auth state and set user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log("User authenticated:", firebaseUser.uid);
        setUser(firebaseUser);
        setUserUID(firebaseUser.uid); // Set user UID for encryption

      } else {
        console.log("No user authenticated");
        setUser(null);
        setUserUID(""); // Clear user UID for encryption
        setEntries([]); // Clear entries on logout
        // Redirect to login if no user
        router.push('/login');
      }
    });
    return () => {
      unsubscribe();
      stopSpeaking();
    };
  }, [router]);

  // Fetch passphrase
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      
      try {
        // Get passphrase first - this is critical for encryption
        const phrase = await getPassPhrase();
        if (phrase) {
          setPassPhrase(phrase);
          console.log("✅ Passphrase successfully loaded");
        } else {
          console.error("No passphrase returned from getPassPhrase()");
          toast({
            title: "Encryption Error",
            description: "Failed to retrieve your encryption key. Journal entries cannot be displayed.",
            variant: "destructive"
          });
          setError('Failed to get encryption key. Please try refreshing the page.');
        }
      } catch (error) {
        console.error("Failed to fetch passphrase:", error);
        toast({
          title: "Data Loading Error",
          description: "Failed to retrieve your encryption key. Journal entries cannot be displayed.",
          variant: "destructive"
        });
        setError('Failed to get encryption key. Please try refreshing the page.');
      }
    };
    
    init();
  }, [user, toast]);

  // Load journal entries when both user and passphrase are available
  useEffect(() => {
    if (user && passPhrase && !entriesLoaded.current) {
      loadJournalEntries();
    }
  }, [user, passPhrase]);

  const loadJournalEntries = async () => {
    if (!user || !passPhrase) {
      console.log("Cannot load journal entries - missing user or passphrase");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading journal entries from Firestore...');
      const loaded = await getJournalEntries('active', user.uid);
      console.log(`✅ Loaded ${loaded.length} journal entries`);
      
      if (loaded.length === 0) {
        setEntries([]);
        entriesLoaded.current = true;
        setLoading(false);
        return;
      }
      
      // Decrypt entry content for display in JournalCard
      const decryptedEntries = await Promise.all(
        loaded.map(async (entry) => {
          try {
            if (!entry.encryptedUserText || !entry.encryptedBubbaReply) {
              throw new Error('Entry missing encrypted fields');
            }
            
            const userText = await decryptData(entry.encryptedUserText);
            const bubbaReply = await decryptData(entry.encryptedBubbaReply);
            
            return {
              ...entry,
              userText,
              bubbaReply
            } as DecryptedJournalEntry;
          } catch (error) {
            console.error(`Failed to decrypt entry ${entry.timestamp}:`, error);
            return {
              ...entry,
              userText: '[Failed to decrypt]',
              bubbaReply: '[Failed to decrypt]'
            } as DecryptedJournalEntry;
          }
        })
      );
      
      // Sort entries by timestamp in descending order (newest first)
      decryptedEntries.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      setEntries(decryptedEntries);
      entriesLoaded.current = true;
    } catch (error) {
      console.error("Failed to load journal entries:", error);
      setError('Failed to load journal entries: ' + (error instanceof Error ? error.message : String(error)));
      toast({
        title: "Loading Error",
        description: "Failed to load your journal entries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (timestamp: string) => {
    try {
      if (!user) {
        setError('User not authenticated.');
        return;
      }
      
      // First update UI optimistically
      setEntries((prev) => prev.filter((entry) => entry.timestamp !== timestamp));
      
      // Then perform the actual delete operation
      await softDeleteJournalEntry(timestamp, user.uid);
      
      toast({ 
        title: "Entry Moved to Trash", 
        description: "Journal entry has been moved to the trash." 
      });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      setError('Failed to delete entry: ' + (error instanceof Error ? error.message : String(error)));
      
      // Reload entries on error to reset state
      entriesLoaded.current = false;
      loadJournalEntries();
      
      toast({ 
        title: "Error", 
        description: "Failed to move entry to trash.", 
        variant: "destructive" 
      });
    }
  };

  const handleEdit = async (timestamp: string, newText: string) => {
    try {
      if (!user) {
        setError('User not authenticated.');
        return;
      }
      
      // Perform the edit operation
      await editJournalEntry(timestamp, newText, user.uid);
      
      // Reload entries to show the updated content
      entriesLoaded.current = false;
      await loadJournalEntries();
      
      toast({ 
        title: "Entry Updated", 
        description: "Your journal entry has been updated successfully." 
      });
    } catch (error) {
      console.error('Failed to edit entry:', error);
      setError('Failed to edit entry: ' + (error instanceof Error ? error.message : String(error)));
      
      toast({ 
        title: "Error", 
        description: "Failed to update your journal entry.", 
        variant: "destructive" 
      });
    }
  };

  const goToTrash = () => router.push('/Journal/trash');

  const handleRefresh = () => {
    entriesLoaded.current = false;
    loadJournalEntries();
  };

  // Only show loading indicator when first loading
  if (loading && entries.length === 0) {
    return (
      <div className="container mx-auto px-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p>Loading your journal entries...</p>
        </div>
      </div>
    );
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
        <div className="flex gap-4">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 text-blue-500 hover:text-blue-700 transition-colors"
            title="Refresh Journal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            <span>Refresh</span>
          </button>
          <button
            onClick={goToTrash}
            className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors"
            title="View Trash"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            <span>Trash</span>
          </button>
        </div>
      </div>

      {/* Show updating indicator when refreshing with existing entries */}
      {loading && entries.length > 0 ? (
        <div className="text-center py-4 mb-4 bg-blue-50 rounded-lg">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-2"></div>
          <p>Updating your journal entries...</p>
        </div>
      ) : null}

      {/* No entries state */}
      {!loading && entries.length === 0 ? (
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
          onClick={handleRefresh}
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