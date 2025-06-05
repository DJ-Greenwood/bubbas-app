// src/hooks/useConversationService.ts
import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import * as conversationService from '../utils/conversationService';
import type { EmotionTrend } from '../utils/conversationService';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  emotion?: string;
  timestamp: any;
}

interface UseConversationServiceReturn {
  loading: boolean;
  error: Error | null;
  activeConversationId: string | null;
  messages: Message[];
  sendMessage: (message: string, emotion?: string) => Promise<void>;
  endConversation: (generateSummary?: boolean) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<{ id: string; data: any }[]>;
  analyzeEmotion: (text: string) => Promise<string>;
  emotionalTrends: any[];
  loadEmotionalTrends: (period?: 'day' | 'month' | 'all') => Promise<EmotionTrend[]>;
  loadWordFrequency: (options?: { limit?: number; emotion?: string; minCount?: number }) => Promise<any[]>;
}

export function useConversationService(): UseConversationServiceReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [emotionalTrends, setEmotionalTrends] = useState<any[]>([]);

  // Send a message to the current conversation
  const sendMessage = useCallback(async (message: string, emotion?: string) => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await conversationService.sendMessage(
        user,
        message,
        activeConversationId || undefined,
        emotion
      );

      // Update the active conversation ID if it's a new session
      if (response.isNewSession || !activeConversationId) {
        setActiveConversationId(response.conversationId);
      }

      // Load the updated messages
      const updatedMessages = await conversationService.getMessages(user, response.conversationId);
      setMessages(updatedMessages);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to send message'));
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeConversationId]);

  // End the current conversation
  const endConversation = useCallback(async (generateSummary: boolean = true) => {
    if (!user || !activeConversationId) {
      setError(new Error('No active conversation'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await conversationService.endSession(user, activeConversationId, generateSummary);
      setActiveConversationId(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to end conversation'));
      console.error('Error ending conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeConversationId]);

  // Load messages from a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedMessages = await conversationService.getMessages(user, conversationId);
      setMessages(loadedMessages);
      setActiveConversationId(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversation'));
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load all conversations for the user
  const loadConversations = useCallback(async () => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const conversations = await conversationService.getConversations(user, true);
      return conversations;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'));
      console.error('Error loading conversations:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Analyze emotion in text
  const analyzeEmotion = useCallback(async (text: string) => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return '';
    }

    setLoading(true);
    setError(null);

    try {
      const result = await conversationService.analyzeTextEmotion(user, text);
      return result.emotion;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to analyze emotion'));
      console.error('Error analyzing emotion:', err);
      return '';
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load emotional trends
  const loadEmotionalTrends = useCallback(async (period: 'day' | 'month' | 'all' = 'all') => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return []; // Return an empty array if user is not authenticated
    }

    setLoading(true);
    setError(null);

    try {
      const trends = await conversationService.getEmotionalTrends(user, period);
      setEmotionalTrends(trends);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load emotional trends'));
      console.error('Error loading emotional trends:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load word frequency data
  const loadWordFrequency = useCallback(async (options: { limit?: number; emotion?: string; minCount?: number } = {}) => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const words = await conversationService.getWordFrequency(user, options);
      return words;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load word frequency'));
      console.error('Error loading word frequency:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    error,
    activeConversationId,
    messages,
    sendMessage,
    endConversation,
    loadConversation,
    loadConversations,
    analyzeEmotion,
    emotionalTrends,
    loadEmotionalTrends,
    loadWordFrequency
  };
}