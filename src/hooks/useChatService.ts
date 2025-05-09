// src/hooks/useChatService.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Emotion } from '@/components/emotion/emotionAssets';
import { EmotionCharacterKey } from '@/types/emotionCharacters';
import { 
  startEmotionalSupportSession, 
  askQuestion, 
  resetConversation, 
  generateResponse,
  saveChat
} from '@/utils/chatServices';
import { detectEmotion } from '@/components/emotion/EmotionDetector';
import { useEmotionSettings } from '@/components/context/EmotionSettingsContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  emotion?: Emotion;
  timestamp: string;
}

interface ChatServiceOptions {
  mode?: 'emotional' | 'basic' | 'journal';
  initialMessage?: string;
  onError?: (error: Error) => void;
}

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export const useChatService = (options: ChatServiceOptions = {}) => {
  const { mode = 'emotional', initialMessage, onError } = options;
  
  // State
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [response, setResponse] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [usage, setUsage] = useState<OpenAIUsage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // References
  const initAttempts = useRef<number>(0);
  
  // Hooks
  const { toast } = useToast();
  const { characterSet } = useEmotionSettings();
  
  // Initialize chat
  const initializeChat = useCallback(async (chatMode: 'emotional' | 'basic' | 'journal' = 'emotional') => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Initializing ${chatMode} chat...`);
      
      if (chatMode === 'emotional') {
        const { reply, usage: initialUsage, emotion: initialEmotion } = await startEmotionalSupportSession();
        
        setResponse(reply);
        setUsage(initialUsage);
        setEmotion(initialEmotion);
        
        // Set initial chat history
        setChatHistory([
          { 
            role: 'assistant', 
            content: reply, 
            emotion: initialEmotion,
            timestamp: new Date().toISOString() 
          }
        ]);
      } else {
        // For basic mode, just set a welcome message
        const welcomeMessage = initialMessage || "Hello! How can I help you today?";
        setResponse(welcomeMessage);
        
        // Set initial chat history
        setChatHistory([
          { 
            role: 'assistant', 
            content: welcomeMessage,
            timestamp: new Date().toISOString() 
          }
        ]);
      }
      
      setIsInitialized(true);
      console.log(`${chatMode} chat initialized successfully`);
    } catch (err) {
      console.error(`Failed to initialize ${chatMode} chat:`, err);
      setError(`Failed to initialize chat. ${err instanceof Error ? err.message : 'Please try again.'}`);
      
      // Try to recover by incrementing attempts
      initAttempts.current += 1;
      
      // If we've tried 3 times, stop trying
      if (initAttempts.current >= 3) {
        toast({
          title: "Initialization Error",
          description: "Failed to start chat after multiple attempts. Please refresh the page.",
          variant: "destructive"
        });
      }
      
      // Call onError if provided
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialMessage, toast, onError]);
  
  // Send message
  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Sending message in ${mode} mode:`, userInput);
      
      // Add user message to chat history first for immediate UI update
      const userTimestamp = new Date().toISOString();
      const userEmotion = await detectEmotion(userInput);
      
      // Update chat history with user message
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'user', 
          content: userInput, 
          emotion: userEmotion,
          timestamp: userTimestamp 
        }
      ]);
      
      // Clear previous response while waiting for new one
      setResponse('');
      setEmotion(null);
      
      // Get response from API
      const { reply, usage: newUsage } = await askQuestion(userInput);
      
      // Set new response
      setResponse(reply);
      setUsage(newUsage);
      
      // Detect emotion from response
      const detectedEmotion = await detectEmotion(reply);
      setEmotion(detectedEmotion);
      
      // Update chat history with assistant message
      setChatHistory(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: reply, 
          emotion: detectedEmotion,
          timestamp: new Date().toISOString() 
        }
      ]);
      
      // Save to journal if needed
      try {
        await saveChat(userInput, reply, detectedEmotion, newUsage);
      } catch (saveError) {
        console.warn('Failed to save chat:', saveError);
        // Non-critical error, don't set error state
      }
      
      return { reply, usage: newUsage, emotion: detectedEmotion };
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to send message. ${err instanceof Error ? err.message : 'Please try again.'}`);
      
      // Call onError if provided
      if (onError && err instanceof Error) {
        onError(err);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, mode, onError]);
  
  // Reset chat
  const resetChat = useCallback(async (chatMode: 'emotional' | 'basic' | 'journal' = 'emotional') => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Resetting chat...');
      
      // Clear chat history and response
      setChatHistory([]);
      setResponse('');
      setEmotion(null);
      setUsage(null);
      
      // Re-initialize
      await initializeChat(chatMode);
      
      return true;
    } catch (err) {
      console.error('Error resetting chat:', err);
      setError(`Failed to reset chat. ${err instanceof Error ? err.message : 'Please try again.'}`);
      
      // Call onError if provided
      if (onError && err instanceof Error) {
        onError(err);
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [initializeChat, onError]);
  
  // Auto-initialize on mount if not already initialized
  useEffect(() => {
    if (!isInitialized && initAttempts.current === 0) {
      initializeChat(mode);
    }
  }, [isInitialized, initializeChat, mode]);
  
  return {
    // State
    emotion,
    response,
    chatHistory,
    usage,
    isLoading,
    isInitialized,
    error,
    
    // Methods
    initializeChat,
    sendMessage,
    resetChat,
    
    // Additional info
    characterSet
  };
};