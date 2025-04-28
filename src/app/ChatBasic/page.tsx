// app/emotion/page.tsx
import ChatBasic from '../../components/ChatBasic/ChatBasic';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';

export default function EmotionChatPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Chat with Bubba</h1>
          <ChatBasic />
      </div>
    </RequireAuth>
  );
}
