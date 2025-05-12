// src/app/ChatBasic/page.tsx
// This is a Next.js page component for the Emotion Chat feature.
"use client";
import UpdatedChatBasic from '@/components/ChatBasic/UpdatedChatBasic';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';

export default function EmotionChatPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Chat with Bubba</h1>
        <UpdatedChatBasic />
      </div>
    </RequireAuth>
  );
}
