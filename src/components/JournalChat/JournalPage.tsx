'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntry } from '@/types/JournalEntry';
import JournalCard from './Journal/JournalCard';
import { auth } from '@/utils/firebaseClient';
import { setUserUID } from '@/utils/encryption';

import { loadChats, softDeleteConversation, editConversation, fetchPassPhrase } from '@/utils/chatServices';

const JournalPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserUID(user.uid);
    }
    loadJournalEntries();
  }, []);

  const loadJournalEntries = async () => {
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
      const passPhrase = await fetchPassPhrase();
      if (!passPhrase) {
        setError('Could not retrieve encryption key');
        setLoading(false);
        return;
      }

      // Load active chat entries
      const journalEntries = await loadChats('active', passPhrase, user.uid);
      setEntries(journalEntries);
    } catch (err) {
      console.error('Failed to load journal entries:', err);
      setError('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (timestamp: string) => {
    try {
      // Remove from state immediately for UI responsiveness
      setEntries(prev => prev.filter(entry => entry.timestamp !== timestamp));
      
      const passPhrase = await fetchPassPhrase();
      
      if (passPhrase && auth.currentUser) {
        await softDeleteConversation(timestamp, auth.currentUser.uid);
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
      // Re-load entries if delete failed
      loadJournalEntries();
    }
  };

  const handleEdit = async (timestamp: string, newText: string) => {
    try {
      const passPhrase = await fetchPassPhrase();
      
      if (passPhrase && auth.currentUser) {
        await editConversation(timestamp, newText, auth.currentUser.uid, passPhrase);
        // Reload entries to show the updated content
        loadJournalEntries();
      }
    } catch (error) {
      console.error('Failed to edit entry:', error);
    }
  };

  const goToTrash = () => {
    router.push('/Journal/trash');
  };

  if (loading) {
    return <div className="text-center py-8">Loading your journal entries...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4">
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
      
      {entries.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          You don't have any journal entries yet. Start chatting with Bubba to create some!
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <JournalCard
              key={entry.timestamp}
              entry={entry}
              onEdit={(newText) => handleEdit(entry.timestamp, newText)}
              onSoftDelete={() => handleSoftDelete(entry.timestamp)}
            />
          ))}
        </div>
      )}
      
      <button 
        onClick={loadJournalEntries}
        className="mt-6 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Refresh Journal
      </button>
    </div>
  );
};

export default JournalPage;