// src/types/JournalEntry.ts
import { EmotionCharacterKey } from './emotionCharacters';
import { Emotion } from '@/components/emotion/emotionAssets';

export interface JournalEntry {
  version: number;
  timestamp: string;
  createdAt: string;
  encryptedUserText: string;
  encryptedBubbaReply: string;
  emotion?: Emotion;
  detectedEmotionText?: string;
  deleted: boolean;
  status: 'active' | 'trash';
  lastEdited?: string;
  lastEditedBy?: string;
  emotionCharacterSet?: EmotionCharacterKey; // Character set used for this entry
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}