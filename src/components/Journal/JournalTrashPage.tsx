'use client';
import React, { useEffect, useState } from 'react';
import { loadJournalEntries, recoverJournalEntry, hardDeleteJournalEntry } from './journalServices';
import JournalCard from './JournalCard';
import { JournalEntry } from '@/types/JournalEntry';
import { decryptField } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/passPhraseService';
import { auth } from '@/utils/firebaseClient';

const JournalTrashPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [passPhrase, setPassPhrase] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const phrase = await fetchPassPhrase();
      if (phrase) {
        setPassPhrase(phrase);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (passPhrase) {
      fetchEntries();
    }
  }, [passPhrase]);

  const fetchEntries = async () => {
    const loaded = await loadJournalEntries('trash');
    const decrypted = loaded.entries.map(entry => ({
      ...entry,
      userText: decryptField(entry.userText || '', passPhrase),
      bubbaReply: decryptField(entry.bubbaReply || '', passPhrase),
    }));
    setEntries(decrypted);
  };

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
