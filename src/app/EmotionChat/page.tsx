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