// src/app/EmotionChat/page.tsx
// This is a Next.js page component for the Emotion Chat feature.
// This page allows users to chat with bubba using the Emotion Chat component.
// It also has a journal feature that displays the user previous chats.
"use client";
import EmotionChat from "@/components/EmotionChat/EmotionChat";
import RequireAuth from "@/components/RequiredAuth/RequiredAuth";


export default function JournalPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Chat with Bubba</h1>
      
        <EmotionChat />
      </div>
    </RequireAuth>
  );
}