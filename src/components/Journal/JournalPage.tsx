'use client';
import React, { useEffect, useState } from 'react';
import { loadJournalEntries, editJournalEntry, softDeleteJournalEntry } from './journalServices';
import JournalCard from './JournalCard';
import { JournalEntry } from '@/types/JournalEntry';

const JournalPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const fetchEntries = async () => {
      const loaded = await loadJournalEntries('active');
      setEntries(loaded.entries);
    };
    fetchEntries();
  }, []);

  const handleEdit = async (timestamp: string, newText: string) => {
    await editJournalEntry(timestamp, { userText: newText }, 'passphrase');
    setEntries(prev => prev.map(e => e.timestamp === timestamp ? { ...e, userText: newText } : e));
  };

  const handleSoftDelete = async (timestamp: string) => {
    await softDeleteJournalEntry(timestamp);
    setEntries(prev => prev.filter(e => e.timestamp !== timestamp));
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">📝 Your Journals</h1>
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
    </div>
  );
};

export default JournalPage;
