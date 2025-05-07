import React from "react";

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ResponseCardProps {
  response: string;
  className?: string; // Add className as an optional property
  usage?: OpenAIUsage | null;
}

const ResponseCard: React.FC<ResponseCardProps> = ({ response, className, usage }) => {
  if (!response) return null;

  return (
    <div className="response-display mt-4 relative bg-white p-4 rounded shadow">
      <strong>Bubba's response:</strong>
      <div className={className}>{response}</div>
      
      {/* Added padding-top for spacing between response text and usage stats */}
      {usage && (
        <div className="text-xs text-gray-500 text-right pt-4 mt-2 border-t border-gray-100">
          Tokens: {usage.totalTokens} (Prompt: {usage.promptTokens}, Completion: {usage.completionTokens})
        </div>
      )}
    </div>
  );
};

export default ResponseCard;