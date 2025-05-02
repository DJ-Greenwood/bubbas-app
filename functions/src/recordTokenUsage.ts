// src/firebase/functions/recordTokenUsage.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Interface for token usage data
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// This function is called after each OpenAI API call to record token usage
export const recordTokenUsage = functions.https.onCall(
  async (data: { usage: TokenUsage }, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to record token usage."
      );
    }

    const uid = context.auth.uid;
    const { usage } = data;
    
    if (!usage || !usage.totalTokens) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Token usage data is required."
      );
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM

    const db = admin.firestore();
    
    try {
      // Reference to the user's token usage document
      const usageRef = db.doc(`users/${uid}/stats/tokenUsage`);
      
      // Get existing usage data
      const usageDoc = await usageRef.get();
      
      // Transaction to ensure atomic updates
      await db.runTransaction(async (transaction) => {
        if (!usageDoc.exists) {
          // Create new usage document if it doesn't exist
          transaction.set(usageRef, {
            daily: {
              [today]: {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
                count: 1,
                lastUpdated: now.toISOString()
              }
            },
            monthly: {
              [currentMonth]: {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
                count: 1,
                lastUpdated: now.toISOString()
              }
            },
            lifetime: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
              count: 1,
              lastUpdated: now.toISOString()
            }
          });
        } else {
          const usageData = usageDoc.data();
          
          // Daily data
          const dailyData = usageData?.daily?.[today] || {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            count: 0
          };
          
          // Monthly data
          const monthlyData = usageData?.monthly?.[currentMonth] || {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            count: 0
          };
          
          // Lifetime data
          const lifetimeData = usageData?.lifetime || {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            count: 0
          };
          
          // Update with new values
          transaction.update(usageRef, {
            [`daily.${today}.promptTokens`]: dailyData.promptTokens + usage.promptTokens,
            [`daily.${today}.completionTokens`]: dailyData.completionTokens + usage.completionTokens,
            [`daily.${today}.totalTokens`]: dailyData.totalTokens + usage.totalTokens,
            [`daily.${today}.count`]: dailyData.count + 1,
            [`daily.${today}.lastUpdated`]: now.toISOString(),
            
            [`monthly.${currentMonth}.promptTokens`]: monthlyData.promptTokens + usage.promptTokens,
            [`monthly.${currentMonth}.completionTokens`]: monthlyData.completionTokens + usage.completionTokens,
            [`monthly.${currentMonth}.totalTokens`]: monthlyData.totalTokens + usage.totalTokens,
            [`monthly.${currentMonth}.count`]: monthlyData.count + 1,
            [`monthly.${currentMonth}.lastUpdated`]: now.toISOString(),
            
            'lifetime.promptTokens': lifetimeData.promptTokens + usage.promptTokens,
            'lifetime.completionTokens': lifetimeData.completionTokens + usage.completionTokens,
            'lifetime.totalTokens': lifetimeData.totalTokens + usage.totalTokens,
            'lifetime.count': lifetimeData.count + 1,
            'lifetime.lastUpdated': now.toISOString()
          });
        }
      });
      
      // Also record individual usage in history collection
      await db.collection(`users/${uid}/tokenHistory`).add({
        ...usage,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        created: now.toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error recording token usage:', error);
      throw new functions.https.HttpsError(
        "internal",
        "Error recording token usage."
      );
    }
  }
);

// This function checks if a user has exceeded their tier limits
export const checkTokenLimits = functions.https.onCall(
  async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in to check token limits."
      );
    }

    const uid = context.auth.uid;
    const db = admin.firestore();
    
    try {
      // Get user's subscription tier
      const userDoc = await db.doc(`users/${uid}`).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "User document not found."
        );
      }
      
      const userData = userDoc.data();
      const tier = userData?.subscription?.tier || 'free';
      
      // Define tier limits
      const limits = {
        free: { dailyLimit: 10, monthlyTokenLimit: 10000 },
        plus: { dailyLimit: 30, monthlyTokenLimit: 50000 },
        pro: { dailyLimit: 100, monthlyTokenLimit: 200000 }
      };
      
      const tierLimits = limits[tier as keyof typeof limits];
      
      // Get current usage
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM
      
      const usageDoc = await db.doc(`users/${uid}/stats/tokenUsage`).get();
      
      if (!usageDoc.exists) {
        // No usage yet, within limits
        return {
          canUseService: true,
          limits: {
            dailyRemaining: tierLimits.dailyLimit,
            monthlyRemaining: tierLimits.monthlyTokenLimit,
            dailyUsed: 0,
            monthlyUsed: 0,
            dailyLimit: tierLimits.dailyLimit,
            monthlyLimit: tierLimits.monthlyTokenLimit
          }
        };
      }
      
      const usageData = usageDoc.data();
      const dailyUsage = usageData?.daily?.[today]?.count || 0;
      const monthlyUsage = usageData?.monthly?.[currentMonth]?.totalTokens || 0;
      
      // Check if daily limit is exceeded
      if (dailyUsage >= tierLimits.dailyLimit) {
        return {
          canUseService: false,
          message: `You've reached your daily chat limit (${tierLimits.dailyLimit}). This will reset at midnight.`,
          limits: {
            dailyRemaining: 0,
            monthlyRemaining: Math.max(0, tierLimits.monthlyTokenLimit - monthlyUsage),
            dailyUsed: dailyUsage,
            monthlyUsed: monthlyUsage,
            dailyLimit: tierLimits.dailyLimit,
            monthlyLimit: tierLimits.monthlyTokenLimit
          }
        };
      }
      
      // Check if monthly token limit is exceeded
      if (monthlyUsage >= tierLimits.monthlyTokenLimit) {
        return {
          canUseService: false,
          message: `You've reached your monthly token limit (${tierLimits.monthlyTokenLimit}). Consider upgrading your plan for more tokens.`,
          limits: {
            dailyRemaining: Math.max(0, tierLimits.dailyLimit - dailyUsage),
            monthlyRemaining: 0,
            dailyUsed: dailyUsage,
            monthlyUsed: monthlyUsage,
            dailyLimit: tierLimits.dailyLimit,
            monthlyLimit: tierLimits.monthlyTokenLimit
          }
        };
      }
      
      // Within limits
      return {
        canUseService: true,
        limits: {
          dailyRemaining: Math.max(0, tierLimits.dailyLimit - dailyUsage),
          monthlyRemaining: Math.max(0, tierLimits.monthlyTokenLimit - monthlyUsage),
          dailyUsed: dailyUsage,
          monthlyUsed: monthlyUsage,
          dailyLimit: tierLimits.dailyLimit,
          monthlyLimit: tierLimits.monthlyTokenLimit
        }
      };
      
    } catch (error) {
      console.error('Error checking token limits:', error);
      throw new functions.https.HttpsError(
        "internal",
        "Error checking token limits."
      );
    }
  }
);