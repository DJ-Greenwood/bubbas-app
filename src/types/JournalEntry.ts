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
};
