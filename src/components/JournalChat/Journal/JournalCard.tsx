'use client';

import React, { useState, useEffect } from 'react';
import { JournalEntry } from '@/types/JournalEntry';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { decryptField } from '@/utils/encryption';
import { fetchPassPhrase } from '@/utils/chatServices';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit?: (updatedText: string) => void;
  onSoftDelete?: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
}

const JournalCard: React.FC<JournalCardProps> = ({ 
  entry, 
  onEdit, 
  onSoftDelete, 
  onRestore, 
  onHardDelete 
}) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [passPhrase, setPassPhrase] = useState('');
  const [decryptedUserText, setDecryptedUserText] = useState('[Loading]');
  const [decryptedBubbaReply, setDecryptedBubbaReply] = useState('[Loading]');

  useEffect(() => {
    const decryptEntry = async () => {
      const phrase = await fetchPassPhrase();
      if (!phrase) {
        console.error("No passphrase available");
        return;
      }
      
      setPassPhrase(phrase);

      try {
        if (entry.encryptedUserText) {
          // Handle both string and encrypted object types
          const isEncryptedObject = typeof entry.encryptedUserText === 'string' && 
            entry.encryptedUserText.startsWith('U2FsdGVk'); // Base64 prefix

          if (isEncryptedObject) {
            const decryptedRaw = decryptField(entry.encryptedUserText, phrase);
            try {
              const parsed = JSON.parse(decryptedRaw);
              setDecryptedUserText(parsed.userText || '[Unreadable]');
            } catch (jsonError) {
              // If not JSON, use the raw text
              setDecryptedUserText(decryptedRaw || '[Unreadable]');
            }
          } else {
            // If it's already decrypted (from loadChats)
            setDecryptedUserText(entry.encryptedUserText);
          }
        } else {
          setDecryptedUserText('[No content]');
        }
      } catch (error) {
        console.warn('Failed to decrypt user text:', error);
        setDecryptedUserText('[Decryption Error]');
      }

      try {
        if (entry.encryptedBubbaReply) {
          // Handle both string and encrypted object types
          const isEncryptedObject = typeof entry.encryptedBubbaReply === 'string' && 
            entry.encryptedBubbaReply.startsWith('U2FsdGVk'); // Base64 prefix

          if (isEncryptedObject) {
            const decryptedRaw = decryptField(entry.encryptedBubbaReply, phrase);
            try {
              const parsed = JSON.parse(decryptedRaw);
              setDecryptedBubbaReply(parsed.bubbaReply || '[Unreadable]');
            } catch (jsonError) {
              // If not JSON, use the raw text
              setDecryptedBubbaReply(decryptedRaw || '[Unreadable]');
            }
          } else {
            // If it's already decrypted (from loadChats)
            setDecryptedBubbaReply(entry.encryptedBubbaReply);
          }
        } else {
          setDecryptedBubbaReply('[No content]');
        }
      } catch (error) {
        console.warn('Failed to decrypt Bubba reply:', error);
        setDecryptedBubbaReply('[Decryption Error]');
      }
    };

    decryptEntry();
  }, [entry]);

  const handleEdit = () => {
    setEditText(decryptedUserText);
    setEditing(true);
  };

  const saveEdit = () => {
    if (onEdit) onEdit(editText);
    setEditing(false);
  };

  const cardStatus = entry.status === 'trash' ? 'trashed' : 'active';

  return (
    <div className={`bg-white rounded shadow-md p-4 space-y-4 ${cardStatus === 'trashed' ? 'border-l-4 border-red-400' : ''}`}>
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown date'}
          {entry.lastEdited && <span className="ml-2 text-blue-500 text-xs">(Edited)</span>}
        </div>
        {entry.emotion && <EmotionIcon emotion={entry.emotion} size={48} />}
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
        </>
      )}

      {entry.usage && (
        <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
          <span>📜 Tokens: Prompt {entry.usage.promptTokens || 0} | 
            Completion {entry.usage.completionTokens || 0} | 
            Total {entry.usage.totalTokens || 0}
          </span>
          {entry.status === 'trash' && (
            <span className="text-red-500">In Trash</span>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {editing ? (
          <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded">
            Save
          </button>
        ) : (
          onEdit && (
            <button onClick={handleEdit} className="bg-blue-500 text-white px-3 py-1 rounded">
              Edit
            </button>
          )
        )}

        {onSoftDelete && (
          <button 
            onClick={onSoftDelete} 
            className="bg-yellow-500 text-white px-3 py-1 rounded flex items-center gap-1"
            title="Move to Trash"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
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
        )}
        
        {onRestore && (
          <button 
            onClick={onRestore} 
            className="bg-green-500 text-white px-3 py-1 rounded flex items-center gap-1"
            title="Restore from Trash"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 2v6h6"></path>
              <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
            </svg>
            <span>Restore</span>
          </button>
        )}
        
        {onHardDelete && (
          <button 
            onClick={onHardDelete} 
            className="bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
            title="Delete Permanently"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18"></path>
              <path d="M6 6l12 12"></path>
            </svg>
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default JournalCard;