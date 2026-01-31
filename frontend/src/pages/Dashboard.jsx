import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MessageSquare, AlertTriangle, Activity, LogOut, Zap, User, Trash2 } from 'lucide-react';
import { qkdAPI, chatAPI, attackAPI, authAPI } from '../services/api';
import { runQKDSimulation } from '../utils/quantumCrypto';
import { useSecurity } from '../SecurityContext';
import QKDVisualizer from '../components/QKDVisualizer';
import QBERChart from '../components/QBERChart';
import AttackLab from '../components/AttackLab';

export default function Dashboard() {
    const navigate = useNavigate();
    const { eavesdroppingActive, setEavesdroppingActive, qber, setQber } = useSecurity();
    const [activeTab, setActiveTab] = useState('overview');
    const [qkdSession, setQkdSession] = useState(null);
    const [engine, setEngine] = useState('qiskit');
    const qiskitExplanationRef = useRef(null);
    const bitLevelExplanationRef = useRef(null);
    const qkdResultsRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chatSessions, setChatSessions] = useState([]);
    const [availableAgents, setAvailableAgents] = useState([]);

    // Agents use Agent Portal only – redirect if logged in as agent
    useEffect(() => {
        if (localStorage.getItem('agent_id')) {
            navigate('/agent-portal', { replace: true });
        }
    }, [navigate]);

    const fetchChatSessions = async () => {
        const userId = localStorage.getItem('user_id') || localStorage.getItem('agent_id');
        if (!userId) return;
        try {
            const response = await chatAPI.getUserSessions(userId);
            setChatSessions(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Failed to fetch chat sessions:', err);
        }
    };

    useEffect(() => {
        const handleOAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            if (code && state) {
                setLoading(true);
                try {
                    const response = await authAPI.callback(code, state);
                    const { access_token, user_id, agent_id, name, email } = response.data;

                    localStorage.setItem('access_token', access_token);
                    if (user_id) localStorage.setItem('user_id', user_id);
                    if (agent_id) localStorage.setItem('agent_id', agent_id);
                    localStorage.setItem('user_name', name);
                    localStorage.setItem('user_email', email);

                    // Clean up URL
                    window.history.replaceState({}, document.title, "/dashboard");
                } catch (err) {
                    console.error('OAuth callback failed:', err);
                    setError('Quantum Authentication failed. Please log in again.');
                } finally {
                    setLoading(false);
                }
            } else if (!localStorage.getItem('access_token')) {
                // No session and no callback code? Go back to login
                navigate('/');
            }
        };

        handleOAuthCallback();
        fetchAgents();
        fetchChatSessions();
    }, []);

    // Poll chat sessions when on Secure Chat tab so agent sees new sessions in real time (same network)
    useEffect(() => {
        if (activeTab !== 'chat') return;
        fetchChatSessions();
        const interval = setInterval(fetchChatSessions, 4000);
        return () => clearInterval(interval);
    }, [activeTab]);

    // Scroll to the selected engine's explanation when engine changes
    useEffect(() => {
        if (engine === 'qiskit') {
            qiskitExplanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            bitLevelExplanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [engine]);

    // Scroll to QKD results when Run Quantum Key Exchange or Simulate Eavesdropping completes
    useEffect(() => {
        if (qkdSession) {
            qkdResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [qkdSession]);

    const fetchAgents = async () => {
        try {
            const response = await authAPI.getAgents();
            // Filter out current user if they are an agent
            const myEmail = localStorage.getItem('user_email');
            setAvailableAgents(response.data.filter(a => a.email !== myEmail));
        } catch (err) {
            console.error('Failed to fetch agents:', err);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const initiateQKD = async (withEavesdropper = false) => {
        setLoading(true);
        setError(null);
        try {
            const response = await qkdAPI.initiate(2048, withEavesdropper, 'Demo Session', engine);
            const result = await qkdAPI.getResult(response.data.session_id);
            const viz = await qkdAPI.getVisualization(response.data.session_id);

            setQkdSession({
                ...response.data,
                ...result.data,
                visualization: viz.data,
                engine: engine
            });

            // Sync with global security context
            setEavesdroppingActive(withEavesdropper);
            setQber(result.data.qber);
        } catch (err) {
            console.warn('QKD backend unavailable, using client-side simulation:', err);
            // Client-side fallback - works without backend
            const numBits = engine === 'qiskit' ? 64 : 512; // Smaller for quick run
            const fallbackResult = runQKDSimulation(numBits, withEavesdropper);

            // Sync with global security context
            setEavesdroppingActive(withEavesdropper);
            setQber(fallbackResult.qber);

            setQkdSession({
                session_id: fallbackResult.session_id,
                qber: fallbackResult.qber,
                shared_key_length: fallbackResult.key_length,
                total_bits_sent: fallbackResult.total_bits_sent,
                bits_after_sifting: fallbackResult.bits_after_sifting,
                eavesdropper_detected: fallbackResult.eavesdropper_detected,
                session_aborted: fallbackResult.session_aborted,
                eavesdropper_active: fallbackResult.eavesdropper_active,
                visualization: fallbackResult.visualization,
                engine: engine,
                _fallback: true
            });
            setError(null); // Clear any prior error - fallback succeeded
        } finally {
            setLoading(false);
        }
    };

    const createChatSession = async (targetAgentId = null) => {
        setLoading(true);
        setError(null);
        try {
            const userId = localStorage.getItem('user_id') || localStorage.getItem('agent_id') || 'user_demo';
            const participants = [userId];
            if (targetAgentId && typeof targetAgentId === 'string') participants.push(targetAgentId);
            else participants.push('agency_1'); // Fallback

            const response = await chatAPI.createSession(
                userId,
                participants,
                localStorage.getItem('agent_id') ? 'Agent Intel Channel' : 'Secure Channel Alpha'
            );

            setChatSessions(prev => [...prev, response.data]);
            navigate(`/chat/${response.data.session_id}`);
        } catch (err) {
            console.error('Chat session creation failed:', err);
            setError(err.response?.data?.detail || err.message || 'Create chat failed. Check backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this chat session?')) return;

        try {
            const userId = localStorage.getItem('user_id') || localStorage.getItem('agent_id');
            await chatAPI.deleteSession(sessionId, userId);
            setChatSessions(prev => prev.filter(s => s.session_id !== sessionId));
        } catch (err) {
            console.error('Failed to delete session:', err);
            // Optionally set error state or show toast
        }
    };

    return (
        <div className="min-h-screen w-full px-6 py-6">
            {/* Header */}
            <div className="w-full mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-3 text-[#1f1f1f] leading-none">
                            Qubit Force
                        </h1>
                        <p className="text-gray-400">Monitor security metrics and manage encrypted communications</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate('/profile')}
                            className="btn-secondary flex items-center gap-2 hover:bg-black/10 hover:border-black/30 transition-all font-bold"
                        >
                            <User className="w-4 h-4" />
                            <span>Security Profile</span>
                        </button>
                        <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="w-full mb-6">
                <div className="flex gap-2 glass p-2 rounded-xl inline-flex">
                    {[
                        { id: 'overview', label: 'Overview', icon: Activity },
                        { id: 'chat', label: 'Secure Chat', icon: MessageSquare },
                        { id: 'report', label: 'Secure Report', icon: Shield },
                        { id: 'attack', label: 'Attack Lab', icon: AlertTriangle },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-black text-white'
                                : 'hover:bg-white/60'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="w-full">
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-fade-in">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Metrics Cards */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Security Status</h3>
                                <Shield className={`w-5 h-5 ${eavesdroppingActive ? 'text-red-400' : 'text-green-400'}`} />
                            </div>
                            <div className={`text-3xl font-bold mb-2 ${eavesdroppingActive ? 'text-red-400' : 'text-green-400'}`}>
                                {eavesdroppingActive ? 'Intrusion' : 'Active'}
                            </div>
                            <p className="text-sm text-gray-400">
                                {eavesdroppingActive ? 'Eavesdropper detected in channel' : 'All systems operational'}
                            </p>
                        </div>

                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">QBER</h3>
                                <Activity className="w-5 h-5 text-quantum-400" />
                            </div>
                            <div className="text-3xl font-bold text-quantum-400 mb-2">
                                {typeof qber === 'number' ? `${(qber * 100).toFixed(2)}%` : (qkdSession ? `${(qkdSession.qber * 100).toFixed(2)}%` : 'N/A')}
                            </div>
                            <p className="text-sm text-gray-400">Quantum Bit Error Rate</p>
                        </div>

                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Active Sessions</h3>
                                <MessageSquare className="w-5 h-5 text-pqc-400" />
                            </div>
                            <div className="text-3xl font-bold text-pqc-400 mb-2">{chatSessions.length}</div>
                            <p className="text-sm text-gray-400">Encrypted chat sessions</p>
                        </div>

                        {/* Action Control: Qiskit and Bit-Level as two sections */}
                        <div className="md:col-span-3 space-y-4">
                            <h3 className="font-semibold">Action Control</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Section 1: Qiskit Engine (Formal) */}
                                <div
                                    className={`card cursor-pointer transition-all border-2 ${engine === 'qiskit' ? 'border-black/20 bg-black/5' : 'border-black/5 hover:border-black/20'}`}
                                    onClick={() => setEngine('qiskit')}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && setEngine('qiskit')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-gray-900">Qiskit Engine</h4>
                                        {engine === 'qiskit' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 text-gray-900">Active</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4">Formal quantum simulation</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEngine('qiskit'); }}
                                        className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${engine === 'qiskit' ? 'bg-black text-white' : 'glass hover:bg-white/60'}`}
                                    >
                                        Use Qiskit Engine (Formal)
                                    </button>
                                </div>
                                {/* Section 2: Bit-Level (Fast) */}
                                <div
                                    className={`card cursor-pointer transition-all border-2 ${engine === 'bb84' ? 'border-black/20 bg-black/5' : 'border-black/5 hover:border-black/20'}`}
                                    onClick={() => setEngine('bb84')}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && setEngine('bb84')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-gray-900">Bit-Level</h4>
                                        {engine === 'bb84' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 text-gray-900">Active</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4">Fast bit-level simulation</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEngine('bb84'); }}
                                        className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${engine === 'bb84' ? 'bg-black text-white' : 'glass hover:bg-white/60'}`}
                                    >
                                        Use Bit-Level (Fast)
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); initiateQKD(false); }}
                                    disabled={loading}
                                    className="btn-primary disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {loading ? 'Processing...' : 'Run Quantum Key Exchange'}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); initiateQKD(true); }}
                                    disabled={loading}
                                    className="btn-secondary disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {loading ? 'Processing...' : 'Simulate Eavesdropping (Eve)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); createChatSession(); }}
                                    disabled={loading}
                                    className="btn-primary disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {loading ? 'Processing...' : 'Create Secure Chat'}
                                </button>
                            </div>

                            {/* Qiskit Engine explanation – shown when Qiskit is selected, scrolls into view */}
                            <div
                                ref={qiskitExplanationRef}
                                className={`rounded-xl border-2 transition-all overflow-hidden ${engine === 'qiskit' ? 'border-black/10 bg-[#f7f7f5]' : 'border-transparent bg-transparent max-h-0 opacity-0 overflow-hidden'}`}
                            >
                                {engine === 'qiskit' && (
                                    <div className="p-6 space-y-4">
                                        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-gray-900" />
                                            Qiskit Engine (Formal) – Explanation
                                        </h4>
                                        <p className="text-sm text-gray-700">
                                            The <strong className="text-gray-900">Qiskit Engine</strong> runs a formal quantum simulation of the BB84 protocol using the Qiskit framework. It models qubits, bases, and measurements so you can see how key distribution and eavesdropping detection work in a quantum setting.
                                        </p>
                                        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                                            <li>Uses quantum circuit simulation (state vectors) for photon behavior.</li>
                                            <li>Alice and Bob choose random bases; Eve can intercept and measure, introducing errors.</li>
                                            <li>QBER (Quantum Bit Error Rate) is computed; above ~11% indicates eavesdropping and the session is aborted.</li>
                                            <li>Best for understanding BB84 step-by-step; slower than bit-level for large key sizes.</li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Bit-Level explanation – shown when Bit-Level is selected, scrolls into view */}
                            <div
                                ref={bitLevelExplanationRef}
                                className={`rounded-xl border-2 transition-all overflow-hidden ${engine === 'bb84' ? 'border-black/10 bg-[#f7f7f5]' : 'border-transparent bg-transparent max-h-0 opacity-0 overflow-hidden'}`}
                            >
                                {engine === 'bb84' && (
                                    <div className="p-6 space-y-4">
                                        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-gray-900" />
                                            Bit-Level (Fast) – Explanation
                                        </h4>
                                        <p className="text-sm text-gray-700">
                                            The <strong className="text-gray-900">Bit-Level</strong> engine simulates BB84 using classical bits and probabilities instead of full quantum simulation. It reproduces the same protocol logic and QBER behavior much faster, so you can run more key bits in less time.
                                        </p>
                                        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                                            <li>Models bits, bases, and measurement outcomes with the same statistics as the quantum case.</li>
                                            <li>QBER calculation and eavesdropping detection (e.g. 11% threshold) match the formal simulation.</li>
                                            <li>Ideal for quick runs and larger key sizes (e.g. 2048+ bits) without heavy computation.</li>
                                            <li>Same security semantics as Qiskit; only the implementation (simulation vs bit-level) differs.</li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* QKD results: Run Quantum Key Exchange → BB84 only; Simulate Eavesdropping → QBER only */}
                            {qkdSession && (
                                <div ref={qkdResultsRef} className="mt-6 scroll-mt-6">
                                    {qkdSession.eavesdropper_active ? (
                                        <QBERChart
                                            qber={typeof qber === 'number' ? qber : qkdSession.qber}
                                            threshold={0.11}
                                            onSecureClick={() => setQkdSession(null)}
                                        />
                                    ) : (
                                        <QKDVisualizer data={qkdSession.visualization} />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 card">
                            <h3 className="text-xl font-semibold mb-4">Secure Chat Sessions</h3>
                            {chatSessions.length > 0 ? (
                                <div className="space-y-3">
                                    {chatSessions.map(session => (
                                        <div
                                            key={session.session_id}
                                            className="glass p-4 rounded-lg cursor-pointer hover:bg-white/20 transition-all"
                                            onClick={() => navigate(`/chat/${session.session_id}`)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium">Session {session.session_id.slice(0, 8)}</h4>
                                                    <p className="text-sm text-gray-400">QBER: {(session.qber * 100).toFixed(2)}%</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Shield className="w-5 h-5 text-green-400 theme-transition" />
                                                    <button
                                                        onClick={(e) => handleDeleteSession(e, session.session_id)}
                                                        className="p-2 hover:bg-black/10 rounded-full transition-all text-gray-400 hover:text-red-500"
                                                        title="Delete Session"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400 mb-6">No chat sessions yet</p>
                                </div>
                            )}
                        </div>

                        <div className="card">
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-pqc-400" />
                                <span>Available Agents</span>
                            </h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {availableAgents.map(agent => (
                                    <div key={agent.agent_id} className="glass p-4 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pqc-500/20 to-quantum-500/20 flex items-center justify-center border border-pqc-500/30">
                                                <Shield className="w-5 h-5 text-pqc-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{agent.name}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Verified Agent</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => createChatSession(agent.agent_id)}
                                            className="p-2 bg-black/10 hover:bg-black/20 text-gray-900 rounded-lg transition-all"
                                            title="Start Secure Chat"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {availableAgents.length === 0 && (
                                    <p className="text-center text-xs text-gray-500 py-4 italic">No agents currently online</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="card text-center py-12">
                        <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Anonymous Secure Reporting</h3>
                        <p className="text-gray-400 mb-6">Submit sensitive intel protected by physical laws of quantum mechanics.</p>
                        <button onClick={() => navigate('/report')} className="btn-primary">
                            Open Reporting Portal
                        </button>
                    </div>
                )}

                {activeTab === 'attack' && <AttackLab />}
            </div>
        </div>
    );
}
