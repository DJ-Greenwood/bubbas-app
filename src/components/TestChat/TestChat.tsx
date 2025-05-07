"use client";
import { useState, useEffect, useRef } from "react";
import { auth, db } from '@/utils/firebaseClient';
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";
import { AlertCircle, Send, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Simple version of OpenAI usage interface
interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Simple Message interface
interface Message {
  id?: string;
  content: string;
  sender: string;
  timestamp: any;
  usage?: OpenAIUsage;
}

const TestChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setDebugInfo(prev => prev + `\nAuthenticated as: ${user.uid}`);
        
        // Create user document if it doesn't exist
        const userRef = doc(db, "users", user.uid);
        getDoc(userRef).then(docSnap => {
          if (!docSnap.exists()) {
            setDoc(userRef, {
              email: user.email,
              createdAt: serverTimestamp(),
              preferences: {},
              features: { tts: false }
            }).then(() => {
              setDebugInfo(prev => prev + `\nCreated user document for: ${user.uid}`);
            }).catch(err => {
              setDebugInfo(prev => prev + `\nError creating user document: ${err.message}`);
            });
          }
        });
        
        // Load chat history
        loadMessages(user.uid);
      } else {
        setUserId(null);
        setMessages([]);
        setDebugInfo(`Not authenticated. Please sign in.`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages
  const loadMessages = async (uid: string) => {
    try {
      setDebugInfo(prev => prev + `\nAttempting to load messages for user: ${uid}`);
      
      // First try using the path matching the security rules
      try {
        const chatId = "test-chat"; // Fixed ID for testing
        const entryRef = doc(db, "users", uid, "journal", chatId);
        const entryDoc = await getDoc(entryRef);
        
        if (entryDoc.exists()) {
          setDebugInfo(prev => prev + `\nFound journal entry: ${chatId}`);
        } else {
          // Create a default entry
          await setDoc(entryRef, {
            createdAt: serverTimestamp(),
            title: "Test Chat",
            status: "active"
          });
          setDebugInfo(prev => prev + `\nCreated new journal entry: ${chatId}`);
        }
        
        // Now get messages
        const messagesRef = collection(db, "users", uid, "journal", chatId, "entries");
        const q = query(messagesRef, orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setDebugInfo(prev => prev + `\nNo messages found in journal/${chatId}/entries`);
        } else {
          const loadedMessages: Message[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            loadedMessages.push({
              id: doc.id,
              content: data.content,
              sender: data.sender,
              timestamp: data.timestamp,
              usage: data.usage
            });
          });
          setMessages(loadedMessages);
          setDebugInfo(prev => prev + `\nLoaded ${loadedMessages.length} messages`);
        }
      } catch (error: any) {
        setDebugInfo(prev => prev + `\nError loading from journal path: ${error.message}`);
        
        // Try alternative path (chats collection)
        try {
          const chatId = "test-chat"; // Fixed ID for testing
          const messagesRef = collection(db, "users", uid, "journal", chatId, "entries");
          const q = query(messagesRef, orderBy("timestamp", "asc"));
          const querySnapshot = await getDocs(q);
          
          const loadedMessages: Message[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            loadedMessages.push({
              id: doc.id,
              content: data.content,
              sender: data.sender,
              timestamp: data.timestamp,
              usage: data.usage
            });
          });
          
          if (loadedMessages.length === 0) {
            setDebugInfo(prev => prev + `\nNo messages found in chats/${chatId}`);
          } else {
            setMessages(loadedMessages);
            setDebugInfo(prev => prev + `\nLoaded ${loadedMessages.length} messages from chats collection`);
          }
        } catch (chatError: any) {
          setDebugInfo(prev => prev + `\nError loading from chats path: ${chatError.message}`);
        }
      }
    } catch (error: any) {
      setError(`Error loading messages: ${error.message}`);
      setDebugInfo(prev => prev + `\nError in loadMessages: ${error.message}`);
    }
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !userId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const newMessage: Message = {
        content: inputMessage,
        sender: userId,
        timestamp: serverTimestamp(),
        usage: {
          promptTokens: Math.floor(inputMessage.length / 4), // Mock calculation
          completionTokens: 0,
          totalTokens: Math.floor(inputMessage.length / 4)
        }
      };
      
      setDebugInfo(prev => prev + `\nAttempting to send message...`);
      
      // First try the journal path matching security rules
      try {
        const chatId = "test-chat";
        const messagesRef = collection(db, "users", userId, "journal", chatId, "entries");
        const docRef = await addDoc(messagesRef, newMessage);
        
        setDebugInfo(prev => prev + `\nMessage sent successfully to journal path. ID: ${docRef.id}`);
        
        // Add the message to the local state
        setMessages([...messages, { ...newMessage, id: docRef.id }]);
        
        // Mock AI reply
        setTimeout(() => {
          const aiReply: Message = {
            content: "This is a test AI reply. Your database connection is working correctly if you see this message!",
            sender: "ai",
            timestamp: serverTimestamp(),
            usage: {
              promptTokens: Math.floor(inputMessage.length / 4),
              completionTokens: 20,
              totalTokens: Math.floor(inputMessage.length / 4) + 20
            }
          };
          
          // Add AI reply to database
          addDoc(messagesRef, aiReply).then(replyRef => {
            setMessages(prev => [...prev, { ...aiReply, id: replyRef.id }]);
            setDebugInfo(prev => prev + `\nAI reply added. ID: ${replyRef.id}`);
          }).catch(err => {
            setDebugInfo(prev => prev + `\nError adding AI reply: ${err.message}`);
          });
        }, 1000);
      } catch (error: any) {
        setDebugInfo(prev => prev + `\nError with journal path: ${error.message}`);
        
        // Try alternative path (chats collection)
        try {
          const chatId = "test-chat";
          const messagesRef = collection(db, "users", userId, "chats", chatId);
          const docRef = await addDoc(messagesRef, newMessage);
          
          setDebugInfo(prev => prev + `\nMessage sent successfully to chats path. ID: ${docRef.id}`);
          
          // Add the message to the local state
          setMessages([...messages, { ...newMessage, id: docRef.id }]);
          
          // Mock AI reply for chats path
          setTimeout(() => {
            const aiReply: Message = {
              content: "This is a test AI reply via the chats path. Your database connection is working correctly if you see this message!",
              sender: "ai",
              timestamp: serverTimestamp(),
              usage: {
                promptTokens: Math.floor(inputMessage.length / 4),
                completionTokens: 20,
                totalTokens: Math.floor(inputMessage.length / 4) + 20
              }
            };
            
            // Add AI reply to database
            addDoc(messagesRef, aiReply).then(replyRef => {
              setMessages(prev => [...prev, { ...aiReply, id: replyRef.id }]);
              setDebugInfo(prev => prev + `\nAI reply added to chats path. ID: ${replyRef.id}`);
            }).catch(err => {
              setDebugInfo(prev => prev + `\nError adding AI reply to chats: ${err.message}`);
            });
          }, 1000);
        } catch (chatError: any) {
          setError(`Failed to send message: ${chatError.message}`);
          setDebugInfo(prev => prev + `\nError with chats path: ${chatError.message}`);
        }
      }
    } catch (error: any) {
      setError(`Error: ${error.message}`);
      setDebugInfo(prev => prev + `\nGeneral error in sendMessage: ${error.message}`);
    } finally {
      setInputMessage("");
      setIsLoading(false);
    }
  };

  // Reset chat
  const resetChat = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setMessages([]);
    setDebugInfo(prev => prev + `\nResetting chat...`);
    
    // No need to actually delete messages for this test
    // Just clear the local state
    
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Chat Page</h1>
      
      {!userId && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please sign in to use this chat feature.
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-32">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div 
                key={msg.id || index}
                className={`p-3 rounded-lg ${
                  msg.sender === 'ai' ? 'bg-blue-100 ml-8' : 'bg-white mr-8 border'
                }`}
              >
                <div className="font-medium mb-1">
                  {msg.sender === 'ai' ? 'AI' : 'You'}
                </div>
                <div>{msg.content}</div>
                {msg.usage && (
                  <div className="text-xs text-gray-500 mt-2 text-right">
                    Tokens: {msg.usage.totalTokens} (Prompt: {msg.usage.promptTokens}, Completion: {msg.usage.completionTokens})
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <form onSubmit={sendMessage} className="relative">
        <Textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full p-3 pr-24 resize-none rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={3}
          disabled={isLoading || !userId}
        />
        <div className="absolute right-2 bottom-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={resetChat}
            title="Reset conversation"
            disabled={isLoading || !userId}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !inputMessage.trim() || !userId}
            className="px-3 py-2"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                <span>Sending</span>
              </div>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" /> Send
              </>
            )}
          </Button>
        </div>
      </form>
      
      {/* Debug Panel */}
      <div className="mt-8 p-4 border border-gray-300 rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
        <pre className="whitespace-pre-wrap text-xs font-mono bg-black text-green-400 p-4 rounded overflow-auto max-h-60">
          {debugInfo || "No debug information yet."}
        </pre>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={() => setDebugInfo("")}
        >
          Clear Debug Log
        </Button>
      </div>
    </div>
  );
};

export default TestChatPage;