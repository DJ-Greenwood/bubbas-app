import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

export async function initializeTransactionUsage(
  userId: string,
  transactionId: string,
  type: string,
  model: string
): Promise<void> {
  try {
    const timestamp = new Date();
    const currentMonth = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;

    const usageDocRef = db
      .collection("users")
      .doc(userId)
      .collection("token_usage")
      .doc(transactionId);

    await usageDocRef.set({
      createdAt: timestamp,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      type,
      model,
      month: currentMonth,
      estimatedCost: 0,
      completed: false,
    });

    console.log(`[initializeTransactionUsage] Init done: ${transactionId}`);
  } catch (error) {
    console.error("[initializeTransactionUsage] Error:", error);
  }
}

export async function recordTransactionSubcall(
  userId: string,
  transactionId: string,
  subcallType: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  model: string
): Promise<void> {
  try {
    const timestamp = new Date();
    const estimatedCost = calculateGeminiCost(model, promptTokens, completionTokens);

    const usageDocRef = db
      .collection("users")
      .doc(userId)
      .collection("token_usage")
      .doc(transactionId);

    await usageDocRef.collection("subcalls").doc(subcallType).set({
      timestamp,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      estimatedCost,
    });

    await usageDocRef.update({
      totalPromptTokens: FieldValue.increment(promptTokens),
      totalCompletionTokens: FieldValue.increment(completionTokens),
      totalTokens: FieldValue.increment(totalTokens),
      estimatedCost: FieldValue.increment(estimatedCost),
      lastUpdated: timestamp,
    });

    console.log(`[recordTransactionSubcall] ${subcallType} recorded for ${transactionId}`);
  } catch (error) {
    console.error("[recordTransactionSubcall] Error:", error);
  }
}

export async function saveConversationHistory(
  userId: string,
  sessionId: string,
  userMessage: any,
  assistantMessage: any,
  model: string,
  transactionId: string
): Promise<void> {
  try {
    const timestamp = new Date();
    const isoTimestamp = timestamp.toISOString();

    await db.collection('conversations').add({
      userId,
      sessionId,
      timestamp: isoTimestamp,
      userMessage,
      assistantMessage,
      model,
      transactionId,
      createdAt: timestamp,
    });

    console.log(`[saveConversationHistory] Saved session: ${sessionId}`);
  } catch (error) {
    console.error("[saveConversationHistory] Error:", error);
  }
}

function calculateGeminiCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Example pricing (adjust if needed)
  const rate = {
    'gemini-pro': { prompt: 0.0000025, completion: 0.0000075 },
  };

  const pricing = rate[model as keyof typeof rate] || rate['gemini-pro'];

  const cost =
    (promptTokens * pricing.prompt) +
    (completionTokens * pricing.completion);

  return parseFloat(cost.toFixed(6));
}
