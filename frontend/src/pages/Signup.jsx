import React, { useState } from 'react';
import { Shield, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Signup() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [error, setError] = useState(null);

    const handleSignup = async (e) => {
        if (e) e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        if (!password) {
            setError('Please enter a password');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsAnimating(true);
        setError(null);

        try {
            const response = await authAPI.loginWithEmail(email);
            const { access_token, user_id } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user_id', user_id);
            localStorage.setItem('user_name', name);
            localStorage.setItem('user_email', email);

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Sign up failed');
            setIsAnimating(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-96 h-96 bg-quantum-500/20 rounded-full blur-3xl -top-48 -left-48 animate-float"></div>
                <div className="absolute w-96 h-96 bg-pqc-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-float" style={{ animationDelay: '1s' }}></div>
            </div>

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

                {/* Right side - Signup card */}
                <div className="card space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-quantum-500 to-pqc-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold">Create Account</h2>
                        <p className="text-gray-400">Start your quantum-safe journey</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                className="w-full glass bg-transparent border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-quantum-500 transition-all"
                                required
                            />
                        </div>

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

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
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
        </div>
    );
}
