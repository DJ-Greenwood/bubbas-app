// Define or import the JournalEntry type
type JournalEntry = {
  userText: string;
  bubbaReply: string;
  emotion: string;
  timestamp: string;
};

// Declare and initialize the required variables
const userInput = "Sample user input";
const reply = "Sample reply";
const detectedEmotion = "Happy";
const timestamp = new Date().toISOString();

// Create the new journal entry
const newEntry: JournalEntry = {
  userText: userInput,
  bubbaReply: reply,
  emotion: detectedEmotion,
  timestamp,
};