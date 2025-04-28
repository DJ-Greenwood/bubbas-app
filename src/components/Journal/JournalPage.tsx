'use client';
import React, { useEffect, useState } from 'react';
import { loadJournalEntries, saveEditedJournalEntry, softDeleteJournalEntry } from './journalServices';
import JournalCard from './JournalCard';
import { JournalEntry } from '@/types/JournalEntry';
import { decryptField } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/passPhraseService';
import { setUserUID } from '@/utils/encryption';
import { auth } from '@/utils/firebaseClient';
import { detectEmotion } from '../emotion/EmotionDetector';

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
    const decrypted = loaded.entries.map(entry => {
      let userText = "[Missing]";
      let bubbaReply = "[Missing]";
      
      if (entry.userText) {
        try {
          const parsed = JSON.parse(decryptField(entry.userText, passPhrase));
          userText = parsed.userText;
        } catch (err) {
          console.warn("Failed to decrypt userText:", err);
        }
      }

      if (entry.bubbaReply) {
        try {
          const parsed = JSON.parse(decryptField(entry.bubbaReply, passPhrase));
          bubbaReply = parsed.bubbaReply;
        } catch (err) {
          console.warn("Failed to decrypt bubbaReply:", err);
        }
      }

      return { ...entry, userText, bubbaReply };
    });

    setEntries(decrypted);
  };

  const handleEdit = async (timestamp: string, newText: string) => {
    const original = entries.find(e => e.timestamp === timestamp);
    if (!original) return;
  
    const detectedEmotion = await detectEmotion(newText);
    await saveEditedJournalEntry(original, newText, detectedEmotion, passPhrase);

    fetchEntries();
  };

  const handleSoftDelete = async (timestamp: string) => {
    await softDeleteJournalEntry(timestamp);
    setEntries(prev => prev.filter(e => e.timestamp !== timestamp));
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">📝 Your Emotional Journals</h1>
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
