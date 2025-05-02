// src/app/emotion/page.tsx
// This is a Next.js page component for the Emotion Chat feature.
// This is the basic chat page with the Emotion chat prompt.

"use client";
import EmotionChat from '../../components/EmotionChat/EmotionChat';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';

export default function EmotionChatPage() {
  return (
    <RequireAuth>
      <main className="p-4">
        <EmotionChat />
      </main>
    </RequireAuth>
  );
}
