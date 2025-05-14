// src/analyticsService.ts
import { onCall } from "firebase-functions/v2/https";
import { CallableRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';

// Initialize Firebase app if not already initialized
if (!getApps().length) {
  console.log("Initializing Firebase app...");
  initializeApp(); // Safe — only runs once
}

// Get Firestore instance
const db = getFirestore();

// Define secrets for OpenAI API key and model
const OPENAI_API_KEY = defineSecret("openai-key");
const OPENAI_MODEL = defineSecret("openai-model");

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  emotion?: string;
  timestamp: Timestamp;
}

interface WordFrequency {
  word: string;
  count: number;
  associatedEmotions: string[];
  lastUsed: Timestamp;
}

interface EmotionTrend {
  emotion: string;
  count: number;
  date: string; // YYYY-MM-DD format
}

/**
 * Process a new message to update word frequency analytics
 * Triggered function that runs when a new message is created
 */
export const updateWordFrequency = onDocumentCreated(
  'users/{userId}/conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    
    const messageData = snapshot.data() as Message;
    const { userId } = event.params;
    
    // Only process user messages
    if (messageData.role !== 'user') {
      return;
    }
    
    try {
      // Extract words from the message
      const content = messageData.content.toLowerCase();
      const words = content.split(/\W+/)
        .filter(word => word.length > 3) // Filter out short words
        .filter(word => !commonStopWords.includes(word)); // Filter out stop words
      
      const batch = db.batch();
      const emotion = messageData.emotion || 'neutral';
      
      // Process each word
      for (const word of words) {
        const wordRef = db.doc(`word_frequency/${userId}/words/${word}`);
        const wordDoc = await wordRef.get();
        
        if (wordDoc.exists) {
          // Update existing word
          const wordData = wordDoc.data() as WordFrequency;
          
          // Check if emotion is already associated
          let emotions = wordData.associatedEmotions || [];
          if (emotion && !emotions.includes(emotion)) {
            emotions.push(emotion);
          }
          
          batch.update(wordRef, {
            count: FieldValue.increment(1),
            associatedEmotions: emotions,
            lastUsed: Timestamp.now()
          });
        } else {
          // Create new word entry
          batch.set(wordRef, {
            word,
            count: 1,
            associatedEmotions: emotion ? [emotion] : [],
            lastUsed: Timestamp.now()
          });
        }
      }
      
      // Commit all updates
      await batch.commit();
      console.log(`[updateWordFrequency] Processed ${words.length} words for user ${userId}`);
      return;
    } catch (error) {
      console.error('Error updating word frequency:', error);
      return;
    }
  }
);

/**
 * Update emotion trends when a message with emotion is created
 */
export const updateEmotionTrends = onDocumentCreated(
  'users/{userId}/conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    
    const messageData = snapshot.data() as Message;
    const { userId } = event.params;
    
    // Only process messages with emotion data
    if (!messageData.emotion) {
      return;
    }
    
    try {
      const timestamp = messageData.timestamp.toDate();
      const dateStr = `${timestamp.getFullYear()}-${(timestamp.getMonth() + 1).toString().padStart(2, '0')}-${timestamp.getDate().toString().padStart(2, '0')}`;
      
      // Get emotion trend doc for this date
      const emotionTrendRef = db.doc(`users/${userId}/emotion_trends/${dateStr}`);
      const trendDoc = await emotionTrendRef.get();
      
      if (trendDoc.exists) {
        // Update existing trend
        await emotionTrendRef.update({
          [`emotions.${messageData.emotion}`]: FieldValue.increment(1),
          totalCount: FieldValue.increment(1),
          lastUpdated: Timestamp.now()
        });
      } else {
        // Create new trend document
        const emotions: Record<string, number> = {};
        emotions[messageData.emotion] = 1;
        
        await emotionTrendRef.set({
          date: dateStr,
          emotions,
          totalCount: 1,
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        });
      }
      
      // Update monthly aggregation
      const yearMonth = dateStr.substring(0, 7); // YYYY-MM
      const monthlyTrendRef = db.doc(`users/${userId}/emotion_trends/monthly_${yearMonth}`);
      const monthlyDoc = await monthlyTrendRef.get();
      
      if (monthlyDoc.exists) {
        // Update existing monthly trend
        await monthlyTrendRef.update({
          [`emotions.${messageData.emotion}`]: FieldValue.increment(1),
          totalCount: FieldValue.increment(1),
          lastUpdated: Timestamp.now()
        });
      } else {
        // Create new monthly trend document
        const emotions: Record<string, number> = {};
        emotions[messageData.emotion] = 1;
        
        await monthlyTrendRef.set({
          month: yearMonth,
          emotions,
          totalCount: 1,
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        });
      }
      
      console.log(`[updateEmotionTrends] Recorded emotion "${messageData.emotion}" for user ${userId}`);
      return;
    } catch (error) {
      console.error('Error updating emotion trends:', error);
      return;
    }
  }
);

/**
 * Cloud Function to get user's emotional trends
 */
export const getEmotionalTrends = onCall(
  async (request: CallableRequest<{
    period?: 'day' | 'month' | 'all';
    startDate?: string;
    endDate?: string;
  }>) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new Error('You must be logged in to use this feature.');
    }
    
    const userId = request.auth.uid;
    const { period = 'all', startDate, endDate } = request.data || {};
    
    try {
      let query;
      
      // Determine the collection to query based on period
      if (period === 'day' && startDate) {
        // For day-specific trends
        const formattedDate = startDate;
        const trendRef = db.doc(`users/${userId}/emotion_trends/${formattedDate}`);
        const trendDoc = await trendRef.get();
        
        if (!trendDoc.exists) {
          return { trends: [] };
        }
        
        return { trends: [trendDoc.data()] };
      } else if (period === 'month' && startDate) {
        // For a specific month
        const date = new Date(startDate);
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthlyTrendRef = db.doc(`users/${userId}/emotion_trends/monthly_${yearMonth}`);
        const monthlyDoc = await monthlyTrendRef.get();
        
        if (!monthlyDoc.exists) {
          return { trends: [] };
        }
        
        return { trends: [monthlyDoc.data()] };
      } else {
        // For a date range or all time
        const start = startDate ? new Date(startDate) : new Date();
        if (period === 'all') {
          // Default to last 30 days for 'all'
          start.setDate(start.getDate() - 30);
        }
        
        const end = endDate ? new Date(endDate) : new Date();
        
        // Format dates for Firestore query
        const startStr = formatDate(start);
        const endStr = formatDate(end);
        
        // Corrected query: use regular collection reference and where clauses
        // We're comparing document IDs which are strings
        query = db.collection(`users/${userId}/emotion_trends`)
          .where('__name__', '>=', startStr)  // __name__ refers to the document ID
          .where('__name__', '<=', endStr)
          .orderBy('__name__');  // Order by document ID
        
        const snapshot = await query.get();
        
        const trends: any[] = [];
        snapshot.forEach(doc => {
          // Only include daily documents, not monthly aggregates
          if (!doc.id.startsWith('monthly_')) {
            trends.push(doc.data());
          }
        });
        
        return { trends };
      }
    } catch (error) {
      console.error('Error getting emotional trends:', error);
      throw new Error(`An error occurred getting emotional trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Cloud Function to get user's word frequency data
 */
export const getWordFrequency = onCall(
  async (request: CallableRequest<{
    limit?: number;
    emotion?: string;
    minCount?: number;
  }>) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new Error('You must be logged in to use this feature.');
    }
    
    const userId = request.auth.uid;
    const { limit = 50, emotion, minCount = 1 } = request.data || {};
    
    try {
      let query: any = db.collection(`word_frequency/${userId}/words`)
        .where('count', '>=', minCount)
        .orderBy('count', 'desc')
        .limit(limit);
      
      // Add emotion filter if provided
      if (emotion) {
        query = db.collection(`word_frequency/${userId}/words`)
          .where('associatedEmotions', 'array-contains', emotion)
          .where('count', '>=', minCount)
          .orderBy('count', 'desc')
          .limit(limit);
      }
      
      const snapshot = await query.get();
      
      const words: WordFrequency[] = [];
      snapshot.forEach((doc: any) => {
        words.push(doc.data() as WordFrequency);
      });
      
      return { words };
    } catch (error) {
      console.error('Error getting word frequency:', error);
      throw new Error(`An error occurred getting word frequency data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Scheduled function to generate conversation summaries
 * Can be called manually or scheduled to run periodically
 */
export const generateSessionSummaries = onCall(
  {
    secrets: [OPENAI_API_KEY, OPENAI_MODEL],
  },
  async (request: CallableRequest<{
    userId?: string;
    limit?: number;
    force?: boolean;
  }>) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new Error('You must be logged in to use this feature.');
    }
    
    const authenticatedUserId = request.auth.uid;
    // Only admins can generate summaries for other users
    let isAdmin = false;
    
    if (request.data?.userId && request.data.userId !== authenticatedUserId) {
      // Check if user is admin
      const userRef = db.collection('users').doc(authenticatedUserId);
      const userDoc = await userRef.get();
      isAdmin = userDoc.exists && userDoc.data()?.isAdmin === true;
      
      if (!isAdmin) {
        throw new Error('Permission denied. Only admins can generate summaries for other users.');
      }
    }
    
    const userId = request.data?.userId || authenticatedUserId;
    const limit = request.data?.limit || 10;
    const force = request.data?.force || false;
    
    try {
      console.log(`Generating summaries for user ${userId}, limit: ${limit}, force: ${force}`);
      
      // Get conversations that need summaries
      let conversationsQuery: any = db
        .collection(`users/${userId}/conversations`)
        .where('active', '==', false);
        
      if (!force) {
        // Only get conversations without summaries
        conversationsQuery = conversationsQuery.where('summary', '==', null);
      }
      
      conversationsQuery = conversationsQuery.limit(limit);
      
      const conversationsSnapshot = await conversationsQuery.get();
      
      if (conversationsSnapshot.empty) {
        return { success: true, count: 0, message: 'No conversations found that need summaries.' };
      }
      
      const apiKey = OPENAI_API_KEY.value();
      const openai = new OpenAI({ apiKey });
      
      let successCount = 0;
      let errorCount = 0;
      
      // For each conversation
      for (const conversationDoc of conversationsSnapshot.docs) {
        const conversationId = conversationDoc.id;
        
        try {
          // Get messages in this conversation
          const messagesRef = db
            .collection(`users/${userId}/conversations/${conversationId}/messages`)
            .orderBy('timestamp', 'asc');
            
          const messagesSnapshot = await messagesRef.get();
          
          if (messagesSnapshot.empty) {
            continue; // Skip if no messages
          }
          
          const messages: any[] = [];
          messagesSnapshot.forEach(doc => {
            const data = doc.data();
            messages.push({
              role: data.role,
              content: data.content
            });
          });
          
          if (messages.length < 2) {
            continue; // Skip if not enough messages for a meaningful summary
          }
          
          // Create a summary prompt
          const summaryPrompt = `You are an AI assistant tasked with summarizing a conversation. 
          Create a concise summary (2-3 sentences) highlighting the main topics discussed 
          and any emotional themes present. Focus on being helpful and insightful.`;
          
          // Convert messages to a format OpenAI can understand
          const messagesForAPI = [
            {
              role: 'system' as const,
              content: summaryPrompt
            },
            ...messages,
            {
              role: 'user' as const,
              content: 'Please summarize our conversation in 2-3 sentences.'
            }
          ];
          
          const transactionId = `summary-${conversationId}-${Date.now()}`;
          
          // Call OpenAI API for summary
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Use cheaper model for summary
            messages: messagesForAPI,
            max_tokens: 200,
            user: userId,
          });
          
          const summary = completion.choices?.[0]?.message?.content || "No summary generated.";
          
          // Store the summary
          await conversationDoc.ref.update({
            summary,
            summaryGeneratedAt: Timestamp.now()
          });
          
          // Record usage stats
          const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
          
          // Update user usage stats
          await db.collection("users").doc(userId).collection("token_usage").doc(transactionId).set({
            createdAt: new Date(),
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            type: "summary",
            model: "gpt-3.5-turbo",
            estimatedCost: calculateCost("gpt-3.5-turbo", usage.prompt_tokens, usage.completion_tokens),
            month: new Date().toISOString().substring(0, 7), // YYYY-MM
            completed: true,
            conversationId
          });
          
          successCount++;
        } catch (error) {
          console.error(`Error generating summary for conversation ${conversationId}:`, error);
          errorCount++;
        }
      }
      
      return { 
        success: true, 
        count: successCount,
        errors: errorCount,
        message: `Generated ${successCount} summaries with ${errorCount} errors.`
      };
    } catch (error) {
      console.error('Error generating session summaries:', error);
      throw new Error(`An error occurred generating session summaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Helper function to calculate OpenAI API cost
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<string, { promptRate: number; completionRate: number }> = {
    'gpt-4o': {
      promptRate: 0.000005,       // $5.00 / 1M tokens
      completionRate: 0.000015    // $15.00 / 1M tokens
    },
    'gpt-4': {
      promptRate: 0.00003,        // $30.00 / 1M tokens
      completionRate: 0.00006     // $60.00 / 1M tokens
    },
    'gpt-3.5-turbo': {
      promptRate: 0.0000005,      // $0.50 / 1M tokens
      completionRate: 0.0000015   // $1.50 / 1M tokens
    },
    'gpt-4o-mini': {
      promptRate: 0.00000015,     // $0.15 / 1M tokens
      completionRate: 0.0000006   // $0.60 / 1M tokens
    }
  };

  const rates = pricing[model] || pricing['gpt-3.5-turbo']; // fallback to 3.5 if unknown

  const cost =
    (promptTokens * rates.promptRate) +
    (completionTokens * rates.completionRate);

  return parseFloat(cost.toFixed(6)); // Round to 6 decimal places
}

// Common stop words to filter out from word analysis
const commonStopWords = [
  'about', 'after', 'again', 'also', 'although', 'always', 'another', 'around', 'because', 'before',
  'being', 'between', 'both', 'cannot', 'could', 'during', 'either', 'every', 'first', 'found',
  'from', 'great', 'have', 'however', 'into', 'just', 'know', 'like', 'made', 'many', 'more',
  'most', 'much', 'must', 'myself', 'never', 'only', 'other', 'over', 'same', 'should', 'since',
  'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'through', 'very', 'what', 'where', 'which', 'while', 'with', 'would', 'your', 'been', 'were'
];