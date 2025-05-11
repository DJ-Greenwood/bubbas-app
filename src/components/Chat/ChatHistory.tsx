// src/components/Chat/ChatHistory.tsx

import React from 'react';
import { format } from 'date-fns';
import { Emotion } from '@/components/emotion/emotionAssets';
import EmotionIcon from '@/components/emotion/EmotionIcon';

// Define types for chat message
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: Emotion | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}

type ChatHistoryProps = {
  messages: ChatMessage[];
  characterSet: string;
  emotionIconSize: number;
  showTimestamps?: boolean;
  maxHeight?: string;
  emptyStateMessage?: string;
  showEmptyState?: boolean;
  className?: string;
};

const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  characterSet,
  emotionIconSize,
  showTimestamps = false,
  maxHeight = '24rem',
  emptyStateMessage = "Start a conversation...",
  showEmptyState = true,
  className = '',
}) => {
  // If no messages and empty state should be shown
  if (messages.length === 0 && showEmptyState) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minHeight: '12rem', maxHeight }}>
        <p className="text-gray-400 italic">{emptyStateMessage}</p>
      </div>
    );
  }
  
  // If no messages and empty state should not be shown
  if (messages.length === 0 && !showEmptyState) {
    return null;
  }

  return (
    <div 
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight }}
    >
      {messages.map((message) => (
        <div 
          key={message.id}
          className={`mb-4 p-3 ${
            message.role === 'user' 
              ? 'bg-blue-50 rounded-lg ml-8' 
              : 'bg-white border border-gray-100 rounded-lg mr-8'
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Avatar for assistant or user */}
            <div className="flex-shrink-0">
              {message.role === 'assistant' ? (
                message.emotion ? (
                  <EmotionIcon emotion={message.emotion} size={emotionIconSize} />
                ) : (
                  <img 
                    src={`/assets/images/emotions/${characterSet}/default.jpg`}
                    alt={characterSet}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                  U
                </div>
              )}
            </div>
            
            {/* Message Content */}
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <span className="font-medium text-sm">
                  {message.role === 'assistant' ? characterSet : 'You'}
                </span>
                
                {showTimestamps && (
                  <span className="text-xs text-gray-400">
                    {format(new Date(message.timestamp), 'h:mm a')}
                  </span>
                )}
              </div>
              
              <div className="mt-1 text-sm whitespace-pre-wrap">
                {message.content}
              </div>
              
              {/* Usage information for developers */}
              {message.role === 'assistant' && message.usage && (
                <div className="mt-2 text-xs text-gray-400 flex gap-2">
                  <span title="Prompt tokens">🔄 {message.usage.promptTokens}</span>
                  <span title="Completion tokens">📝 {message.usage.completionTokens}</span>
                  <span title="Total tokens">🧮 {message.usage.totalTokens}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory;