// src/app/chat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import StandardizedChat from '@/components/Chat/StandardizedChat';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/utils/subscriptionService';

export default function ChatPage() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [supportSpeechToText, setSupportSpeechToText] = useState(false);
  
  // Check if speech recognition is supported
  useEffect(() => {
    // Type-safe check for speech recognition support
    const isSpeechRecognitionSupported = 
      typeof window !== 'undefined' && 
      (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window));
    
    // Only enable for authenticated users with Plus/Pro subscription
    const enableSTT = 
      isSpeechRecognitionSupported && 
      user !== null && 
      (subscription.tier === 'plus' || subscription.tier === 'pro');
    
    setSupportSpeechToText(enableSTT);
  }, [user, subscription]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Chat with Bubba</h1>
      
      <StandardizedChat 
        mode="emotional"
        headerTitle="Bubba the Emotional AI"
        description="Chat with Bubba about your day, get support, or just have a conversation!"
        showTimestamps={true}
        supportSpeechToText={supportSpeechToText}
        maxHeight="24rem"
      />
    </div>
  );
}