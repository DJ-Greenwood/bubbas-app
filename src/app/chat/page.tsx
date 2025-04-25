"use client";
import Chat from "@/components/chat";
import RequireAuth from "@/components/RequiredAuth/RequiredAuth";

export default function ChatPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Chat with Bubba</h1>
        <Chat />
      </div>
    </RequireAuth>
  );
}