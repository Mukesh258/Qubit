import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, User, Calendar, Activity, ArrowLeft, LogOut, Key } from 'lucide-react';
import { authAPI } from '../services/api';

export default function AgentProfile() {
    const navigate = useNavigate();
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const agentId = localStorage.getItem('agent_id');
        if (!agentId) {
            navigate('/');
            return;
        }
        loadAgentProfile();
    }, []);

    const loadAgentProfile = async () => {
        try {
            const response = await authAPI.getProfile();
            setAgent(response.data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-black/10 border-t-black rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-700 font-mono text-sm tracking-widest animate-pulse">LOADING AGENT PROFILE...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-gray-900 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => navigate('/agent/portal')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Portal</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-red-600"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                </button>
            </div>

            {/* Profile Card */}
            <div className="max-w-4xl mx-auto">
                <div className="card rounded-3xl p-8">
                    {/* Profile Header */}
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-quantum-400 to-pqc-500 flex items-center justify-center">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {agent?.name || 'Agent Name'}
                            </h1>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Shield className="w-4 h-4" />
                                <span className="text-sm font-medium">Authorized Agent</span>
                                <span className="px-2 py-0.5 bg-green-500/10 text-green-700 text-xs font-bold rounded-full border border-green-500/20">
                                    ACTIVE
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Mail className="w-3 h-3" />
                                Email Address
                            </label>
                            <p className="text-lg font-medium text-gray-900">
                                {agent?.email || 'agent@srmap.edu.in'}
                            </p>
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Key className="w-3 h-3" />
                                Role
                            </label>
                            <p className="text-lg font-medium text-gray-900">
                                {agent?.role || 'Agent'}
                            </p>
                        </div>

                        {/* User ID */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Activity className="w-3 h-3" />
                                Agent ID
                            </label>
                            <p className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                {localStorage.getItem('agent_id')?.slice(0, 24) || 'N/A'}...
                            </p>
                        </div>

                        {/* Session Token */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Session Token
                            </label>
                            <p className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                {localStorage.getItem('access_token')?.slice(0, 24) || 'N/A'}...
                            </p>
                        </div>
                    </div>

                    {/* Security Notice */}
                    <div className="mt-8 p-6 bg-gradient-to-br from-quantum-50/50 to-pqc-50/50 rounded-2xl border border-quantum-200/50">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-quantum-600" />
                            SECURITY CLEARANCE
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            You have read-only access to anonymous reports submitted through the quantum-safe reporting system.
                            All decryption actions are logged to the immutable audit trail. Access is restricted to verified
                            @srmap.edu.in domain accounts only.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
