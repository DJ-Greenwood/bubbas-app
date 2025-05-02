'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntry } from '@/types/JournalEntry';
import JournalCard from './JournalCard';
import { auth } from '@/utils/firebaseClient';
import { setUserUID } from '@/utils/encryption';
import { getPassPhrase } from '@/utils/passPhraseService';
import { loadChats, recoverConversation, hardDeleteConversation } from '@/utils/chatServices';

const JournalTrashPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserUID(user.uid);
    }
    loadTrashEntries();
  }, []);

  const loadTrashEntries = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // Fetch passphrase
      const passPhrase = await getPassPhrase();
      if (!passPhrase) {
        setError('Could not retrieve encryption key');
        setLoading(false);
        return;
      }

      // Load trashed chat entries
      const trashedEntries = await loadChats('trash', passPhrase, user.uid);
      setEntries(trashedEntries);
    } catch (err) {
      console.error('Failed to load trashed entries:', err);
      setError('Failed to load trashed entries');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (timestamp: string) => {
    try {
      // Remove from state immediately for UI responsiveness
      setEntries(prev => prev.filter(entry => entry.timestamp !== timestamp));
      
      if (auth.currentUser) {
        await recoverConversation(timestamp, auth.currentUser.uid);
      }
    } catch (error) {
      console.error('Failed to restore entry:', error);
      // Re-load entries if restore failed
      loadTrashEntries();
    }
  };

  const handleHardDelete = async (timestamp: string) => {
    try {
      // Ask for confirmation
      const confirmed = window.confirm(
        "Are you sure you want to permanently delete this entry? This action cannot be undone."
      );
      
      if (!confirmed) return;
      
      // Remove from state immediately for UI responsiveness
      setEntries(prev => prev.filter(entry => entry.timestamp !== timestamp));
      
      if (auth.currentUser) {
        await hardDeleteConversation(timestamp, auth.currentUser.uid);
      }
    } catch (error) {
      console.error('Failed to permanently delete entry:', error);
      // Re-load entries if delete failed
      loadTrashEntries();
    }
  };

  const handleEmptyTrash = async () => {
    try {
      // Ask for confirmation
      const confirmed = window.confirm(
        "Are you sure you want to permanently delete ALL items in the trash? This action cannot be undone."
      );
      
      if (!confirmed) return;
      
      // Delete all entries one by one
      const deletePromises = entries.map(entry => {
        if (auth.currentUser?.uid) {
          return hardDeleteConversation(entry.timestamp, auth.currentUser.uid);
        } else {
          console.error('User UID is undefined');
          return Promise.reject('User UID is undefined');
        }
      });
      
      await Promise.all(deletePromises);
      
      // Clear the entries state
      setEntries([]);
    } catch (error) {
      console.error('Failed to empty trash:', error);
      // Re-load entries if batch delete failed
      loadTrashEntries();
    }
  };

  const goToJournal = () => {
    router.push('/Journal');
  };

  if (loading) {
    return <div className="text-center py-8">Loading your trash...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={goToJournal}
            className="text-blue-500 hover:text-blue-700"
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
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Trash</h1>
        </div>
        
        {entries.length > 0 && (
          <button 
            onClick={handleEmptyTrash}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors"
            title="Empty Trash"
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
            <span>Empty Trash</span>
          </button>
        )}
      </div>
      
      {entries.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          Your trash is empty.
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.timestamp} className="relative">
              <JournalCard
                entry={entry}
                onRestore={() => handleRestore(entry.timestamp)}
                onHardDelete={() => handleHardDelete(entry.timestamp)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JournalTrashPage;