// app/emotion/page.tsx
import EmotionChat from '../../components/JournalChat/JournalChat';
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
