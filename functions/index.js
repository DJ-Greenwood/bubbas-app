const functions = require("firebase-functions");
const { callOpenAI } = require("./openaiFunction");

exports.callOpenAI = callOpenAI;
