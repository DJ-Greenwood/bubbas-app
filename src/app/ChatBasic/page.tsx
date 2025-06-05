// src/app/ChatBasic/page.tsx
// This is a Next.js page component for the Emotion Chat feature.
"use client";
import UpdatedChatBasic from '@/components/ChatBasic/UpdatedChatBasic';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth'; // Assuming RequireAuth provides AuthContext or similar
import { useAuth } from '@/hooks/useAuth'; // Assuming useAuth provides user and passPhrase

export default function EmotionChatPage() {
  const { user, passPhrase } = useAuth(); // Get user and passPhrase from auth context
  return (
    <RequireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Chat with Bubba</h1>
        <UpdatedChatBasic user={user} passPhrase={passPhrase} /> {/* Pass user and passPhrase as props */}
      </div>
    </RequireAuth>
  );
}
