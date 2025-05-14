// src/adminPromptFunctions.ts
import { onCall } from "firebase-functions/v2/https";
import { CallableRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase app if not already initialized
if (!getApps().length) {
  console.log("Initializing Firebase app...");
  initializeApp(); // Safe — only runs once
}

// Get Firestore instance
const db = getFirestore();

// Define the proper collection path for prompts - using a valid 3-segment path
const PROMPTS_COLLECTION = 'settings/admin/prompts';

interface Prompt {
  id?: string;
  category: 'greeting' | 'reflection' | 'emotion_ack' | 'gap_reconnect' | 'default' | string;
  trigger: {
    type: 'first_time' | 'new_day' | 'emotion_detected' | 'default' | string;
    condition?: any;
  };
  tone: 'friendly' | 'empathetic' | string;
  content: string;
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Cloud Function to create or update a prompt
 */
export const createOrUpdatePrompt = onCall(
  async (request: CallableRequest<{
    promptId?: string;
    prompt: Prompt;
  }>) => {
    // Ensure the user is an admin
    if (!request.auth) {
      throw new Error('You must be logged in to use this feature.');
    }
    
    // Check if user has admin role
    const userRef = db.collection('users').doc(request.auth.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new Error('Only administrators can manage prompts.');
    }
    
    const { promptId, prompt } = request.data;
    
    if (!prompt || typeof prompt !== 'object') {
      throw new Error('Prompt data is required.');
    }
    
    // Validate prompt data
    if (!prompt.category || !prompt.trigger || !prompt.content) {
      throw new Error('Prompt must contain category, trigger, and content.');
    }
    
    try {
      let promptRef;
      
      if (promptId) {
        // Update existing prompt
        promptRef = db.collection(PROMPTS_COLLECTION).doc(promptId);
        
        // Check if prompt exists
        const promptDoc = await promptRef.get();
        if (!promptDoc.exists) {
          throw new Error('Prompt not found.');
        }
        
        // Update the prompt
        await promptRef.update({
          ...prompt,
          updatedAt: Timestamp.now()
        });
        
        return { id: promptId, success: true };
      } else {
        // Create new prompt
        promptRef = db.collection(PROMPTS_COLLECTION).doc();
        
        // Add timestamp fields
        const newPrompt: Prompt = {
          ...prompt,
          id: promptRef.id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        await promptRef.set(newPrompt);
        
        return { id: promptRef.id, success: true };
      }
    } catch (error) {
      console.error('Error managing prompt:', error);
      throw new Error(`An error occurred managing the prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Cloud Function to delete a prompt
 */
export const deletePrompt = onCall(
  async (request: CallableRequest<{ promptId: string }>) => {
    // Ensure the user is an admin
    if (!request.auth) {
      throw new Error('You must be logged in to use this feature.');
    }
    
    // Check if user has admin role
    const userRef = db.collection('users').doc(request.auth.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new Error('Only administrators can manage prompts.');
    }
    
    const { promptId } = request.data;
    
    if (!promptId || typeof promptId !== 'string') {
      throw new Error('Prompt ID is required.');
    }
    
    try {
      const promptRef = db.collection(PROMPTS_COLLECTION).doc(promptId);
      
      // Check if prompt exists
      const promptDoc = await promptRef.get();
      if (!promptDoc.exists) {
        throw new Error('Prompt not found.');
      }
      
      // Delete the prompt
      await promptRef.delete();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting prompt:', error);
      throw new Error(`An error occurred deleting the prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Cloud Function to get all prompts with optional filtering
 */
export const getPrompts = onCall(
  async (request: CallableRequest<{
    category?: string;
    triggerType?: string;
    activeOnly?: boolean;
  }>) => {
    // Ensure the user is an admin
    if (!request.auth) {
      throw new Error('You must be logged in to use this feature.');
    }
    
    // Check if user has admin role
    const userRef = db.collection('users').doc(request.auth.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data()?.isAdmin) {
      throw new Error('Only administrators can view all prompts.');
    }
    
    const { category, triggerType, activeOnly } = request.data || {};
    
    try {
      let query: any = db.collection(PROMPTS_COLLECTION);
      
      // Apply filters if provided
      if (category) {
        query = query.where('category', '==', category);
      }
      
      if (triggerType) {
        query = query.where('trigger.type', '==', triggerType);
      }
      
      if (activeOnly) {
        query = query.where('active', '==', true);
      }
      
      // Get prompts
      const promptsSnapshot = await query.get();
      
      const prompts: Prompt[] = [];
      promptsSnapshot.forEach((doc: any) => {
        prompts.push({
          id: doc.id,
          ...doc.data()
        } as Prompt);
      });
      
      return { prompts };
    } catch (error) {
      console.error('Error getting prompts:', error);
      throw new Error(`An error occurred getting the prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Helper function to initialize default prompts
 * This can be called manually or triggered on app initialization
 */
export const initializeDefaultPrompts = async (): Promise<void> => {
  try {
    // First ensure the settings/admin document exists
    await ensureAdminCollection();
    
    const promptsCollectionRef = db.collection(PROMPTS_COLLECTION);
    const existingPromptsSnapshot = await promptsCollectionRef.limit(1).get();
    
    // Only initialize if no prompts exist
    if (!existingPromptsSnapshot.empty) {
      console.log('Prompts already exist, skipping initialization');
      return;
    }
    
    // Define default prompts
    const defaultPrompts: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        category: 'default',
        trigger: {
          type: 'default'
        },
        tone: 'friendly',
        content: `You are Bubba, an AI emotional support companion. Your primary goal is to provide empathetic, understanding conversations to help users process their emotions and feel heard. Be warm, conversational, and supportive without being overly formal or clinical. Ask thoughtful follow-up questions to help users reflect on their feelings. Focus on being present with the user rather than solving their problems unless they specifically ask for solutions.`,
        active: true
      },
      {
        category: 'greeting',
        trigger: {
          type: 'first_time'
        },
        tone: 'friendly',
        content: `Hi there! I'm Bubba, your emotional support companion. I'm here to listen, chat, and support you through whatever you're experiencing. There's no right or wrong way to use our conversations - you can share your thoughts, talk about your day, or explore how you're feeling. What's on your mind today?`,
        active: true
      },
      {
        category: 'gap_reconnect',
        trigger: {
          type: 'gap_reconnect'
        },
        tone: 'friendly',
        content: `Welcome back! It's great to see you again. How have you been since we last chatted? I'm here to listen and support you with whatever's on your mind today.`,
        active: true
      },
      {
        category: 'new_day',
        trigger: {
          type: 'new_day'
        },
        tone: 'friendly',
        content: `Good to see you today! How are you feeling right now? I'm here to listen and chat about whatever's on your mind.`,
        active: true
      },
      {
        category: 'emotion_ack',
        trigger: {
          type: 'emotion_detected',
          condition: {
            emotion: 'anxious'
          }
        },
        tone: 'empathetic',
        content: `I notice you might be feeling anxious. That's completely understandable - anxiety can be really challenging to navigate. Would you like to talk more about what's causing this feeling? I'm here to listen without judgment.`,
        active: true
      },
      {
        category: 'emotion_ack',
        trigger: {
          type: 'emotion_detected',
          condition: {
            emotion: 'sad'
          }
        },
        tone: 'empathetic',
        content: `I'm sensing that you might be feeling sad right now. I want you to know that it's okay to feel this way, and I'm here to listen. Would you like to share more about what's bringing up these feelings?`,
        active: true
      },
      {
        category: 'emotion_ack',
        trigger: {
          type: 'emotion_detected',
          condition: {
            emotion: 'happy'
          }
        },
        tone: 'friendly',
        content: `I can sense that you're feeling happy! It's wonderful to hear positive emotions in your message. I'd love to hear more about what's bringing you joy today.`,
        active: true
      },
      {
        category: 'emotion_ack',
        trigger: {
          type: 'emotion_detected',
          condition: {
            emotion: 'frustrated'
          }
        },
        tone: 'empathetic',
        content: `I'm picking up on some frustration in your message. That's a completely valid feeling to have. Would you like to talk more about what's causing this frustration? Sometimes just expressing it can help.`,
        active: true
      }
    ];
    
    // Add prompts to Firestore
    const batch = db.batch();
    
    defaultPrompts.forEach(prompt => {
      const newPromptRef = promptsCollectionRef.doc();
      batch.set(newPromptRef, {
        ...prompt,
        id: newPromptRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    });
    
    await batch.commit();
    console.log('Default prompts initialized successfully');
  } catch (error) {
    console.error('Error initializing default prompts:', error);
    throw error;
  }
};

// Make sure settings/admin document exists
export const ensureAdminCollection = async (): Promise<void> => {
  try {
    // Create the settings document if it doesn't exist
    const settingsDocRef = db.doc('settings/admin');
    const settingsDoc = await settingsDocRef.get();
    
    if (!settingsDoc.exists) {
      // Create settings/admin document
      await settingsDocRef.set({
        created: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        type: 'admin_settings'
      });
      console.log('Settings/admin document created');
    }
  } catch (error) {
    console.error('Error ensuring admin collection exists:', error);
    throw error;
  }
};