import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, RefreshCw } from 'lucide-react';

type ChatInputFormProps = {
  onSubmit: (userInput: string) => Promise<void>;
  isLoading: boolean;
  isDisabled: boolean;
  onResetConversation: () => void;
  placeholder?: string;
  showResetButton?: boolean;
};

const ChatInputForm: React.FC<ChatInputFormProps> = ({ 
  onSubmit, 
  isLoading, 
  isDisabled, 
  onResetConversation,
  placeholder = "Message Bubba...",
  showResetButton = true
}) => {
  const [userInput, setUserInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent empty submissions or multiple submissions
    if (!userInput.trim() || isSubmitting || isLoading || isDisabled) return;
    
    try {
      // Set local submitting state to prevent multiple clicks
      setIsSubmitting(true);
      
      // Call the parent's submit handler with the input
      await onSubmit(userInput);
      
      // Only clear input if submission was successful
      setUserInput("");
    } catch (error) {
      console.error("Error submitting message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 pr-24 resize-none rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        rows={3}
        disabled={isLoading || isDisabled || isSubmitting}
      />
      <div className="absolute right-2 bottom-2 flex gap-2">
        {showResetButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onResetConversation}
            title="Reset conversation"
            disabled={isLoading || isSubmitting}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || isSubmitting || !userInput.trim() || isDisabled}
          className="px-3 py-2"
        >
          {isLoading || isSubmitting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span>Thinking</span>
            </div>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1" /> Send
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ChatInputForm;