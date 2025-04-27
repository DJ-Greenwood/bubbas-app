"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOpenAI = exports.createUserProfile = void 0;
// Firebase Function Exports - Entry Point
const onUserCreated_1 = require("./onUserCreated");
Object.defineProperty(exports, "createUserProfile", { enumerable: true, get: function () { return onUserCreated_1.createUserProfile; } });
// Export other functions as needed
var callOpenAI_1 = require("./callOpenAI");
Object.defineProperty(exports, "callOpenAI", { enumerable: true, get: function () { return callOpenAI_1.callOpenAI; } });
//# sourceMappingURL=index.js.map