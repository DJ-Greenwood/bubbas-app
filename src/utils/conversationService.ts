// src/utils/conversationService.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { decryptField } from './encryption';

// Initialize Firebase services
const functions = getFunctions();
const firestore = getFirestore();

// Function type definitions
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  emotion?: string;
  timestamp: any;
  encryptedContent?: string;
}

interface ConversationSession {
  sessionStart: any;
  lastActive: any;
  sessionEnd?: any;
  active: boolean;
  summary?: string;
}

interface EmotionTrend {
  date: string;
  emotions: Record<string, number>;
  totalCount: number;
}

interface WordFrequency {
  word: string;
  count: number;
  associatedEmotions: string[];
  lastUsed: any;
}

/**
 * Send a message and get a response
 */
export const sendMessage = async (
  user: User,
  message: string,
  conversationId?: string,
  emotion?: string
): Promise<{
  content: string;
  conversationId: string;
  isNewSession: boolean;
  timeGapInMinutes?: number;
}> => {
  const processUserMessageFn = httpsCallable<
    { message: string; emotion?: string; conversationId?: string },
    { content: string; conversationId: string; isNewSession: boolean; timeGapInMinutes?: number }
  >(functions, 'processUserMessage');
  
  // Encrypt the message if needed
  // This example assumes encryption is handled before saving to Firestore
  
  const response = await processUserMessageFn({
    message,
    emotion,
    conversationId
  });
  
  return response.data;
};

/**
 * Manually end a conversation session
 */
export const endSession = async (
  user: User,
  conversationId: string,
  generateSummary: boolean = true
): Promise<{ success: boolean }> => {
  const endConversationSessionFn = httpsCallable<
    { conversationId: string; generateSummary: boolean },
    { success: boolean }
  >(functions, 'endConversationSession');
  
  const response = await endConversationSessionFn({
    conversationId,
    generateSummary
  });
  
  return response.data;
};

/**
 * Get messages from a conversation
 */
export const getMessages = async (
  user: User,
  conversationId: string,
  messageLimit: number = 50
): Promise<Message[]> => {
  const messagesRef = collection(firestore, `users/${user.uid}/conversations/${conversationId}/messages`);
  const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'), limit(messageLimit));
  
  const messagesSnapshot = await getDocs(messagesQuery);
  const messages: Message[] = [];
  
  for (const docSnap of messagesSnapshot.docs) {
    const data = docSnap.data() as Message;
    
    // Only decrypt if the message is from the user or assistant and has encryptedContent
    if (
      (data.role === 'user' || data.role === 'assistant') &&
      data.encryptedContent
    ) {
      data.content = await decryptField(data.encryptedContent);
      delete data.encryptedContent;
    }
    
    messages.push(data);
  }
  
  return messages;
};

/**
 * Get all active or recent conversations
 */
export const getConversations = async (
  user: User,
  includeInactive: boolean = false,
  maxResults: number = 10
): Promise<{ id: string; data: ConversationSession }[]> => {
  let conversationsQuery;
  
  if (includeInactive) {
    // Get all conversations, active or not
    conversationsQuery = query(
      collection(firestore, `users/${user.uid}/conversations`),
      orderBy('lastActive', 'desc'),
      limit(maxResults)
    );
  } else {
    // Only get active conversations
    conversationsQuery = query(
      collection(firestore, `users/${user.uid}/conversations`),
      where('active', '==', true),
      orderBy('lastActive', 'desc'),
      limit(maxResults)
    );
  }
  
  const conversationsSnapshot = await getDocs(conversationsQuery);
  const conversations: { id: string; data: ConversationSession }[] = [];
  
  conversationsSnapshot.forEach(doc => {
    conversations.push({
      id: doc.id,
      data: doc.data() as ConversationSession
    });
  });
  
  return conversations;
};

/**
 * Get emotional trends for the user
 */
export const getEmotionalTrends = async (
  user: User,
  period: 'day' | 'month' | 'all' = 'all',
  startDate?: Date,
  endDate?: Date
): Promise<EmotionTrend[]> => {
  const getEmotionalTrendsFn = httpsCallable<
    { period: string; startDate?: string; endDate?: string },
    { trends: EmotionTrend[] }
  >(functions, 'getEmotionalTrends');
  
  // Format dates for the function call
  const startDateStr = startDate ? startDate.toISOString() : undefined;
  const endDateStr = endDate ? endDate.toISOString() : undefined;
  
  const response = await getEmotionalTrendsFn({
    period,
    startDate: startDateStr,
    endDate: endDateStr
  });
  
  return response.data.trends;
};

/**
 * Get word frequency data for the user
 */
export const getWordFrequency = async (
  user: User,
  options: {
    limit?: number;
    emotion?: string;
    minCount?: number;
  } = {}
): Promise<WordFrequency[]> => {
  const getWordFrequencyFn = httpsCallable<
    { limit?: number; emotion?: string; minCount?: number },
    { words: WordFrequency[] }
  >(functions, 'getWordFrequency');
  
  const response = await getWordFrequencyFn(options);
  
  return response.data.words;
};

/**
 * Analyze the emotion in a text
 */
export const analyzeTextEmotion = async (
  user: User,
  text: string
): Promise<{ emotion: string }> => {
  const analyzeEmotionFn = httpsCallable<
    { text: string },
    { emotion: string }
  >(functions, 'analyzeEmotion');
  
  const response = await analyzeEmotionFn({ text });
  
  return response.data;
};

/**
 * Get token usage statistics
 */
export const getTokenUsage = async (
  user: User,
  period: 'day' | 'month' | 'year' | 'all' = 'month'
): Promise<{
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  chatTokens: number;
  journalTokens: number;
  summaryTokens: number;
  ttsTokens: number;
  chatCount: number;
  journalCount: number;
  summaryCount: number;
  ttsCount: number;
}> => {
  // This assumes you have a function to get token usage
  // Alternatively, you could query Firestore directly
  
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  try {
    // Get the monthly stats document
    const monthlyStatsRef = doc(firestore, `users/${user.uid}/usage_stats/monthly_${currentMonth}`);
    const monthlyStatsDoc = await getDoc(monthlyStatsRef);
    
    if (monthlyStatsDoc.exists()) {
      return monthlyStatsDoc.data() as any;
    } else {
      // Return empty stats if no data exists
      return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        chatTokens: 0,
        journalTokens: 0,
        summaryTokens: 0,
        ttsTokens: 0,
        chatCount: 0,
        journalCount: 0,
        summaryCount: 0,
        ttsCount: 0
      };
    }
  } catch (error) {
    console.error('Error getting token usage:', error);
    throw error;
  }
};