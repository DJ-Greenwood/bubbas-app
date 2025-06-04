// src/index.ts
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase app if not already initialized
if (!getApps().length) {
  console.log("Initializing Firebase app...");
  initializeApp(); // Safe — only runs once
}

// Export all functions

// OpenAI and conversation functions
export {
  getUserDoc,
  updateUserDoc,
  getUserEmotionCharacterSet,
  saveJournalEntry,
  editJournalEntry,
  getJournalEntries,
  softDeleteJournalEntry,
  recoverJournalEntry,
  hardDeleteJournalEntry
} from './JournalFunctions';

// Gemini Function Calls
export {
  callGemini // Corrected export name
} from './geminiFunctions';

// Conversation session functions
export {
  processUserMessage,
  endConversationSession
} from './conversationSessionFunctions';

// Admin prompt management functions
export {
  createOrUpdatePrompt,
  deletePrompt,
  getPrompts
} from './adminPromptFunctions';

// Analytics functions
export {
  getEmotionalTrends,
  getWordFrequency,
  generateSessionSummaries
} from './analyticsService';

// Firestore triggers
export {
  updateWordFrequency,
  updateEmotionTrends
} from './analyticsService';

// Initialize collections and defaults on deployment
import { initializeDefaultPrompts, ensureAdminCollection } from './adminPromptFunctions';

// This code runs when the functions are deployed
Promise.all([
  initializeDefaultPrompts(),
  ensureAdminCollection()
]).catch(error => {
  console.error('Error initializing app data:', error);
});