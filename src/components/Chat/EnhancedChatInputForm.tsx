'use client';

import React, { useState, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, RefreshCw, Mic, MicOff } from 'lucide-react';

// Declare SpeechRecognition interfaces globally
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    readonly length: number;
  }

  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
    readonly isFinal: boolean;
    readonly length: number;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }
}

type EnhancedChatInputFormProps = {
  onSubmit: (userInput: string) => Promise<void>;
  isLoading: boolean;
  isDisabled: boolean;
  onResetConversation: () => void;
  placeholder?: string;
  showResetButton?: boolean;
  supportSpeechToText?: boolean;
};

const EnhancedChatInputForm: React.FC<EnhancedChatInputFormProps> = ({
  onSubmit,
  isLoading,
  isDisabled,
  onResetConversation,
  placeholder = "Message Bubba...",
  showResetButton = true,
  supportSpeechToText = false,
}) => {
  const [userInput, setUserInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const initializeSpeechRecognition = (): SpeechRecognition | null => {
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      console.warn("Speech recognition not supported in this browser");
      return null;
    }

    const recognitionInstance: SpeechRecognition = new SpeechRecognitionConstructor();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      setUserInput(transcript);
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event);
      stopRecording();
    };

    return recognitionInstance;
  };

  const startRecording = () => {
    if (!recognition) {
      const rec = initializeSpeechRecognition();
      if (!rec) return;
      setRecognition(rec);
      rec.start();
    } else {
      recognition.start();
    }
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim() || isSubmitting || isLoading || isDisabled) return;

    try {
      if (isRecording) stopRecording();
      setIsSubmitting(true);
      await onSubmit(userInput);
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
        ref={textAreaRef}
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

        {supportSpeechToText && (
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={toggleRecording}
            title={isRecording ? "Stop recording" : "Start voice input"}
            disabled={isLoading || isSubmitting}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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

export default EnhancedChatInputForm;
