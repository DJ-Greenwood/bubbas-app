import React from "react";

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ResponseCardProps {
    input: string;
    response: string;
    usage?: OpenAIUsage | null;
}

const ResponseCard: React.FC<ResponseCardProps> = ({input, response, usage }) => {
  if (!response) return null;

  return (
    <div className="response-display mt-4 relative bg-white p-4 rounded shadow">
        <strong>Bubba's response:</strong>
      <div className="mt-2">{response}</div>
      {usage && (
        <div className="text-xs text-gray-500 absolute bottom-2 right-2">
          Tokens: {usage.totalTokens} (Prompt: {usage.promptTokens}, Completion: {usage.completionTokens})
        </div>
      )}
    </div>
  );
};

export default ResponseCard;
