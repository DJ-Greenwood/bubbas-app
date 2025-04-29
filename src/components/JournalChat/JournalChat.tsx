'use client';
import React, { useEffect, useState } from 'react';
import { loadJournalEntries, saveEditedJournalEntry, softDeleteJournalEntry, emptyTrashcan } from './Journal/JournalService'; // 👈 ADD
import JournalCard from './Journal/JournalCard';
import { JournalEntry } from '@/types/JournalEntry';
import { decryptField } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/passPhraseService';
import { setUserUID } from '@/utils/encryption';
import { auth } from '@/utils/firebaseClient';
import { detectEmotion } from '../emotion/EmotionDetector';
import { Trash2 } from 'lucide-react'; // 👈 Using Lucide Icon (you probably already use it elsewhere)

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
      
      if (entry.encryptedUserText) {
        try {
          const parsed = JSON.parse(decryptField(entry.encryptedUserText, passPhrase));
          userText = parsed.userText;
        } catch (err) {
          console.warn("Failed to decrypt userText:", err);
        }
      }

      if (entry.encryptedBubbaReply) {
        try {
          const parsed = JSON.parse(decryptField(entry.encryptedBubbaReply, passPhrase));
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

  const handleEmptyTrash = async () => {
    const confirmDelete = confirm("⚠️ This will permanently delete everything in the trash. Are you sure?");
    if (!confirmDelete) return;
    
    await emptyTrashcan();
    alert("🗑️ Trash emptied!");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">📝 Your Emotional Journals</h1>        
        <button 
          onClick={handleEmptyTrash}
          title="This will delete everything in the trashcan permanently!" 
          className="p-2 rounded hover:bg-red-100 transition flex items-center"
        >
          <Trash2 className="w-6 h-6 text-red-700 mr-2" />
          <span className="text-red-500 font-medium">Empty Trash</span>
        </button>
      </div>

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
