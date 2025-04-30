// Define or import the Emotion type
import { Emotion } from '@/components/emotion/emotionAssets'; // Adjust the import path as necessary

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
  status: string;  
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

}

