'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntry } from '@/types/JournalEntry';
import JournalCard from './Journal/JournalCard';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/utils/firebaseClient';
import { setUserUID } from '@/utils/encryption';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { stopSpeaking } from '@/utils/tts';
import { getJournalEntries, editJournalEntry, softDeleteJournalEntry } from '@/utils/firebaseDataService';
import { useToast } from '@/hooks/use-toast';

// Debug configuration
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Debug utility function
const debug = (component: string, message: string, data?: any) => {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString().substring(11, 23);
    if (data) {
      console.log(`[${timestamp}][${component}] ${message}`, data);
    } else {
      console.log(`[${timestamp}][${component}] ${message}`);
    }
  }
};

// Define a type that extends JournalEntry to include decrypted fields
type DecryptedJournalEntry = JournalEntry & {
  userText?: string;
  bubbaReply?: string;
};

const UpdatedJournalPage = () => {
  const [entries, setEntries] = useState<DecryptedJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const entriesLoaded = useRef(false);

  // Listen for auth state and set user
  useEffect(() => {
    debug('JournalPage', 'Setting up auth listener', undefined);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        debug('JournalPage', `User authenticated: ${firebaseUser.uid.substring(0, 5)}...`, undefined);
        setUser(firebaseUser);
        setUserUID(firebaseUser.uid); // Set user UID for encryption
      } else {
        debug('JournalPage', 'No user authenticated', undefined);
        setUser(null);
        // Redirect to login if no user
        router.push('/login');
      }
    });
    return () => {
      debug('JournalPage', 'Cleaning up auth listener', undefined);
      unsubscribe();
      stopSpeaking();
    };
  }, [router]);

  // Load journal entries when user is available
  useEffect(() => {
    if (user && !entriesLoaded.current) {
      debug('JournalPage', 'User available, loading journal entries', undefined);
      loadJournalEntries();
    }
  }, [user]);

  const loadJournalEntries = async () => {
    if (!user) {
      debug('JournalPage', 'Cannot load journal entries - no user', undefined);
      return;
    }
    
    debug('JournalPage', 'Starting to load journal entries', undefined);
    setLoading(true);
    setError(null);
    
    try {
      debug('JournalPage', `Fetching entries for user: ${user.uid.substring(0, 5)}...`, undefined);
      const loaded = await getJournalEntries('active', user.uid);
      debug('JournalPage', `✅ Loaded ${loaded.length} journal entries`, undefined);
      
      if (loaded.length === 0) {
        debug('JournalPage', 'No entries found', undefined);
        setEntries([]);
        entriesLoaded.current = true;
        setLoading(false);
        return;
      }
      
      // Note: JournalCard component will handle the decryption internally
      // We don't need to decrypt entries here anymore
      
      // Sort entries by timestamp descending (newest first)
      const sortedEntries = [...loaded].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      debug('JournalPage', 'Entries sorted, setting state', { entryCount: sortedEntries.length });
      setEntries(sortedEntries);
      entriesLoaded.current = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug('JournalPage', 'Failed to load journal entries:', { error: errorMessage });
      setError('Failed to load journal entries: ' + errorMessage);
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
      
      debug('JournalPage', `Soft deleting entry with timestamp: ${timestamp}`, undefined);
      
      // First update UI optimistically
      setEntries((prev) => prev.filter((entry) => entry.timestamp !== timestamp));
      
      // Then perform the actual delete operation
      await softDeleteJournalEntry(timestamp, user.uid);
      
      debug('JournalPage', 'Entry successfully moved to trash', undefined);
      
      toast({ 
        title: "Entry Moved to Trash", 
        description: "Journal entry has been moved to the trash." 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug('JournalPage', 'Failed to delete entry:', { error: errorMessage });
      setError('Failed to delete entry: ' + errorMessage);
      
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
      
      debug('JournalPage', `Editing entry with timestamp: ${timestamp}`, {
        textLength: newText.length
      });
      
      // Perform the edit operation
      await editJournalEntry(timestamp, newText, user.uid);
      
      debug('JournalPage', 'Entry successfully updated', undefined);
      
      // Reload entries to show the updated content
      entriesLoaded.current = false;
      await loadJournalEntries();
      
      toast({ 
        title: "Entry Updated", 
        description: "Your journal entry has been updated successfully." 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug('JournalPage', 'Failed to edit entry:', { error: errorMessage });
      setError('Failed to edit entry: ' + errorMessage);
      
      toast({ 
        title: "Error", 
        description: "Failed to update your journal entry.", 
        variant: "destructive" 
      });
    }
  };

  const goToTrash = () => {
    debug('JournalPage', 'Navigating to trash page', undefined);
    router.push('/Journal/trash');
  };

  const handleRefresh = () => {
    debug('JournalPage', 'Manual refresh requested', undefined);
    entriesLoaded.current = false;
    loadJournalEntries();
  };

  // Component render debugging
  useEffect(() => {
    debug('JournalPage', 'Component rendered', { 
      entriesCount: entries.length,
      loading,
      error: error ? 'Error present' : 'No error'
    });
  });

  // Only show loading indicator when first loading
  if (loading && entries.length === 0) {
    debug('JournalPage', 'Rendering loading state', undefined);
    return (
      <div className="container mx-auto px-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p>Loading your journal entries...</p>
        </div>
      </div>
    );
  }

  debug('JournalPage', 'Rendering main component', { entriesCount: entries.length });
  
  return (
    <div className="container mx-auto px-4">
      {/* Debug indicator only shown in development */}
      {DEBUG_MODE && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-md mb-4 text-sm">
          Debug mode is active - logs are being recorded in the console
        </div>
      )}

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