// Firebase Function Exports - Entry Point
import { createUserProfile } from './onUserCreated';
import { saveEncryptedJournal } from './saveEncryptedJournal';

// Export functions to Firebase
export { createUserProfile, saveEncryptedJournal };

// Export other functions as needed
export { callOpenAI } from './callOpenAI';

