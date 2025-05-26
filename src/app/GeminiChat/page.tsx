'use client';
import React, { useState, useEffect } from 'react';
import { encryptField, getMasterKey } from '@/utils/encryption'; // Assuming encryption.ts is in the parent directory
import { useAuth } from '@/hooks/useAuth'; // Import useAuth hook
import { EmotionDetector } from '@/components/emotion/EmotionDetector'; // Adjust path as needed
import { detectEmotion} from '@/components/emotion/EmotionDetector'; // Import the correct function
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // Add other potential fields like emotion, usage if needed later
}

const GeminiChat: React.FC = () => {
  const { encryptionReady } = useAuth(); // Get encryptionReady from useAuth
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null); // State to store detected emotion
  

  // Optional: Effect to log encryption status
  useEffect(() => {
    
    console.log('Encryption Ready:', encryptionReady);
  }, [encryptionReady]);

  

  const handleSendMessage = async (userInput: string) => {
    if (input.trim()) {

      // Encrypt user input
      const encryptedUserInput = await encryptField(masterKey, userInput);

      if (encryptedUserInput === null) {
        // Handle encryption error
        console.error("Failed to encrypt user input");
        return;
      }

      // Create user message object
      const userMessage: ChatMessage = {
        id: Date.now().toString() + '-user', // Simple unique ID
        role: 'user',
        content: userInput, // Use original userInput for display before encryption
        timestamp: new Date(),
      };

      // Add user message to state immediately
      setMessages([...messages, userMessage]);

      // --- Emotion Detection ---
      try {
        const detectedEmotion = await detectEmotion(userInput); // Use the correct function name
        setDetectedEmotion(detectedEmotion); // Update the state with the detected emotion
        console.log("Detected emotion:", detectedEmotion); // Log the detected emotion
      } catch (error) {
        console.error("Error detecting emotion:", error);
        setDetectedEmotion(null); // Reset or handle error in UI
      }
      // -------------------------

      // Simulate an AI response (replace with actual AI call)
      const simulatedAIResponse = "This is a simulated AI response.";
      const encryptedAIResponse = await encryptField(simulatedAIResponse);

      if (encryptedAIResponse === null) {
          // Handle encryption error for AI response
          console.error("Failed to encrypt AI response");
          // You might want to update the UI to show an error message for the user message as well
          return;
      }

      // Create AI message object and add to state
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai', // Simple unique ID
        role: 'assistant', // Use 'assistant' role
        content: simulatedAIResponse, // Use original AI response before encryption for display
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      setInput('');
    }
  }

  return (
    <div className="container mx-auto p-4">
      {!encryptionReady && (
        <div className="bg-yellow-200 text-yellow-800 p-3 rounded mb-4">
          Encryption is not set up. Please ensure you are logged in and have completed the encryption setup or recovery.
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">Gemini Chat (Encrypted)</h1>

      <div className="chat-history border p-4 mb-4 h-64 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={msg.id} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {msg.content} {/* Displaying encrypted content */}
            </span>
          </div>
        ))}
      </div>

      <div className="input-area flex">
        <textarea
          className="flex-grow border rounded-l p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}          
          placeholder="Enter your message..."
          disabled={!encryptionReady} // Disable if encryption is not ready
        />
        <button
          className={`px-4 py-2 rounded-r ${encryptionReady ? 'bg-green-500 text-white' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
          onClick={() => handleSendMessage(input)}
          disabled={!encryptionReady} // Disable if encryption is not ready
        > {/* Changed to handleSend for the button */}
          Send
        </button>
      </div>

      {/* Removed EmotionDetector component usage */}
      <div className="emotion-detector mt-4">
        {detectedEmotion && (
          <p className="mt-2">Detected Emotion: {detectedEmotion}</p>
        )}
      </div>
    </div>
  );
};

export default GeminiChat;