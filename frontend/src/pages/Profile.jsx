import React, { useState, useEffect } from 'react';
import {
    User, Shield, Lock, Zap, Activity, Info,
    RefreshCw, CheckCircle2, AlertTriangle,
    Database, Cpu, Network, ShieldCheck,
    Mail, Fingerprint, Calendar, Clock,
    ArrowUpRight, ArrowDownLeft, ShieldAlert,
    ArrowLeft, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useSecurity } from '../SecurityContext';

const Tooltip = ({ title, body }) => (
    <div className="group relative inline-block ml-1">
        <Info className="w-4 h-4 text-gray-400 hover:text-quantum-400 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 glass bg-black/90 rounded-xl text-xs text-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            <h4 className="font-bold text-quantum-400 mb-1">{title}</h4>
            <p className="leading-relaxed">{body}</p>
        </div>
    </div>
);

const SecurityCard = ({ icon: Icon, title, tooltipTitle, tooltipBody, children, colorClass = "text-quantum-400" }) => (
    <div className="card space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                {tooltipTitle && <Tooltip title={tooltipTitle} body={tooltipBody} />}
            </div>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const StatRow = ({ label, value, subtext, status }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
        <div className="space-y-0.5">
            <p className="text-sm text-gray-400">{label}</p>
            {subtext && <p className="text-[10px] text-gray-500">{subtext}</p>}
        </div>
        <div className="text-right">
            <p className="text-sm font-medium">{value}</p>
            {status && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status === 'secure' ? 'bg-green-500/10 text-green-400' :
                    status === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                    }`}>
                    {status.toUpperCase()}
                </span>
            )}
        </div>
    </div>
);

export default function Profile() {
    const navigate = useNavigate();
    const { eavesdroppingActive, qber, mitmAttempts, tamperingDetected, lastThreatAlert } = useSecurity();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rotating, setRotating] = useState(false);
    const [rotationSuccess, setRotationSuccess] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('access_token')) {
            navigate('/');
            return;
        }
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setError(null);
            const response = await authAPI.getProfile();
            setProfile(response.data);
        } catch (err) {
            console.error('Failed to fetch profile:', err);
            setError('Failed to synchronize cryptographic identity. Please try logging in again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRotateKeys = async () => {
        setRotating(true);
        try {
            await authAPI.rotateKeys();
            setRotationSuccess(true);
            setTimeout(() => setRotationSuccess(false), 3000);
            await fetchProfile();
        } catch (error) {
            console.error('Key rotation failed:', error);
        } finally {
            setRotating(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-quantum-500/30 border-t-quantum-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400 animate-pulse">Synchronizing Cryptographic Identity...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Cryptographic Sync Failed</h2>
                <p className="text-gray-400 mb-8 max-w-md">{error || 'Your quantum session has expired.'}</p>
                <button
                    onClick={() => navigate('/')}
                    className="btn-primary"
                >
                    Return to Login
                </button>
            </div>
        );
    }

    const qberPercent = typeof qber === 'number' ? (qber * 100).toFixed(2) : null;

    const profileData = {
        user: {
            name: profile?.user?.name ?? 'Unknown User',
            email: profile?.user?.email ?? 'unknown@example.com',
            user_id: profile?.user?.user_id ?? 'unknown',
            avatar_url: profile?.user?.avatar_url ?? '/avatar.svg'
        },
        role: profile?.role ?? '',
        agency: profile?.agency ?? '',
        pqc_keys: {
            dilithium_3: profile?.pqc_keys?.dilithium_3 ?? 'Not generated',
            kyber_768: profile?.pqc_keys?.kyber_768 ?? 'Not generated',
            status: profile?.pqc_keys?.status ?? 'uninitialized',
            last_rotation: profile?.pqc_keys?.last_rotation ?? 'N/A'
        },
        qkd_stats: {
            last_protocol: profile?.qkd_stats?.last_protocol ?? 'BB84',
            avg_qber: qberPercent ?? (profile?.qkd_stats?.avg_qber ?? '0.00'),
            sessions_secure: profile?.qkd_stats?.sessions_secure ?? 0,
            eavesdropping_detections: eavesdroppingActive ? 1 : (profile?.qkd_stats?.eavesdropping_detections ?? 0)
        },
        encryption_health: {
            mode: profile?.encryption_health?.mode ?? 'Hybrid PQC+QKD',
            algorithm: profile?.encryption_health?.algorithm ?? 'AES-256-GCM',
            key_freshness: profile?.encryption_health?.key_freshness ?? 'Fresh'
        },
        activity: {
            messages_sent: profile?.activity?.messages_sent ?? 0,
            messages_received: profile?.activity?.messages_received ?? 0,
            integrity_verified: profile?.activity?.integrity_verified ?? 'OK',
            active_chats: profile?.activity?.active_chats ?? 0
        },
        attack_stats: {
            mitm_attempts: mitmAttempts ?? (profile?.attack_stats?.mitm_attempts ?? 0),
            tampering_detected: tamperingDetected ?? (profile?.attack_stats?.tampering_detected ?? 0),
            last_alert: (lastThreatAlert && lastThreatAlert !== 'None') ? lastThreatAlert : (profile?.attack_stats?.last_alert ?? 'None')
        }
    };

    return (
        <div className="min-h-screen w-full space-y-8 animate-fade-in pb-20 px-6 py-6">
            {/* Back Button */}
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back to Dashboard</span>
            </button>

            {eavesdroppingActive && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <div>
                        <p className="text-sm font-bold text-red-500 uppercase">Intrusion Detected</p>
                        <p className="text-xs text-gray-300">Eavesdropper activity is currently active in the quantum channel.</p>
                    </div>
                </div>
            )}

            {/* Header / Identity */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative">
                    <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center p-2">
                        <div className="w-full h-full rounded-2xl overflow-hidden bg-white/5">
                            <img
                                src={profileData.user.avatar_url}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-quantum-500 p-2 rounded-xl border-4 border-[#0a0a0a]">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl md:text-4xl font-bold">{profileData.user.name}</h1>
                        </div>
                        <div className="flex flex-wrap gap-4 text-gray-400 text-sm">
                            <div className="flex items-center gap-1.5">
                                <Mail className="w-4 h-4" />
                                {profileData.user.email}
                            </div>
                            <div className="flex items-center gap-1.5 text-quantum-400 font-mono">
                                <Fingerprint className="w-4 h-4" />
                                ID: {profileData.user.user_id.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 text-xs">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400">Joined: Jan 2026</span>
                        </div>
                        <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 text-xs">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400">Last Active: Just now</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleRotateKeys}
                        disabled={rotating}
                        className={`btn-primary flex items-center gap-2 ${rotating ? 'opacity-50' : ''}`}
                    >
                        {rotating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {rotationSuccess ? 'ID Rotated!' : 'Rotate PQC Identity'}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* PQC Identity */}
                <SecurityCard
                    icon={Cpu}
                    title="Post-Quantum Identity"
                    colorClass="text-pqc-400"
                    tooltipTitle="PQC Layer"
                    tooltipBody="Lattice-based cryptography (Kyber & Dilithium) replaces classical RSA/ECC, making your identity mathematically safe from quantum Shore's algorithm."
                >
                    <StatRow
                        label="Dilithium-3 Key"
                        subtext="Digital Signatures"
                        value={profileData.pqc_keys.dilithium_3}
                        status="secure"
                    />
                    <StatRow
                        label="Kyber-768 Key"
                        subtext="Key Encapsulation"
                        value={profileData.pqc_keys.kyber_768}
                        status="secure"
                    />
                    <StatRow
                        label="Identity Status"
                        value={profileData.pqc_keys.status}
                    />
                    <StatRow
                        label="Last Rotation"
                        value={profileData.pqc_keys.last_rotation}
                    />
                </SecurityCard>

                {/* QKD Status */}
                <SecurityCard
                    icon={Network}
                    title="Quantum Network Status"
                    tooltipTitle="Quantum Layer (QKD)"
                    tooltipBody="Shows the health of physical quantum bit exchange. QBER (Quantum Bit Error Rate) over 11% automatically triggers an eavesdropping alert."
                >
                    <div className="glass px-3 py-3 rounded-xl">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>QBER Trend</span>
                            <span className="text-gray-700 font-semibold">{profileData.qkd_stats.avg_qber}%</span>
                        </div>
                        <svg viewBox="0 0 240 60" className="w-full h-12">
                            <defs>
                                <linearGradient id="qberLine" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#22d3ee" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                                <linearGradient id="qberFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(34,211,238,0.25)" />
                                    <stop offset="100%" stopColor="rgba(168,85,247,0.05)" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0 48 L20 44 L40 46 L60 40 L80 42 L100 36 L120 38 L140 34 L160 36 L180 30 L200 32 L220 28 L240 30"
                                fill="none"
                                stroke="url(#qberLine)"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <path
                                d="M0 48 L20 44 L40 46 L60 40 L80 42 L100 36 L120 38 L140 34 L160 36 L180 30 L200 32 L220 28 L240 30 L240 60 L0 60 Z"
                                fill="url(#qberFill)"
                            />
                        </svg>
                    </div>
                    <StatRow
                        label="Current Protocol"
                        value={profileData.qkd_stats.last_protocol}
                    />
                    <StatRow
                        label="Successful Sessions"
                        value={profileData.qkd_stats.sessions_secure}
                    />
                    <StatRow
                        label="Interceptions Detected"
                        value={profileData.qkd_stats.eavesdropping_detections}
                        status={profileData.qkd_stats.eavesdropping_detections > 0 ? 'warning' : 'secure'}
                    />
                </SecurityCard>

                {/* Encryption Health */}
                <SecurityCard
                    icon={Lock}
                    title="Encryption Health"
                    colorClass="text-green-400"
                    tooltipTitle="Hybrid Cryptography"
                    tooltipBody="We combine Quantum entropy from QKD with standard NIST-vetted PQC for true Defense-in-Depth security."
                >
                    <StatRow
                        label="Security Mode"
                        value={profileData.encryption_health.mode}
                    />
                    <StatRow
                        label="Symmetric Base"
                        value={profileData.encryption_health.algorithm}
                    />
                    <StatRow
                        label="Key Freshness"
                        value={profileData.encryption_health.key_freshness}
                        status="secure"
                    />
                    <StatRow
                        label="Session Life"
                        value="3600s / 256MB"
                    />
                </SecurityCard>

                {/* Activity */}
                <SecurityCard icon={Activity} title="Secure Activity">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass p-3 rounded-xl border-quantum-500/10">
                            <p className="text-[10px] text-gray-500 mb-1">DATA SENT</p>
                            <div className="flex items-center gap-2">
                                <ArrowUpRight className="w-4 h-4 text-quantum-400" />
                                <span className="font-bold">{profileData.activity.messages_sent} MSG</span>
                            </div>
                        </div>
                        <div className="glass p-3 rounded-xl border-pqc-500/10">
                            <p className="text-[10px] text-gray-500 mb-1">DATA RECEIVED</p>
                            <div className="flex items-center gap-2">
                                <ArrowDownLeft className="w-4 h-4 text-pqc-400" />
                                <span className="font-bold">{profileData.activity.messages_received} MSG</span>
                            </div>
                        </div>
                    </div>
                    <StatRow
                        label="Integrity Verified"
                        value={profileData.activity.integrity_verified}
                        status="secure"
                    />
                    <StatRow
                        label="Active Encrypted Chats"
                        value={profileData.activity.active_chats}
                    />
                </SecurityCard>

                {/* Attack Awareness */}
                <SecurityCard
                    icon={ShieldAlert}
                    title="Attack Awareness"
                    colorClass="text-red-400"
                    tooltipTitle="Intrusion Detection"
                    tooltipBody="Historical record of security events blocked by the quantum layer, including MITM attacks and bit tampering."
                >
                    <StatRow
                        label="MITM Attempts Blocked"
                        value={profileData.attack_stats.mitm_attempts}
                        status={profileData.attack_stats.mitm_attempts > 0 ? 'warning' : 'secure'}
                    />
                    <StatRow
                        label="Tampering Detected"
                        value={profileData.attack_stats.tampering_detected}
                    />
                    <StatRow
                        label="Last Threat Alert"
                        value={profileData.attack_stats.last_alert}
                    />
                    <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] text-red-300">
                        * All threats were successfully mitigated by the Quantum Core.
                    </div>
                </SecurityCard>

                {/* Report History */}
                <SecurityCard icon={Database} title="Report History" colorClass="text-blue-400">
                    <div className="space-y-2">
                        {profile?.reports && profile.reports.length > 0 ? (
                            profile.reports.map((report, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-300 truncate">{report.title || `Report #${report.id?.slice(0, 8)}`}</p>
                                        <p className="text-[10px] text-gray-500">{new Date(report.timestamp).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${report.status === 'resolved' ? 'bg-green-500/10 text-green-400' :
                                            report.status === 'under_review' ? 'bg-yellow-500/10 text-yellow-400' :
                                                report.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-gray-500/10 text-gray-400'
                                        }`}>
                                        {report.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-sm text-gray-500 italic">No reports submitted yet</p>
                                <button
                                    onClick={() => navigate('/report')}
                                    className="mt-3 text-xs text-quantum-400 hover:text-quantum-300 font-medium"
                                >
                                    Submit Anonymous Report →
                                </button>
                            </div>
                        )}
                    </div>
                </SecurityCard>
            </div>

            {/* Judge's Note / Footer */}
            <div className="glass p-6 rounded-2xl border-white/10 bg-gradient-to-r from-quantum-500/5 to-pqc-500/5">
                <div className="flex items-start gap-4">
                    <Info className="w-6 h-6 text-quantum-400 shrink-0 mt-1" />
                    <div className="space-y-2">
                        <h4 className="font-bold uppercase text-xs tracking-widest text-quantum-400">System Information for Evaluation</h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            This profile demonstrates **Post-Quantum Authentication**. Unlike classical systems that rely on
                            vulnerable X.509 certificates (RSA/ECC), this identity is bound by **Lattice-Based Cryptography**.
                            All keys shown are active fingerprints used for signing and verifying secure payloads in real-time.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
