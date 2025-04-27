// app/emotion/page.tsx
import ChatBasic from '../../components/ChatBasic/ChatBasic';
import RequireAuth from '@/components/RequiredAuth/RequiredAuth';

export default function EmotionChatPage() {
  return (
    <RequireAuth>
      <main className="p-4">
        <ChatBasic />
      </main>
    </RequireAuth>
  );
}
