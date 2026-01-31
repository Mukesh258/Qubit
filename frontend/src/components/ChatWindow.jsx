import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock } from 'lucide-react';
import { chatAPI } from '../services/api';
import socketService from '../services/socket';

export default function ChatWindow({ sessionId }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    // Support both User and Agent identities
    const userId = localStorage.getItem('user_id') || localStorage.getItem('agent_id') || 'user_demo';

    useEffect(() => {
        loadHistory();

        // Connect WebSocket for real-time updates
        socketService.off(); // Clear previous callbacks
        socketService.connect(sessionId);

        socketService.onMessage(async (msg) => {
            if (msg.sender_id === userId) return; // Already handled by handleSendMessage

            try {
                const decrypted = await chatAPI.decryptMessage(
                    sessionId,
                    userId,
                    msg.ciphertext,
                    msg.nonce,
                    msg.sender_id
                );

                setMessages(prev => {
                    // Prevent duplicate messages if any
                    if (prev.find(m => m.message_id === msg.message_id)) return prev;
                    return [...prev, {
                        ...msg,
                        plaintext: decrypted.data.plaintext,
                        decrypted: true
                    }];
                });
            } catch (error) {
                console.error('Failed to decrypt incoming message:', error);
            }
        });

        return () => {
            socketService.disconnect();
        };
    }, [sessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadHistory = async () => {
        try {
            const response = await chatAPI.getHistory(sessionId, userId);
            const decryptedMessages = await Promise.all(
                response.data.map(async (msg) => {
                    try {
                        const decrypted = await chatAPI.decryptMessage(
                            sessionId,
                            userId,
                            msg.ciphertext,
                            msg.nonce,
                            msg.sender_id
                        );
                        return {
                            ...msg,
                            plaintext: decrypted.data.plaintext,
                            decrypted: true
                        };
                    } catch (error) {
                        return {
                            ...msg,
                            plaintext: '[Encrypted]',
                            decrypted: false
                        };
                    }
                })
            );
            setMessages(decryptedMessages);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || sending) return;

        setSending(true);
        try {
            const response = await chatAPI.sendMessage(sessionId, userId, inputMessage);

            // Decrypt the message we just sent for UI
            const decrypted = await chatAPI.decryptMessage(
                sessionId,
                userId,
                response.data.ciphertext,
                response.data.nonce,
                userId
            );

            const newMsg = {
                ...response.data,
                plaintext: decrypted.data.plaintext,
                decrypted: true
            };

            setMessages(prev => [...prev, newMsg]);

            // Broadcast via WebSocket for real-time
            socketService.sendMessage(userId, response.data.ciphertext, response.data.nonce, response.data.message_id);

            setInputMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="card flex flex-col h-[600px] bg-white/10 backdrop-blur-sm">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-700">
                        <div className="text-center">
                            <Lock className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                            <p className="text-base font-medium">No messages yet. Start a secure conversation!</p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.message_id}
                            className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] px-4 py-3 rounded-2xl ${msg.sender_id === userId
                                    ? 'bg-white/40 backdrop-blur-md border border-cyan-500/20 shadow-sm text-chromatic'
                                    : 'bg-white/20 backdrop-blur-sm text-gray-900 border border-gray-300/30'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Lock className={`w-3 h-3 ${msg.sender_id === userId ? 'opacity-60' : 'opacity-50 text-gray-700'}`} />
                                    <span className={`text-xs opacity-80 font-medium ${msg.sender_id === userId ? '' : 'text-gray-800'}`}>
                                        {msg.sender_id === userId ? 'You' : msg.sender_id}
                                    </span>
                                </div>
                                <p className="break-words text-base">{msg.plaintext}</p>
                                <p className={`text-xs opacity-60 mt-1 ${msg.sender_id === userId ? '' : 'text-gray-700'}`}>
                                    {new Date(msg.timestamp * 1000).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a secure message..."
                    className="input-field flex-1 text-gray-900 placeholder:text-gray-600 bg-white/20 backdrop-blur-sm border-gray-300/30"
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending || !inputMessage.trim()}
                    className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {sending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </form>
        </div >
    );
}
