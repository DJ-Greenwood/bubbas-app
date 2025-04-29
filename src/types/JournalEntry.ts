// Define or import the Emotion type
import { Emotion } from '@/components/emotion/EmotionIcon';

// Define the updated JournalEntry type
// src/types/JournalEntry.ts

export interface JournalEntry {
  version: number;
  createdAt?: string;
  timestamp: string;
  emotion: Emotion;
  encryptedUserText?: string; 
  encryptedBubbaReply?: string;
  deleted: boolean;
  promptToken: number;
  completionToken: number;
  totalToken: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

}

