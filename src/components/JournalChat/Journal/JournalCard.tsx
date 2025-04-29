'use client';
import React, { useState, useEffect } from 'react';
import { JournalEntry } from '@/types/JournalEntry';
import EmotionIcon from '../../emotion/EmotionIcon';
import { decryptField } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/passPhraseService';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit?: (updatedText: string) => void;
  onSoftDelete?: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
}

const JournalCard: React.FC<JournalCardProps> = ({ entry, onEdit, onSoftDelete, onRestore, onHardDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [passPhrase, setPassPhrase] = useState('');
  const [decryptedUserText, setDecryptedUserText] = useState('[Loading]');
  const [decryptedBubbaReply, setDecryptedBubbaReply] = useState('[Loading]');

  useEffect(() => {
    const decryptEntry = async () => {
      const phrase = await fetchPassPhrase();
      if (!phrase) return;
      setPassPhrase(phrase);

      try {
        if (entry.encryptedUserText) {
            const decryptedRaw = decryptField(entry.encryptedUserText, phrase);
            const parsed = JSON.parse(decryptedRaw);
            setDecryptedUserText(parsed.userText || '[Unreadable]');
        } else {
            setDecryptedUserText('[Unreadable]');
        }
    } catch (error) {
        console.warn('Failed to decrypt user text:', error);
        setDecryptedUserText('[Error]');
    }
   
      try {
        if (entry.encryptedBubbaReply) {
          const decryptedRaw = decryptField(entry.encryptedBubbaReply, phrase);
          const parsed = JSON.parse(decryptedRaw);
          setDecryptedBubbaReply(parsed.bubbaReply || '[Unreadable]');
        } else {
          setDecryptedBubbaReply(entry.encryptedBubbaReply || '[Unreadable]');
        }
      } catch (error) {
        console.warn('Failed to decrypt Bubba reply:', error);
        setDecryptedBubbaReply('[Error]');
      }
    };

    decryptEntry();
  }, [entry]);

  const saveEdit = () => {
    if (onEdit) onEdit(editText);
    setEditing(false);
  };

  return (
    <div className="bg-white bg-opacity-30 rounded shadow-md p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">{new Date(entry.timestamp).toLocaleString()}</div>
        <EmotionIcon emotion={entry.emotion} size={64} />
      </div>

      {editing ? (
        <textarea
          className="w-full p-2 border rounded"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={3}
        />
      ) : (
        <>
          <p><strong>You:</strong> {decryptedUserText}</p>
          <p><strong>Bubba:</strong> {decryptedBubbaReply}</p>
          <p>
          </p>
        </>
      )}

      <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
        📜 Tokens: Prompt {entry.promptToken} | Completion {entry.completionToken} | Total {entry.totalToken}
      </div>

      <div className="flex gap-2 mt-3">
        {editing ? (
          <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded">
            Save
          </button>
        ) : (
          onEdit && (
            <button onClick={() => setEditing(true)} className="bg-blue-500 text-white px-3 py-1 rounded">
              Edit
            </button>
          )
        )}

        {onSoftDelete && (
          <button onClick={onSoftDelete} className="bg-yellow-500 text-white px-3 py-1 rounded">
            Trash
          </button>
        )}
        {onRestore && (
          <button onClick={onRestore} className="bg-green-500 text-white px-3 py-1 rounded">
            Restore
          </button>
        )}
        {onHardDelete && (
          <button onClick={onHardDelete} className="bg-red-600 text-white px-3 py-1 rounded">
            Delete Forever
          </button>
        )}
      </div>
    </div>
  );
};

export default JournalCard;
