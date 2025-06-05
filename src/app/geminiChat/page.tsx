"use client";
import React, { useState, useRef, useEffect } from "react";
import { askQuestion, startEmotionalSupportSession } from "../../utils/chatServices";

const GeminiChat = () => {
    const [messages, setMessages] = useState([
        { role: "system", content: "Welcome to Gemini Chat!" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setError("");
        const newMessages = [...messages, { role: "user", content: input }];
        setMessages(newMessages);
        setInput("");
        try {
            const userInput = newMessages
                .map(msg =>
                    `${msg.role === "user" ? "You" : msg.role === "assistant" ? "Bubba" : "System"}: ${msg.content}`
                )
                .join("\n");
            const response = await askQuestion(userInput);
            const assistantReply = response.reply || "No response from Gemini.";
            setMessages([...newMessages, { role: "assistant", content: assistantReply }]);
        } catch (err: any) {
            setError(err.message || "Error communicating with Gemini");
        } finally {
            setLoading(false);
        }
    };

    const handleStartSession = async () => {
        setLoading(true);
        setError("");
        try {
            const userId = "demo-user"; // Replace with actual user ID from auth if needed
            const initialPrompt = "I would like to start an emotional support session.";
            const response = await startEmotionalSupportSession();
            const assistantReply = response.reply || "Hi there! I'm Bubba, your AI emotional support companion. How are you feeling today?";
            setMessages([
                { role: "system", content: "Emotional support session started." },
                { role: "assistant", content: assistantReply }
            ]);
        } catch (err: any) {
            setError(err.message || "Error starting session with Gemini");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Gemini Chat</h1>
            <div className="mb-2 flex gap-2">
                <button
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                    onClick={handleStartSession}
                    disabled={loading}
                >
                    Start Emotional Support Session
                </button>
            </div>
            <div className="border rounded p-4 h-96 overflow-y-auto bg-white mb-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`mb-2 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                        <span
                            className={`inline-block px-2 py-1 rounded ${
                                msg.role === "user"
                                    ? "bg-blue-100"
                                    : msg.role === "assistant"
                                    ? "bg-green-100"
                                    : "bg-gray-200"
                            }`}
                        >
                            <b>{msg.role === "user" ? "You" : msg.role === "assistant" ? "Bubba" : "System"}:</b>{" "}
                            {msg.content}
                        </span>
                    </div>
                ))}
                {loading && <div className="text-gray-400">Thinking...</div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
                <input
                    className="flex-1 border rounded px-2 py-1"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Type your message..."
                    disabled={loading}
                />
                <button
                    className="px-4 py-1 bg-green-500 text-white rounded"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    Send
                </button>
            </div>
            {error && <div className="text-red-500 mt-2">{error}</div>}
        </div>
    );
};

export default GeminiChat;
