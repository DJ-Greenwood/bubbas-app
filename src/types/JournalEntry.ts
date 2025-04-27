// Define or import the Emotion type
export type Emotion =
| "joyful" | "peaceful" | "tired" | "nervous"
| "frustrated" | "grateful" | "hopeful" | "isolated"
| "confused" | "reflective" | "sad" | "angry";

// Define the updated JournalEntry type
export type JournalEntry = {
  version: number;
  userText: string;
  bubbaReply: string;
  emotion: Emotion;
  timestamp: string;
  deleted?: boolean; // default false
  promptToken?: number; // optional, for tracking prompt tokens
  completionToken?: number; // optional, for tracking completion tokens
  totalToken?: number; // optional, for tracking total tokens
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number;  }; // optional, for tracking token usage
};
