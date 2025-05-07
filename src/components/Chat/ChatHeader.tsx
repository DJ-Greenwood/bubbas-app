import React from 'react';
import { SubscriptionTier } from '@/hooks/useSubscriptionLimits';

type ChatHeaderProps = {
  subscriptionTier: SubscriptionTier;
  remainingChats: number | string;
  characterSet?: string;
  headerTitle?: string;
  description?: string;
};

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  subscriptionTier, 
  remainingChats,
  characterSet = 'Bubba',
  headerTitle = 'Bubba the AI Assistant',
  description
}) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <img
        src={`/assets/images/emotions/${characterSet}/default.jpg`}
        alt={headerTitle}
        className="w-16 h-16 object-cover rounded-full"
      />
      <div>
        <h2 className="text-lg font-semibold">{headerTitle}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {subscriptionTier === 'free' ? 'Free' : subscriptionTier === 'plus' ? 'Plus' : 'Pro'}
          </span>
          <span className="text-xs text-gray-500">
            {remainingChats === "Unlimited" 
              ? "Unlimited chats" 
              : `${remainingChats} chats remaining today`}
          </span>
        </div>
        {description && (
          <p className="text-gray-600 mt-1 text-sm">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;