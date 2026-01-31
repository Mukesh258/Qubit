import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Lock, Shield, User, AlertTriangle } from 'lucide-react';
import { chatAPI } from '../services/api';
import ChatWindow from '../components/ChatWindow';
import { useSecurity } from '../SecurityContext';
import socketService from '../services/socket';

export default function Chat() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { qber, setQber, eavesdroppingActive, setEavesdroppingActive } = useSecurity();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('user_id') || localStorage.getItem('agent_id') || 'demo_user';

    useEffect(() => {
        loadSession();

        // Listen for remote attack activations
        socketService.onAttack((msg) => {
            if (msg.sender_id === userId) return;
            setEavesdroppingActive(msg.active);
            setQber(msg.active ? msg.qber : 0.0);
        });
    }, [sessionId]);

    const handleToggleAttack = async () => {
        const nextActive = !eavesdroppingActive;
        const nextQber = nextActive ? 0.25 : 0.0;

        setEavesdroppingActive(nextActive);
        setQber(nextQber);

        // Broadcast to other side
        socketService.sendAttack(userId, nextActive, nextQber);

        try {
            await chatAPI.simulateAttack(sessionId, nextActive);
        } catch (error) {
            console.error('Failed to notify backend of attack:', error);
        }
    };

    const loadSession = async () => {
        try {
            const response = await chatAPI.getSessionInfo(sessionId);
            setSession(response.data);
        } catch (error) {
            console.error('Failed to load session:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-quantum-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full px-4 py-6">
            <div className="w-full">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex gap-2">
                        <button onClick={() => navigate('/dashboard')} className="btn-secondary flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Dashboard</span>
                        </button>
                        <button onClick={() => navigate('/profile')} className="btn-secondary flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Profile</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-green-500/30">
                            <Shield className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-gray-900">End-to-End Encrypted</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-cyan-500/30">
                            <Lock className="w-5 h-5 text-cyan-700" />
                            <span className="text-sm font-medium text-gray-900">QBER: {typeof qber === 'number' ? (qber * 100).toFixed(2) : (session ? (session.qber * 100).toFixed(2) : 'N/A')}%</span>
                        </div>
                    </div>
                </div>

                {/* Chat Window */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                        <ChatWindow sessionId={sessionId} />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="card bg-white/10 backdrop-blur-sm">
                            <h3 className="font-bold mb-4 text-gray-900 text-lg">Session Info</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-800 font-medium">Session ID:</span>
                                    <span className="font-mono text-gray-900 font-semibold">{sessionId?.slice(0, 8)}...</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-800 font-medium">Encryption:</span>
                                    <span className="text-green-700 font-semibold">AES-256-GCM</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-800 font-medium">Key Exchange:</span>
                                    <span className="text-cyan-700 font-semibold">Kyber-768</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-800 font-medium">Signatures:</span>
                                    <span className="text-pink-700 font-semibold">Dilithium-3</span>
                                </div>
                            </div>

                            {/* Simulation Controls for testing */}
                            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-2">
                                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Defense Lab</p>
                                <button
                                    onClick={handleToggleAttack}
                                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${eavesdroppingActive
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                        : 'bg-black text-white hover:bg-black/80'
                                        }`}
                                >
                                    <AlertTriangle className={`w-4 h-4 ${eavesdroppingActive ? 'animate-pulse' : ''}`} />
                                    {eavesdroppingActive ? 'DEACTIVATE EVE' : 'SIMULATE EAVESDROP'}
                                </button>
                                <p className="text-[9px] text-gray-500 text-center italic mt-1">
                                    Simulate Eve's presence to test QBER detection logic
                                </p>
                            </div>
                        </div>

                        <div className="card bg-green-100/30 backdrop-blur-sm border border-green-500/30">
                            <h3 className="font-bold mb-3 flex items-center gap-2 text-gray-900 text-base">
                                <Shield className="w-5 h-5 text-green-600" />
                                <span>Security Status</span>
                            </h3>
                            <p className="text-sm text-gray-800 leading-relaxed">
                                This session is protected by hybrid quantum-safe cryptography. Messages are encrypted end-to-end and cannot be intercepted.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
