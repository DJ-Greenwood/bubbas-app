// src/components/Chat/ChatMessage.tsx

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import { Emotion } from '@/components/emotion/emotionAssets';
import { EmotionCharacterKey } from '@/types/emotionCharacters';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  emotion?: Emotion | null;
  timestamp: string;
  characterSet?: EmotionCharacterKey;
  emotionIconSize?: number;
  showTimestamp?: boolean;
  className?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  emotion,
  timestamp,
  characterSet = 'Bubba',
  emotionIconSize = 32,
  showTimestamp = false,
  className = '',
}) => {
  const isUser = role === 'user';
  const formattedTime = showTimestamp 
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : null;
  
  return (
    <div
      className={`
        p-3 rounded-lg 
        ${isUser 
          ? 'bg-[var(--color-user-message)] ml-8' 
          : 'bg-[var(--color-ai-message)] mr-8 border border-gray-200'
        }
        ${className}
      `}
      role="listitem"
      aria-label={`${isUser ? 'Your' : 'Bubba\'s'} message`}
    >
      <div className="flex items-start gap-2">
        {!isUser && emotion && (
          <div className="flex-shrink-0">
            <EmotionIcon 
              emotion={emotion} 
              characterSet={characterSet}
              size={emotionIconSize}
            />
          </div>
        )}
        
        <div className="flex-1">
          <div className="font-medium mb-1">
            {isUser ? 'You:' : 'Bubba:'}
          </div>
          
          <div className="whitespace-pre-wrap">
            {content}
          </div>
          
          {showTimestamp && formattedTime && (
            <div className="text-xs text-gray-400 mt-2 text-right">
              {formattedTime}
            </div>
          )}
        </div>
        
        {isUser && emotion && (
          <div className="flex-shrink-0">
            <EmotionIcon 
              emotion={emotion} 
              characterSet={characterSet}
              size={emotionIconSize}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;