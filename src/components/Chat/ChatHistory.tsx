// src/components/Chat/ChatHistory.tsx

import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

interface ChatHistoryProps {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    emotion?: any;
    timestamp: string;
  }>;
  characterSet?: EmotionCharacterKey;
  emotionIconSize?: number;
  showTimestamps?: boolean;
  className?: string;
  maxHeight?: string;
  emptyStateMessage?: string;
  showEmptyState?: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  characterSet = 'Bubba',
  emotionIconSize = 32,
  showTimestamps = false,
  className = '',
  maxHeight = '24rem',
  emptyStateMessage = "No messages yet. Start a conversation!",
  showEmptyState = true,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // If no messages and empty state is disabled, don't render anything
  if (messages.length === 0 && !showEmptyState) {
    return null;
  }
  
  return (
    <div 
      className={`chat-history space-y-4 overflow-y-auto p-2 ${className}`}
      style={{ maxHeight }}
      role="list"
      aria-label="Chat conversation"
    >
      {messages.length === 0 && showEmptyState ? (
        <div className="flex items-center justify-center h-32 text-gray-500 italic">
          {emptyStateMessage}
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
              emotion={message.emotion}
              timestamp={message.timestamp}
              characterSet={characterSet}
              emotionIconSize={emotionIconSize}
              showTimestamp={showTimestamps}
            />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default ChatHistory;