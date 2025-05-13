// Export all Cloud Functions
export { callOpenAI, startEmotionalSupportSession, continueConversation } from './callOpenAI';
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