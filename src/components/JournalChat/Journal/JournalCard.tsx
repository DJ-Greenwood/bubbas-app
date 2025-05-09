'use client';

import React, { useState, useEffect } from 'react';
import { JournalEntry } from '@/types/JournalEntry';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { decryptField } from '@/utils/encryption'; // Import directly from encryption.ts
import JournalTTSButton from './JournalTTSButton';
import { useSubscription } from '@/utils/subscriptionService';


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
  onHardDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [decryptedUserText, setDecryptedUserText] = useState('[Loading]');
  const [decryptedBubbaReply, setDecryptedBubbaReply] = useState('[Loading]');
  const [decryptionError, setDecryptionError] = useState(false);
  const { subscription } = useSubscription();

  useEffect(() => {
    const decryptEntry = async () => {
      try {
        // Reset error state
        setDecryptionError(false);

        // Decrypt user text
        try {
          if (entry.encryptedUserText) {
            const isEncryptedObject =
              typeof entry.encryptedUserText === 'string' &&
              entry.encryptedUserText.startsWith('U2FsdGVk');

            if (isEncryptedObject) {
              const decryptedRaw = await decryptField(entry.encryptedUserText);
              try {
                const parsed = JSON.parse(decryptedRaw);
                setDecryptedUserText(parsed.userText || '[Unreadable]');
              } catch (jsonError) {
                setDecryptedUserText(decryptedRaw || '[Unreadable]');
              }
            } else {
              setDecryptedUserText(entry.encryptedUserText);
            }
          } else {
            setDecryptedUserText('[No content]');
          }
        } catch (error) {
          console.warn('Failed to decrypt user text:', error);
          setDecryptedUserText('[Decryption Error]');
          setDecryptionError(true);
        }

        // Decrypt Bubba's reply
        try {
          if (entry.encryptedBubbaReply) {
            const isEncryptedObject =
              typeof entry.encryptedBubbaReply === 'string' &&
              entry.encryptedBubbaReply.startsWith('U2FsdGVk');

            if (isEncryptedObject) {
              const decryptedRaw = await decryptField(entry.encryptedBubbaReply);
              try {
                const parsed = JSON.parse(decryptedRaw);
                setDecryptedBubbaReply(parsed.bubbaReply || '[Unreadable]');
              } catch (jsonError) {
                setDecryptedBubbaReply(decryptedRaw || '[Unreadable]');
              }
            } else {
              setDecryptedBubbaReply(entry.encryptedBubbaReply);
            }
          } else {
            setDecryptedBubbaReply('[No content]');
          }
        } catch (error) {
          console.warn('Failed to decrypt Bubba reply:', error);
          setDecryptedBubbaReply('[Decryption Error]');
          setDecryptionError(true);
        }
      } catch (error) {
        console.error('Error in decryption process:', error);
        setDecryptedUserText('[Error loading content]');
        setDecryptedBubbaReply('[Error loading content]');
        setDecryptionError(true);
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

  const cancelEdit = () => {
    setEditing(false);
  };

  const cardStatus = entry.status === 'trash' ? 'trashed' : 'active';

  // TTS content
  const ttsContent = `Your entry: ${decryptedUserText}. Bubba's response: ${decryptedBubbaReply}`;

  return (
    <div
      className={`bg-white rounded shadow-md p-4 space-y-4 ${
        cardStatus === 'trashed' ? 'border-l-4 border-red-400' : ''
      } ${decryptionError ? 'border-orange-300' : ''}`}
    >
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {entry.timestamp
            ? new Date(entry.timestamp).toLocaleString()
            : 'Unknown date'}
          {entry.lastEdited && (
            <span className="ml-2 text-blue-500 text-xs">(Edited)</span>
          )}
        </div>
        {entry.emotion && (
          <EmotionIcon 
            emotion={entry.emotion} 
            characterSet={entry.emotionCharacterSet || 'bubba'} 
          />
        )}
      </div>

      {decryptionError && (
        <div className="bg-orange-50 text-orange-800 p-2 rounded text-sm">
          There was an issue decrypting this entry. The passphrase may have changed.
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full p-2 border rounded"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
          />
          <div className="flex space-x-2">
            <button
              onClick={saveEdit}
              className="bg-green-500 text-white px-3 py-1 rounded"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="bg-gray-300 text-gray-800 px-3 py-1 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p>
            <strong>You:</strong> {decryptedUserText}
          </p>
          <p>
            <strong>Bubba:</strong> {decryptedBubbaReply}
          </p>
        </>
      )}

      {subscription.tier !== 'free' && (
        <JournalTTSButton text={ttsContent} size="sm" />
      )}

      {entry.usage && (
        <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
          <span>
            📜 Tokens: Prompt {entry.usage.promptTokens || 0} | Completion{' '}
            {entry.usage.completionTokens || 0} | Total{' '}
            {entry.usage.totalTokens || 0}
          </span>
          
          {entry.status === 'trash' && (
            <span className="text-red-500">In Trash</span>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {!editing && onEdit && !decryptionError && (
          <button
            onClick={handleEdit}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            Edit
          </button>
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