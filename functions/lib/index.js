"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrompts = exports.deletePrompt = exports.createOrUpdatePrompt = exports.callGemini = void 0;
// src/index.ts
const app_1 = require("firebase-admin/app");
// Initialize Firebase app if not already initialized
if (!(0, app_1.getApps)().length) {
    console.log("Initializing Firebase app...");
    (0, app_1.initializeApp)(); // Safe — only runs once
}
// Export all functions
// Gemini Function Calls
var geminiFunctions_1 = require("./geminiFunctions");
Object.defineProperty(exports, "callGemini", { enumerable: true, get: function () { return geminiFunctions_1.callGemini; } }); // Corrected export name
// Admin prompt management functions
var adminPromptFunctions_1 = require("./adminPromptFunctions");
Object.defineProperty(exports, "createOrUpdatePrompt", { enumerable: true, get: function () { return adminPromptFunctions_1.createOrUpdatePrompt; } });
Object.defineProperty(exports, "deletePrompt", { enumerable: true, get: function () { return adminPromptFunctions_1.deletePrompt; } });
Object.defineProperty(exports, "getPrompts", { enumerable: true, get: function () { return adminPromptFunctions_1.getPrompts; } });
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