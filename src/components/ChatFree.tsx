import { useState, useEffect } from 'react';
import chatService from '../utils/firebaseChatService';
import { encryptUserData } from '../utils/encrypt';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../components/context/AuthContext';

const DAILY_LIMIT = 5;

export default function ChatFree() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([{ role: 'system', content: 'Hi, I’m Bubba 🐾 How are you feeling today?' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingChats, setRemainingChats] = useState(DAILY_LIMIT);

  useEffect(() => {
    // load usage from Firestore (encrypted opt-in only)
    const fetchUsage = async () => {
      if (!currentUser) return;
      const userDoc = await getDoc(doc(db, 'usage', currentUser.uid));
      const usageData = userDoc.exists() ? userDoc.data() : null;

      // apply your decryption here if needed
      if (usageData?.date === new Date().toDateString()) {
        setRemainingChats(DAILY_LIMIT - usageData.count);
      }
    };
    fetchUsage();
  }, [currentUser]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || remainingChats <= 0) return;

    const newMessage = { role: 'user', content: input };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.askQuestion(input);
      const reply = { role: 'assistant', content: response };

      setMessages([...newMessages, reply]);

      // Encrypt and store locally (optional)
    if (currentUser) {
      const encrypted = encryptUserData(currentUser.uid, { messages: [...newMessages, reply] });
      await setDoc(doc(db, 'usage', currentUser.uid), {
        date: new Date().toDateString(),
        count: DAILY_LIMIT - (remainingChats - 1),
        data: encrypted
      });
    }

      setRemainingChats(remainingChats - 1);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white shadow p-6 rounded-lg">
      <div className="space-y-2 h-96 overflow-y-auto border p-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`text-${msg.role === 'user' ? 'right' : 'left'}`}>
            <p className={`inline-block px-3 py-2 rounded ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
              {msg.content}
            </p>
          </div>
        ))}
      </div>

      <textarea
        rows={3}
        className="w-full border rounded p-2 mb-2"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Write your thoughts here..."
      />

      <button
        onClick={handleSend}
        disabled={isLoading || remainingChats <= 0}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {remainingChats > 0 ? 'Send' : 'Limit Reached'}
      </button>

      <p className="text-sm text-gray-500 mt-2 text-center">
        {remainingChats > 0
          ? `${remainingChats} chats remaining today`
          : 'You’ve reached your daily limit. Come back tomorrow!'}
      </p>
    </div>
  );
}
