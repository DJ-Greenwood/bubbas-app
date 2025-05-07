import React from 'react';
import { Emotion } from '@/components/emotion/emotionAssets';
import EmotionIcon from '@/components/emotion/EmotionIcon';
import ResponseCard from '@/components/Journal/JournalResponses/ResponseCard';

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

type ChatResponseDisplayProps = {
  response: string;
  emotion: Emotion | null;
  emotionIconSize: number | null;
  usage: OpenAIUsage | null;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  className?: string;
};

const ChatResponseDisplay: React.FC<ChatResponseDisplayProps> = ({ 
  response, 
  emotion, 
  emotionIconSize, 
  usage,
  showEmptyState = true,
  emptyStateMessage = "Bubba is waiting for your message...",
  className = ""
}) => {
  // Empty state when no response yet
  if (!response && showEmptyState) {
    return (
      <div className={`text-gray-400 italic text-center py-8 ${className}`}>
        {emptyStateMessage}
      </div>
    );
  }

  // No display at all if no response and empty state is disabled
  if (!response && !showEmptyState) {
    return null;
  }

  return (
    <div className={`flex gap-3 items-start ${className}`}>
      {emotion && (
        <div className="flex-shrink-0 mt-1">
          <EmotionIcon emotion={emotion} size={emotionIconSize || 32} />
        </div>
      )}
      
      <ResponseCard 
        response={response}
        className="flex-grow"
        usage={usage}
      />
    </div>
  );
};

export default ChatResponseDisplay;