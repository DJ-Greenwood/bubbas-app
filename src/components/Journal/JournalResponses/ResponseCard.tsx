// src/components/Journal/JournalResponses/ResponseCard.tsx

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ResponseCardProps {
  response: string;
  className?: string;
  usage?: OpenAIUsage | null;
  showCopyButton?: boolean;
}

const ResponseCard: React.FC<ResponseCardProps> = ({
  response,
  className = '',
  usage = null,
  showCopyButton = true
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-gray-700">Response</h3>
        
        {showCopyButton && (
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy response"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      
      <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
        {response}
      </div>
      
      {usage && (
        <div className="flex gap-3 mt-4 text-xs text-gray-400">
          <span title="Prompt tokens">Input: {usage.promptTokens}</span>
          <span title="Completion tokens">Output: {usage.completionTokens}</span>
          <span title="Total tokens">Total: {usage.totalTokens}</span>
        </div>
      )}
    </div>
  );
};

export default ResponseCard;