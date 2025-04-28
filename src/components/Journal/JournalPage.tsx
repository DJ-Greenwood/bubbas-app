'use client';
import React, { useEffect, useState } from 'react';
import { loadJournalEntries, editJournalEntry, softDeleteJournalEntry } from './journalServices';
import JournalCard from './JournalCard';
import { JournalEntry } from '@/types/JournalEntry';
import { decryptField, encryptField } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/passPhraseService';
import { setUserUID } from '@/utils/encryption';
import { auth } from '@/utils/firebaseClient';

const JournalPage = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [passPhrase, setPassPhrase] = useState<string>("");

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserUID(user.uid);
    }

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
    const loaded = await loadJournalEntries('active');
    const decrypted = loaded.entries.map(entry => ({
      ...entry,
      userText: decryptField(entry.userText || '', passPhrase),
      bubbaReply: decryptField(entry.bubbaReply || '', passPhrase),
    }));
    setEntries(decrypted);
  };

  const handleEdit = async (timestamp: string, newText: string) => {
    const encryptedUserText = encryptField(newText, passPhrase);
    await editJournalEntry(timestamp, { userText: encryptedUserText }, passPhrase);
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
