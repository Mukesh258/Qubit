import React, { useState } from 'react';
import { Shield, Swords, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Auth() {
    const navigate = useNavigate();
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAgentMode, setIsAgentMode] = useState(false);

    // User Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginAnimating, setLoginAnimating] = useState(false);
    const [loginError, setLoginError] = useState(null);

    // User Signup state
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [signupAnimating, setSignupAnimating] = useState(false);
    const [signupError, setSignupError] = useState(null);

    // Agent Login state
    const [agentLoginEmail, setAgentLoginEmail] = useState('');
    const [agentLoginPassword, setAgentLoginPassword] = useState('');
    const [agentLoginAnimating, setAgentLoginAnimating] = useState(false);
    const [agentLoginError, setAgentLoginError] = useState(null);

    // Agent Signup state
    const [agentSignupName, setAgentSignupName] = useState('');
    const [agentSignupEmail, setAgentSignupEmail] = useState('');
    const [agentSignupPassword, setAgentSignupPassword] = useState('');
    const [agentConfirmPassword, setAgentConfirmPassword] = useState('');
    const [agentSignupAnimating, setAgentSignupAnimating] = useState(false);
    const [agentSignupError, setAgentSignupError] = useState(null);

    const handleLogin = async (e) => {
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
            const response = await authAPI.loginWithEmail(loginEmail, loginPassword);
            const { access_token, user_id, name } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user_id', user_id);
            localStorage.setItem('user_name', name);
            localStorage.setItem('user_email', loginEmail);

            navigate('/dashboard');
        } catch (err) {
            const detail = err.response?.data?.detail || 'Authentication failed';
            setLoginError(detail);

            // If user not found, suggest registration
            if (err.response?.status === 404) {
                setLoginError(detail + " Click 'Create an account' below.");
            }
            setLoginAnimating(false);
        }
    };

    const handleSignup = async (e) => {
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
            const response = await authAPI.register(signupName, signupEmail, signupPassword);
            const { access_token, user_id } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user_id', user_id);
            localStorage.setItem('user_name', signupName);
            localStorage.setItem('user_email', signupEmail);

            navigate('/dashboard');
        } catch (err) {
            setSignupError(err.response?.data?.detail || 'Sign up failed');
            setSignupAnimating(false);
        }
    };

    const handleAgentLogin = async (e) => {
        if (e) e.preventDefault();
        if (!agentLoginEmail || !agentLoginEmail.includes('@')) {
            setAgentLoginError('Please enter a valid email address');
            return;
        }
        if (!agentLoginPassword) {
            setAgentLoginError('Please enter a password');
            return;
        }

        setAgentLoginAnimating(true);
        setAgentLoginError(null);

        try {
            const response = await authAPI.agentLoginWithEmail(agentLoginEmail, agentLoginPassword);
            const { access_token, agent_id, name } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('agent_id', agent_id);
            localStorage.setItem('agent_name', name);
            localStorage.setItem('agent_email', agentLoginEmail);

            navigate('/agent-portal');
        } catch (err) {
            const detail = err.response?.data?.detail || 'Agent authentication failed';
            setAgentLoginError(detail);
            if (err.response?.status === 404) {
                setAgentLoginError(detail + " Register as a new agent below.");
            }
            setAgentLoginAnimating(false);
        }
    };

    const handleAgentSignup = async (e) => {
        if (e) e.preventDefault();
        if (!agentSignupName.trim()) {
            setAgentSignupError('Please enter your name');
            return;
        }
        if (!agentSignupEmail || !agentSignupEmail.includes('@')) {
            setAgentSignupError('Please enter a valid email address');
            return;
        }
        if (!agentSignupPassword) {
            setAgentSignupError('Please enter a password');
            return;
        }
        if (agentSignupPassword !== agentConfirmPassword) {
            setAgentSignupError('Passwords do not match');
            return;
        }

        setAgentSignupAnimating(true);
        setAgentSignupError(null);

        try {
            const response = await authAPI.agentRegister(agentSignupName, agentSignupEmail, agentSignupPassword);
            const { access_token, agent_id } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('agent_id', agent_id);
            localStorage.setItem('agent_name', agentSignupName);
            localStorage.setItem('agent_email', agentSignupEmail);

            navigate('/agent-portal');
        } catch (err) {
            setAgentSignupError(err.response?.data?.detail || 'Agent registration failed');
            setAgentSignupAnimating(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoginAnimating(true);
        setLoginError(null);
        try {
            const response = await authAPI.login();
            const { auth_url } = response.data;
            if (auth_url) {
                window.location.href = auth_url;
            } else {
                throw new Error('Could not generate authorization URL');
            }
        } catch (err) {
            console.error('Google login error:', err);
            setLoginError('Google login failed: ' + (err.response?.data?.detail || err.message));
            setLoginAnimating(false);
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
                        {isAgentMode ? (
                            <Swords className="w-4 h-4 text-cyan-600" />
                        ) : (
                            <Shield className="w-4 h-4 text-cyan-600" />
                        )}
                        <span className="font-semibold">{isAgentMode ? 'Agent Operations' : 'Qubit Force'}</span>
                    </div>
                    {isAgentMode && (
                        <button
                            onClick={() => {
                                setIsFlipped(true);
                                setTimeout(() => {
                                    setIsAgentMode(false);
                                    setIsFlipped(false);
                                }, 600);
                            }}
                            className="hidden"
                        >
                            Back to User Login
                        </button>
                    )}

                    <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                        Protecting voices
                        <span className="text-black"> with quantum</span>
                        <span className="neon-text"> security.</span>
                    </h1>
                </div>

                {/* Right side - 3D Flip Card */}
                <div className={`flip-container ${isFlipped ? 'flipped' : ''}`}>
                    <div className="flipper">
                        {/* User Login & Agent Login */}
                        {!isAgentMode && (
                            <>
                                {/* Front - User Login */}
                                <div className="front">
                                    <div className="card space-y-6">
                                        <div className="text-center space-y-2">
                                            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                                            <p className="text-gray-600 text-sm">Sign in to access quantum-safe communications</p>
                                        </div>

                                        <form onSubmit={handleLogin} className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-800">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={loginEmail}
                                                    onChange={(e) => setLoginEmail(e.target.value)}
                                                    placeholder="name@agency.gov"
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
                                                        <span>Secure Login</span>
                                                        <ArrowRight className="w-5 h-5" />
                                                    </>
                                                )}
                                            </button>
                                        </form>

                                        <button
                                            onClick={() => setIsFlipped(true)}
                                            className="btn-secondary w-full font-semibold text-gray-800"
                                        >
                                            <span>Create an account</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsFlipped(true);
                                                setTimeout(() => {
                                                    setIsAgentMode(true);
                                                    setIsFlipped(false);
                                                }, 600);
                                            }}
                                            className="btn-secondary w-full font-semibold text-gray-800"
                                        >
                                            <span>Agent Portal</span>
                                        </button>

                                        <div className="flex items-center gap-3 text-xs uppercase text-gray-500 font-semibold">
                                            <div className="flex-1 border-t-2 border-gray-300"></div>
                                            <span className="px-2">Or continue with</span>
                                            <div className="flex-1 border-t-2 border-gray-300"></div>
                                        </div>

                                        <button
                                            onClick={handleGoogleLogin}
                                            disabled={loginAnimating}
                                            className="btn-secondary w-full flex items-center justify-center gap-3 font-semibold text-gray-800"
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path
                                                    fill="currentColor"
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                />
                                            </svg>
                                            <span>Continue with Google</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Back - User Signup */}
                                {!isAgentMode && (
                                    <div className="back">
                                        <div className="card space-y-6">
                                            <div className="text-center">
                                                <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                                            </div>

                                            <form onSubmit={handleSignup} className="space-y-5">
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
                                                        placeholder="name@agency.gov"
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
                                        </div>
                                    </div>
                                )}

                            </>
                        )}

                        {/* Agent Login */}
                        {isAgentMode && !isFlipped && (
                            <div className="front">
                                <div className="card space-y-6">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-3xl font-bold text-gray-900">Agent Login</h2>
                                        <p className="text-gray-600 text-sm">Access secure reports and complaint intake</p>
                                    </div>

                                    <form onSubmit={handleAgentLogin} className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-800">Agent Email Address</label>
                                            <input
                                                type="email"
                                                value={agentLoginEmail}
                                                onChange={(e) => setAgentLoginEmail(e.target.value)}
                                                placeholder="yourname@srmap.edu.in"
                                                className="input-field"
                                                required
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">* Must be an @srmap.edu.in authorized email</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-800">Password</label>
                                            <input
                                                type="password"
                                                value={agentLoginPassword}
                                                onChange={(e) => setAgentLoginPassword(e.target.value)}
                                                placeholder="Enter password"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        {agentLoginError && (
                                            <div className="p-3 bg-red-500/20 border-2 border-red-500 rounded-lg text-sm text-red-700 font-semibold">
                                                {agentLoginError}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={agentLoginAnimating}
                                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                        >
                                            {agentLoginAnimating ? (
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
                                </div>
                            </div>
                        )}

                        {/* Agent Signup */}
                        {isAgentMode && isFlipped && (
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
                                                value={agentSignupName}
                                                onChange={(e) => setAgentSignupName(e.target.value)}
                                                placeholder="Your name"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-800">Authorized Email Address</label>
                                            <input
                                                type="email"
                                                value={agentSignupEmail}
                                                onChange={(e) => setAgentSignupEmail(e.target.value)}
                                                placeholder="name@srmap.edu.in"
                                                className="input-field"
                                                required
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">* Registration restricted to @srmap.edu.in domain</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-800">Password</label>
                                            <input
                                                type="password"
                                                value={agentSignupPassword}
                                                onChange={(e) => setAgentSignupPassword(e.target.value)}
                                                placeholder="Enter password"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-800">Confirm Password</label>
                                            <input
                                                type="password"
                                                value={agentConfirmPassword}
                                                onChange={(e) => setAgentConfirmPassword(e.target.value)}
                                                placeholder="Confirm password"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        {agentSignupError && (
                                            <div className="p-3 bg-red-500/20 border-2 border-red-500 rounded-lg text-sm text-red-700 font-semibold">
                                                {agentSignupError}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={agentSignupAnimating}
                                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                        >
                                            {agentSignupAnimating ? (
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
