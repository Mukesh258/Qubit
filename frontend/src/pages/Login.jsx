import React, { useState } from 'react';
import { Shield, Lock, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        if (!password) {
            setError('Please enter a password');
            return;
        }

        setIsAnimating(true);
        setError(null);

        try {
            const response = await authAPI.loginWithEmail(email);
            const { access_token, user_id, name } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user_id', user_id);
            localStorage.setItem('user_name', name);
            localStorage.setItem('user_email', email);

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Authentication failed');
            setIsAnimating(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsAnimating(true);
        setError(null);
        try {
            const response = await authAPI.login();
            const { auth_url } = response.data;
            if (auth_url) {
                // Perform the actual redirect to Google's account selection page
                window.location.href = auth_url;
            } else {
                throw new Error('Could not generate authorization URL');
            }
        } catch (err) {
            console.error('Google login error:', err);
            setError('Google login failed: ' + (err.response?.data?.detail || err.message));
            setIsAnimating(false);
        }
    };

    const handleCreateAccount = () => {
        setIsFlipped(true);
        setTimeout(() => {
            navigate('/signup');
        }, 400);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-96 h-96 bg-quantum-500/20 rounded-full blur-3xl -top-48 -left-48 animate-float"></div>
                <div className="absolute w-96 h-96 bg-pqc-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-float" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Card flip animation styles */}
            <style>{`
                @keyframes cardFlip {
                    0% { 
                        transform: perspective(1200px) rotateY(0deg); 
                        opacity: 1;
                        transform-style: preserve-3d;
                    }
                    50% {
                        transform: perspective(1200px) rotateY(-90deg);
                        opacity: 0.5;
                    }
                    100% { 
                        transform: perspective(1200px) rotateY(-180deg); 
                        opacity: 0;
                        transform-style: preserve-3d;
                    }
                }
                .card-flip {
                    animation: cardFlip 0.4s ease-in-out forwards;
                    transform-origin: center center;
                    backface-visibility: hidden;
                }
            `}</style>

            <div className="relative z-10 max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
                {/* Left side - Hero content */}
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm">
                        <Zap className="w-4 h-4 text-quantum-400" />
                        <span>Quantum-Safe Cryptography</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                        Protecting voices
                        <span className="text-white"> with quantum</span>
                        <span className="text-gradient"> security.</span>
                    </h1>

                    
                </div>

                {/* Right side - Login card */}
                <div className={`card space-y-6 ${isFlipped ? 'card-flip' : ''}`}>
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-quantum-500 to-pqc-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold">Welcome Back</h2>
                        <p className="text-gray-400">Sign in to access quantum-safe communications</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@agency.gov"
                                className="w-full glass bg-transparent border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-quantum-500 transition-all"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full glass bg-transparent border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-quantum-500 transition-all"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isAnimating}
                            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnimating ? (
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
                        onClick={handleCreateAccount}
                        className="w-full glass bg-white/5 border-white/10 hover:bg-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all font-medium"
                    >
                        <span>Create an account</span>
                    </button>

                    <div className="flex items-center gap-3 text-xs uppercase text-gray-500">
                        <div className="flex-1 border-t border-white/10"></div>
                        <span className="px-2 font-medium">Or continue with</span>
                        <div className="flex-1 border-t border-white/10"></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={isAnimating}
                        className="w-full glass bg-white/5 border-white/10 hover:bg-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-3 transition-all font-medium"
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
        </div>
    );
}
