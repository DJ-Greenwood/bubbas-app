// src/components/Chat/EnhancedChatInputForm.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, RefreshCw, Mic, X, PauseCircle } from 'lucide-react';

interface EnhancedChatInputFormProps {
  onSubmit: (userInput: string) => Promise<void>;
  isLoading: boolean;
  isDisabled: boolean;
  onResetConversation?: () => void;
  placeholder?: string;
  showResetButton?: boolean;
  supportSpeechToText?: boolean;
  minRows?: number;
  maxRows?: number;
  className?: string;
}

const EnhancedChatInputForm: React.FC<EnhancedChatInputFormProps> = ({ 
  onSubmit, 
  isLoading, 
  isDisabled, 
  onResetConversation,
  placeholder = "Message Bubba...",
  showResetButton = true,
  supportSpeechToText = false,
  minRows = 3,
  maxRows = 6,
  className = '',
}) => {
  const [userInput, setUserInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState(minRows);
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Adjust textarea rows based on content
  useEffect(() => {
    if (textareaRef.current) {
      const lineHeight = 20; // Approximate line height in pixels
      const scrollHeight = textareaRef.current.scrollHeight;
      const calculatedRows = Math.floor(scrollHeight / lineHeight);
      
      setRows(Math.min(Math.max(calculatedRows, minRows), maxRows));
    }
  }, [userInput, minRows, maxRows]);
  
  // Initialize speech recognition if supported
  useEffect(() => {
    if (supportSpeechToText && window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        setUserInput((prev) => {
          // If the previous input ends with a space or is empty, don't add a space
          const shouldAddSpace = prev.length > 0 && !prev.endsWith(' ');
          return prev + (shouldAddSpace ? ' ' : '') + transcript;
        });
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setSpeechError(event.error);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [supportSpeechToText]);
  
  // Handle form submission
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
  
  // Toggle speech recognition
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setSpeechError(null);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Textarea
        ref={textareaRef}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 pr-24 resize-none rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        rows={rows}
        disabled={isLoading || isDisabled || isSubmitting}
        onKeyDown={(e) => {
          // Submit on Enter without Shift
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (userInput.trim()) {
              handleSubmit(e as any);
            }
          }
        }}
      />
      <div className="absolute right-2 bottom-2 flex gap-2">
        {/* Speech to text button */}
        {supportSpeechToText && (
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={toggleSpeechRecognition}
            title={isRecording ? "Stop listening" : "Start voice input"}
            disabled={isLoading || isDisabled || isSubmitting}
            className="h-9 w-9"
          >
            {isRecording ? (
              <PauseCircle className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}
        
        {/* Reset conversation button */}
        {showResetButton && onResetConversation && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onResetConversation}
            title="Reset conversation"
            disabled={isLoading || isSubmitting}
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        
        {/* Clear input button - only shown when there's input */}
        {userInput.trim() && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setUserInput('')}
            title="Clear input"
            disabled={isLoading || isDisabled || isSubmitting}
            className="h-9 w-9"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        {/* Send button */}
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || isSubmitting || !userInput.trim() || isDisabled}
          className="px-3 py-2 h-9"
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
      
      {/* Speech recognition error message */}
      {speechError && (
        <div className="text-xs text-red-500 mt-1">
          {speechError === 'not-allowed' 
            ? 'Microphone access denied. Please allow microphone access to use voice input.' 
            : `Voice input error: ${speechError}`}
        </div>
      )}
    </form>
  );
};

export default EnhancedChatInputForm;