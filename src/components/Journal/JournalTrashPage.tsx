'use client';
import React, { useEffect, useState } from 'react';
import { loadJournalEntries, recoverJournalEntry, hardDeleteJournalEntry } from './journalServices';
import JournalCard from './JournalCard';
import { JournalEntry } from '@/types/JournalEntry';

const JournalTrashPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const fetchEntries = async () => {
      const loaded = await loadJournalEntries('trash');
      setEntries(loaded.entries);
    };
    fetchEntries();
  }, []);

  const handleRestore = async (timestamp: string) => {
    await recoverJournalEntry(timestamp);
    setEntries(prev => prev.filter(e => e.timestamp !== timestamp));
  };

  const handleHardDelete = async (timestamp: string) => {
    if (confirm("Are you sure you want to permanently delete this journal entry?")) {
      await hardDeleteJournalEntry(timestamp);
      setEntries(prev => prev.filter(e => e.timestamp !== timestamp));
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">🗑️ Journal Trash</h1>
      <div className="space-y-4">
        {entries.map(entry => (
          <JournalCard
            key={entry.timestamp}
            entry={entry}
            onRestore={() => handleRestore(entry.timestamp)}
            onHardDelete={() => handleHardDelete(entry.timestamp)}
          />
        ))}
      </div>
    </div>
  );
};

export default JournalTrashPage;
