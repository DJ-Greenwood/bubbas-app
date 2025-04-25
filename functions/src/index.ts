// Firebase Function Exports - Entry Point
import { createUserProfile } from './onUserCreated';
import { saveJournalEntry } from './saveJournalEntry';

// Export functions to Firebase
export { createUserProfile, saveJournalEntry };

// Export other functions as needed
export { callOpenAI } from './callOpenAI';

