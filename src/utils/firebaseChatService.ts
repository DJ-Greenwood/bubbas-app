import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeApp } from "firebase/app";
import { getApp, getApps } from "firebase/app";

// ✅ Initialize Firebase (only once)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const functions = getFunctions(app);

// 🧸 Firebase callable functions
const startEmotionalSupportSession = async () => {
  const fn = httpsCallable(functions, "startEmotionalSupportSession");
  return fn();
};

const askQuestion = async (question: string): Promise<string> => {
  const fn = httpsCallable(functions, "askQuestion");
  const result = await fn({ question }) as { data: { reply: string } };
  return result.data.reply;
};

const generateResponse = async (prompt: string): Promise<string> => {
  const fn = httpsCallable(functions, "generateResponse");
  const result = await fn({ prompt }) as { data: { reply: string } };
  return result.data.reply;
};

const resetConversation = async (prompt: string): Promise<string> => {
  const fn = httpsCallable(functions, "resetConversation");
  const result = await fn({ prompt }) as { data: { message: string } };
  return result.data.message;
};

const chatService = {
  askQuestion,
  generateResponse,
  startEmotionalSupportSession,
  resetConversation,
};

export default chatService;
