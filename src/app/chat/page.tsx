"use client";
import Chat from "@/components/ChatWorking";
import RequireAuth from "@/components/RequiredAuth/RequiredAuth";

export default function ChatPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Chat</h1>
          <p className="mb-4">Welcome to the chat! Feel free to express your emotions and reflect on your day.</p>
        <Chat />
      </div>
    </RequireAuth>
  );
}