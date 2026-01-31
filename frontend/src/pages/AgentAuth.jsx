import React, { useState } from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function AgentAuth() {
    const navigate = useNavigate();
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginAnimating, setLoginAnimating] = useState(false);
    const [loginError, setLoginError] = useState(null);
    
    // Signup state
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [signupAnimating, setSignupAnimating] = useState(false);
    const [signupError, setSignupError] = useState(null);

    const handleAgentLogin = async (e) => {
        if (e) e.preventDefault();
        if (!loginEmail || !loginEmail.includes('@')) {
            setLoginError('Please enter a valid email address');
            return;
        }
        if (!loginPassword) {
            setLoginError('Please enter a password');
            return;
        }

        setLoginAnimating(true);
        setLoginError(null);

        try {
            const response = await authAPI.agentLoginWithEmail(loginEmail);
            const { access_token, agent_id, name } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('agent_id', agent_id);
            localStorage.setItem('agent_name', name);
            localStorage.setItem('agent_email', loginEmail);

            navigate('/agent-portal');
        } catch (err) {
            setLoginError(err.response?.data?.detail || 'Agent login failed');
            setLoginAnimating(false);
        }
    };

    const handleAgentSignup = async (e) => {
        if (e) e.preventDefault();
        if (!signupName.trim()) {
            setSignupError('Please enter your name');
            return;
        }
        if (!signupEmail || !signupEmail.includes('@')) {
            setSignupError('Please enter a valid email address');
            return;
        }
        if (!signupPassword) {
            setSignupError('Please enter a password');
            return;
        }
        if (signupPassword !== confirmPassword) {
            setSignupError('Passwords do not match');
            return;
        }

        setSignupAnimating(true);
        setSignupError(null);

        try {
            const response = await authAPI.agentLoginWithEmail(signupEmail);
            const { access_token, agent_id } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('agent_id', agent_id);
            localStorage.setItem('agent_name', signupName);
            localStorage.setItem('agent_email', signupEmail);

            navigate('/agent-portal');
        } catch (err) {
            setSignupError(err.response?.data?.detail || 'Agent registration failed');
            setSignupAnimating(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Soft gradient blobs background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-400 rounded-full opacity-20 blur-3xl animate-pulse"></div>
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-pink-300 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-green-300 rounded-full opacity-15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute -bottom-20 -right-32 w-80 h-80 bg-blue-400 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>

            {/* 3D Card flip styles */}
            <style>{`
                .flip-container {
                    perspective: 1200px;
                }
                .flipper {
                    position: relative;
                    transition: transform 0.6s;
                    transform-style: preserve-3d;
                    min-height: 600px;
                }
                .flip-container.flipped .flipper {
                    transform: rotateY(180deg);
                }
                .front, .back {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }
                .front {
                    z-index: 2;
                    transform: rotateY(0deg);
                }
                .back {
                    transform: rotateY(180deg);
                }
            `}</style>

            <div className="relative z-10 max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
                {/* Left side - Hero content */}
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm text-gray-700">
                        <Shield className="w-4 h-4 text-cyan-600" />
                        <span className="font-semibold">Qubit Force</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                        Protecting voices
                        <span className="text-black"> with quantum</span>
                        <span className="neon-text"> security.</span>
                    </h1>
                </div>

                {/* Right side - 3D Flip Card */}
                <div className={`flip-container ${isFlipped ? 'flipped' : ''}`}>
                    <div className="flipper">
                        {/* Front - Login */}
                        <div className="front">
                            <div className="card space-y-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-3xl font-bold text-gray-900">Agent Login</h2>
                                    <p className="text-gray-600 text-sm">Access secure reports and complaint intake</p>
                                </div>

                                <form onSubmit={handleAgentLogin} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">Email Address</label>
                                        <input
                                            type="email"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            placeholder="agent@agency.gov"
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">Password</label>
                                        <input
                                            type="password"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            placeholder="Enter password"
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    {loginError && (
                                        <div className="p-3 bg-red-500/20 border-2 border-red-500 rounded-lg text-sm text-red-700 font-semibold">
                                            {loginError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loginAnimating}
                                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                    >
                                        {loginAnimating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Authenticating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Agent Login</span>
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <button
                                    onClick={() => setIsFlipped(true)}
                                    className="btn-secondary w-full font-semibold text-gray-800"
                                >
                                    <span>Create agent account</span>
                                </button>

                                <button
                                    onClick={() => navigate('/')}
                                    className="btn-secondary w-full font-semibold text-gray-800"
                                >
                                    <span>Back to User Login</span>
                                </button>
                            </div>
                        </div>

                        {/* Back - Signup */}
                        <div className="back">
                            <div className="card space-y-6">
                                <div className="text-center">
                                    <h2 className="text-3xl font-bold text-gray-900">Create Agent Account</h2>
                                </div>

                                <form onSubmit={handleAgentSignup} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">Full Name</label>
                                        <input
                                            type="text"
                                            value={signupName}
                                            onChange={(e) => setSignupName(e.target.value)}
                                            placeholder="Your name"
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">Email Address</label>
                                        <input
                                            type="email"
                                            value={signupEmail}
                                            onChange={(e) => setSignupEmail(e.target.value)}
                                            placeholder="agent@agency.gov"
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">Password</label>
                                        <input
                                            type="password"
                                            value={signupPassword}
                                            onChange={(e) => setSignupPassword(e.target.value)}
                                            placeholder="Enter password"
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm password"
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    {signupError && (
                                        <div className="p-3 bg-red-500/20 border-2 border-red-500 rounded-lg text-sm text-red-700 font-semibold">
                                            {signupError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={signupAnimating}
                                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                    >
                                        {signupAnimating ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Creating account...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Create Account</span>
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <button
                                    onClick={() => setIsFlipped(false)}
                                    className="btn-secondary w-full font-semibold text-gray-800"
                                >
                                    <span>Back to Login</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
