import { Emotion } from '@/components/emotion/emotionAssets'; // Adjust the import path as necessary

export interface JournalEntry {
  version: number;
  createdAt?: string;
  timestamp: string;
  emotion: Emotion;
  encryptedUserText?: string; 
  encryptedBubbaReply?: string;
  deleted: boolean;
  status: string;  
  lastEdited: string;
  lastEditedBy: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

}

