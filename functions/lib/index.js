"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmotionTrends = exports.updateWordFrequency = exports.generateSessionSummaries = exports.getWordFrequency = exports.getEmotionalTrends = exports.getPrompts = exports.deletePrompt = exports.createOrUpdatePrompt = exports.endConversationSession = exports.processUserMessage = exports.hardDeleteJournalEntry = exports.recoverJournalEntry = exports.softDeleteJournalEntry = exports.getJournalEntries = exports.editJournalEntry = exports.saveJournalEntry = exports.getUserEmotionCharacterSet = exports.updateUserDoc = exports.getUserDoc = exports.processEmotionalChat = exports.continueConversation = exports.startEmotionalSupportSession = exports.analyzeEmotionWithTracking = exports.analyzeEmotion = exports.callOpenAI = void 0;
// src/index.ts
const app_1 = require("firebase-admin/app");
// Initialize Firebase app if not already initialized
if (!(0, app_1.getApps)().length) {
    console.log("Initializing Firebase app...");
    (0, app_1.initializeApp)(); // Safe — only runs once
}
// Export all functions
// OpenAI and conversation functions
var callOpenAI_1 = require("./callOpenAI");
Object.defineProperty(exports, "callOpenAI", { enumerable: true, get: function () { return callOpenAI_1.callOpenAI; } });
Object.defineProperty(exports, "analyzeEmotion", { enumerable: true, get: function () { return callOpenAI_1.analyzeEmotion; } });
Object.defineProperty(exports, "analyzeEmotionWithTracking", { enumerable: true, get: function () { return callOpenAI_1.analyzeEmotionWithTracking; } });
Object.defineProperty(exports, "startEmotionalSupportSession", { enumerable: true, get: function () { return callOpenAI_1.startEmotionalSupportSession; } });
Object.defineProperty(exports, "continueConversation", { enumerable: true, get: function () { return callOpenAI_1.continueConversation; } });
Object.defineProperty(exports, "processEmotionalChat", { enumerable: true, get: function () { return callOpenAI_1.processEmotionalChat; } });
// Journal functions
var JournalFunctions_1 = require("./JournalFunctions");
Object.defineProperty(exports, "getUserDoc", { enumerable: true, get: function () { return JournalFunctions_1.getUserDoc; } });
Object.defineProperty(exports, "updateUserDoc", { enumerable: true, get: function () { return JournalFunctions_1.updateUserDoc; } });
Object.defineProperty(exports, "getUserEmotionCharacterSet", { enumerable: true, get: function () { return JournalFunctions_1.getUserEmotionCharacterSet; } });
Object.defineProperty(exports, "saveJournalEntry", { enumerable: true, get: function () { return JournalFunctions_1.saveJournalEntry; } });
Object.defineProperty(exports, "editJournalEntry", { enumerable: true, get: function () { return JournalFunctions_1.editJournalEntry; } });
Object.defineProperty(exports, "getJournalEntries", { enumerable: true, get: function () { return JournalFunctions_1.getJournalEntries; } });
Object.defineProperty(exports, "softDeleteJournalEntry", { enumerable: true, get: function () { return JournalFunctions_1.softDeleteJournalEntry; } });
Object.defineProperty(exports, "recoverJournalEntry", { enumerable: true, get: function () { return JournalFunctions_1.recoverJournalEntry; } });
Object.defineProperty(exports, "hardDeleteJournalEntry", { enumerable: true, get: function () { return JournalFunctions_1.hardDeleteJournalEntry; } });
// Conversation session functions
var conversationSessionFunctions_1 = require("./conversationSessionFunctions");
Object.defineProperty(exports, "processUserMessage", { enumerable: true, get: function () { return conversationSessionFunctions_1.processUserMessage; } });
Object.defineProperty(exports, "endConversationSession", { enumerable: true, get: function () { return conversationSessionFunctions_1.endConversationSession; } });
// Admin prompt management functions
var adminPromptFunctions_1 = require("./adminPromptFunctions");
Object.defineProperty(exports, "createOrUpdatePrompt", { enumerable: true, get: function () { return adminPromptFunctions_1.createOrUpdatePrompt; } });
Object.defineProperty(exports, "deletePrompt", { enumerable: true, get: function () { return adminPromptFunctions_1.deletePrompt; } });
Object.defineProperty(exports, "getPrompts", { enumerable: true, get: function () { return adminPromptFunctions_1.getPrompts; } });
// Analytics functions
var analyticsService_1 = require("./analyticsService");
Object.defineProperty(exports, "getEmotionalTrends", { enumerable: true, get: function () { return analyticsService_1.getEmotionalTrends; } });
Object.defineProperty(exports, "getWordFrequency", { enumerable: true, get: function () { return analyticsService_1.getWordFrequency; } });
Object.defineProperty(exports, "generateSessionSummaries", { enumerable: true, get: function () { return analyticsService_1.generateSessionSummaries; } });
// Firestore triggers
var analyticsService_2 = require("./analyticsService");
Object.defineProperty(exports, "updateWordFrequency", { enumerable: true, get: function () { return analyticsService_2.updateWordFrequency; } });
Object.defineProperty(exports, "updateEmotionTrends", { enumerable: true, get: function () { return analyticsService_2.updateEmotionTrends; } });
// Initialize collections and defaults on deployment
const adminPromptFunctions_2 = require("./adminPromptFunctions");
// This code runs when the functions are deployed
Promise.all([
    (0, adminPromptFunctions_2.initializeDefaultPrompts)(),
    (0, adminPromptFunctions_2.ensureAdminCollection)()
]).catch(error => {
    console.error('Error initializing app data:', error);
});
//# sourceMappingURL=index.js.map