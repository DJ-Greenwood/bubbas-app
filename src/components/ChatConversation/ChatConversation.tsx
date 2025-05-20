// src/components/ChatConversation/ChatConversation.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { formatDistanceToNow } from 'date-fns';
import EmotionIcon from '../emotion/EmotionIcon';
import { Emotion } from '../emotion/emotionAssets';


const emotionColors: Record<string, string> = {
  joyful: '#FFD700',
  peaceful: '#90EE90',
  tired: '#A9A9A9',
  nervous: '#9370DB',
  frustrated: '#FF6347',
  grateful: '#00CED1',
  hopeful: '#87CEEB',
  isolated: '#B0C4DE',
  confused: '#FFA500',
  reflective: '#4682B4',
  sad: '#6495ED',
  angry: '#FF4500',
  neutral: '#A9A9A9',
};

const ChatConversation = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [emotionData, setEmotionData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const functions = getFunctions();
  const auth = getAuth();

  useEffect(() => {
    const lastSessionId = localStorage.getItem('bubbasSessionId');
    const lastActiveTime = localStorage.getItem('bubbasLastActive');
    if (lastSessionId && lastActiveTime) {
      const hoursSinceActive = (Date.now() - Number(lastActiveTime)) / (1000 * 60 * 60);
      if (hoursSinceActive < 2) {
        setSessionId(lastSessionId);
        loadSessionMessages(lastSessionId);
      } else {
        startNewSession();
      }
    } else {
      startNewSession();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessionMessages = async (sid: string) => {
    setMessages([
      {
        id: 'system-welcome-back',
        role: 'assistant',
        content: "Welcome back! I'm here to continue our conversation. How are you feeling today?",
        timestamp: Date.now(),
      },
    ]);
  };

  const startNewSession = async () => {
    setIsLoading(true);
    try {
      const startEmotionalSupportSession = httpsCallable(functions, 'startEmotionalSupportSession');
      const result: any = await startEmotionalSupportSession();
      const newSessionId = result.data.sessionId;
      setSessionId(newSessionId);
      localStorage.setItem('bubbasSessionId', newSessionId);
      localStorage.setItem('bubbasLastActive', Date.now().toString());
      setMessages([
        {
          id: 'system-welcome',
          role: 'assistant',
          content: result.data.reply,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      console.error('Error starting session:', error);
      alert("Couldn't start a new chat session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeEmotion = async (text: string) => {
    try {
      const analyzeEmotionWithTracking = httpsCallable(functions, 'analyzeEmotionWithTracking');
      const result: any = await analyzeEmotionWithTracking({ text });
      return result.data;
    } catch (error) {
      console.error('Error analyzing emotion:', error);
      return { primaryEmotion: 'neutral', intensity: 5 };
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: newMessage,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setNewMessage('');
      const emotion = await analyzeEmotion(newMessage);
      setEmotionData(emotion);
      const updatedUserMessage = {
        ...userMessage,
        emotion: emotion.primaryEmotion,
        emotionIntensity: emotion.intensity,
      };
      setMessages((prev) =>
        prev.map((msg) => (msg.id === userMessage.id ? updatedUserMessage : msg))
      );
      const processUserMessage = httpsCallable(functions, 'processUserMessage');
      const result: any = await processUserMessage({
        message: newMessage,
        emotion: emotion.primaryEmotion,
        conversationId: sessionId,
      });
      const newSessionId = result.data.conversationId;
      if (newSessionId !== sessionId) {
        setSessionId(newSessionId);
        localStorage.setItem('bubbasSessionId', newSessionId);
      }
      localStorage.setItem('bubbasLastActive', Date.now().toString());
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.data.content,
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          content: "Sorry, I couldn't process your message. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const getEmotionColor = (emotion: string) => {
    return emotionColors[emotion] || emotionColors.neutral;
  };

  return (
    <div className="chat-conversation-container">
      <div className="chat-conversation-header">
        <h2>Bubbas.AI</h2>
        {emotionData && (
          <div className="emotion-display">
            Current mood:
            <span
              className="emotion-tag"
              style={{ backgroundColor: getEmotionColor(emotionData.primaryEmotion) }}
            >
              <EmotionIcon emotion={emotionData.primaryEmotion as Emotion} size={28} />
              {emotionData.primaryEmotion} ({emotionData.intensity}/10)
            </span>
          </div>
        )}
      </div>
      <div className="chat-messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-bubble ${message.role}-message`}
          >
            <div className="message-content">
              {message.role === 'user' && message.emotion && (
                <EmotionIcon emotion={message.emotion as Emotion} size={22} />
              )}
              {message.content}
              {message.emotion && (
                <span
                  className="message-emotion"
                  style={{ backgroundColor: getEmotionColor(message.emotion) }}
                >
                  {message.emotion}
                </span>
              )}
            </div>
            <div className="message-time">{formatTime(message.timestamp)}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="typing-indicator">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        )}
      </div>
      <div className="chat-input-container">
        <textarea
          className="message-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <button
          className="send-button"
          onClick={handleSendMessage}
          disabled={isLoading || !newMessage.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatConversation;
