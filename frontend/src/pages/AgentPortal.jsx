import React, { useState, useEffect } from 'react';
import {
    Shield, Inbox, Activity, Lock, Eye, AlertTriangle,
    CheckCircle2, Fingerprint, Database, Clock,
    ArrowLeft, LogOut, Search, Filter, ShieldAlert,
    Cpu, Zap, BarChart3, Terminal, MessageSquare, FileText,
    Download, Trash2, ShieldCheck, User
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import { reportAPI, chatAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const StatusBadge = ({ status }) => {
    const isSecure = status === 'Secure';
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSecure ? 'bg-green-500/10 text-green-700 border border-green-500/20' :
            'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}>
            {status}
        </span>
    );
};

const MetricCard = ({ icon: Icon, label, value, colorClass = "text-quantum-400" }) => (
    <div className="card p-4 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{label}</span>
            <Icon className={`w-4 h-4 ${colorClass || 'text-gray-700'}`} />
        </div>
        <div className="text-2xl font-bold font-mono text-gray-900">{value}</div>
    </div>
);

export default function AgentPortal() {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [decryptedContent, setDecryptedContent] = useState(null);
    const [chatSessions, setChatSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('inbox'); // 'inbox', 'audit', or 'chat'
    const [decrypting, setDecrypting] = useState(false);
    const [viewingAttachment, setViewingAttachment] = useState(null);
    const [reportStatus, setReportStatus] = useState({});

    useEffect(() => {
        const agentId = localStorage.getItem('agent_id');
        if (!agentId) {
            navigate('/');
            return;
        }
        loadPortalData();
    }, []);

    const loadPortalData = async () => {
        setLoading(true);
        try {
            const agentId = localStorage.getItem('agent_id');
            const [inboxRes, statsRes, auditRes, chatRes] = await Promise.all([
                reportAPI.getAgentInbox(),
                reportAPI.getAgentStats(),
                reportAPI.getAuditLogs(),
                chatAPI.getUserSessions(agentId)
            ]);
            setReports(inboxRes.data);
            setStats(statsRes.data);
            setAuditLogs(auditRes.data);
            setChatSessions(chatRes.data);
        } catch (err) {
            console.error('Portal sync failure:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDecrypt = async (reportId) => {
        setDecrypting(true);
        try {
            const response = await reportAPI.decryptReport(reportId);
            setDecryptedContent(response.data);
            // Reload audit logs to show the new access event
            const auditRes = await reportAPI.getAuditLogs();
            setAuditLogs(auditRes.data);
        } catch (err) {
            console.error('Decryption failed:', err);
        } finally {
            setDecrypting(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const handleStatusUpdate = async (reportId, newStatus) => {
        try {
            await reportAPI.updateReportStatus(reportId, newStatus);
            // Update local state
            setReportStatus(prev => ({ ...prev, [reportId]: newStatus }));
            // Refresh reports list
            const response = await reportAPI.getAgentInbox();
            setReports(response.data);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const generatePDF = (content) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(33, 33, 33);
        doc.text("QUANTUM SECURE INTAKE REPORT", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`REPORT ID: ${selectedReport.id.toUpperCase()}`, 105, 28, { align: "center" });

        // Metadata Table
        autoTable(doc, {
            startY: 35,
            head: [['Timestamp', 'Protoccol', 'QBER', 'Integrity']],
            body: [[
                new Date(selectedReport.timestamp).toLocaleString(),
                selectedReport.qkd_protocol,
                `${(selectedReport.qber * 100).toFixed(2)}%`,
                selectedReport.qber < 0.11 ? 'SECURE' : 'COMPROMISED'
            ]],
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        // Content
        const contentStartY = doc.lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(content.decrypted_content?.title || 'Untitled Report', 14, contentStartY);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Category: ${(content.decrypted_content?.category || 'General').toUpperCase()}`, 14, contentStartY + 7);

        // Description
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Description:", 14, contentStartY + 18);

        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const splitDescription = doc.splitTextToSize(content.decrypted_content?.description || 'No description provided.', 180);
        doc.text(splitDescription, 14, contentStartY + 25);

        let currentY = contentStartY + 25 + (splitDescription.length * 5) + 10;

        // Contact Info
        if (content.decrypted_content?.contact_info) {
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text("Contact Information:", 14, currentY);
            currentY += 7;

            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            if (content.decrypted_content.contact_info.email) {
                doc.text(`Email: ${content.decrypted_content.contact_info.email}`, 14, currentY);
                currentY += 5;
            }
            if (content.decrypted_content.contact_info.phone) {
                doc.text(`Phone: ${content.decrypted_content.contact_info.phone}`, 14, currentY);
                currentY += 5;
            }
            currentY += 5;
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("This document was decrypted using Post-Quantum Cryptography (Kyber-768). content is ephemeral.", 105, 280, { align: "center" });

        doc.save(`Q_REPORT_${selectedReport.id}.pdf`);
    };

    const handleDownloadReport = (report) => {
        // If we are in the modal and have decrypted content, download PDF
        if (selectedReport && selectedReport.id === report.id && decryptedContent) {
            generatePDF(decryptedContent);
            return;
        }

        // Fallback to JSON for list view or encrypted
        try {
            const reportData = {
                id: report.id,
                timestamp: report.timestamp,
                qkd_protocol: report.qkd_protocol,
                qber: report.qber,
                status: report.status,
                decrypted_content: decryptedContent?.decrypted_content || 'Report not decrypted'
            };

            const dataStr = JSON.stringify(reportData, null, 2);
            const link = document.createElement('a');
            link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            link.download = `report_${report.id}_${new Date(report.timestamp).getTime()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download report');
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            try {
                await reportAPI.deleteReport(reportId);
                setReports(reports.filter(r => r.id !== reportId));
                setSelectedReport(null);
                console.log('Report deleted successfully');
            } catch (error) {
                console.error('Delete failed:', error);
                alert('Failed to delete report');
            }
        }
    };

    const handleDeleteChatSession = async (e, sessionId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this chat session?')) return;

        try {
            const agentId = localStorage.getItem('agent_id');
            await chatAPI.deleteSession(sessionId, agentId);
            setChatSessions(prev => prev.filter(s => s.session_id !== sessionId));
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-black/10 border-t-black rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-700 font-mono text-sm tracking-widest animate-pulse">ESTABLISHING SECURE AGENT CONTEXT...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-gray-900 p-6 flex flex-col gap-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 md:w-10 md:h-10 text-gray-900" />
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-[#1f1f1f] leading-none">Qubit Agent</h1>
                        <span className="px-2 py-1 bg-black/10 text-gray-900 text-[10px] md:text-xs font-black rounded border border-black/10 uppercase self-end mb-1">Read-Only</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/agent/profile')}
                        className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                    >
                        <User className="w-4 h-4" />
                        <span>Agent Profile</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-red-600"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Terminate Session</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Total Reports" value={stats?.total_reports || 0} icon={Database} />
                <MetricCard label="Secure Integrity" value={stats?.secure_reports || 0} icon={CheckCircle2} colorClass="text-green-400" />
                <MetricCard label="Attack Triggers" value={stats?.attack_alerts || 0} icon={ShieldAlert} colorClass="text-red-500" />
                <MetricCard label="Avg Network QBER" value={`${(stats?.avg_qber || 0).toFixed(2)}%`} icon={Activity} />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-2 flex flex-col gap-2">
                    <button
                        onClick={() => setActiveView('inbox')}
                        className={`w-full p-3 rounded-full flex items-center gap-3 transition-all ${activeView === 'inbox' ? 'bg-black text-white' : 'bg-[#e9e9e6] text-gray-700 hover:bg-[#dededb]'}`}
                    >
                        <Inbox className="w-5 h-5" />
                        <span className="font-bold text-sm">Inbox</span>
                    </button>
                    <button
                        onClick={() => setActiveView('audit')}
                        className={`w-full p-3 rounded-full flex items-center gap-3 transition-all ${activeView === 'audit' ? 'bg-black text-white' : 'bg-[#e9e9e6] text-gray-700 hover:bg-[#dededb]'}`}
                    >
                        <Terminal className="w-5 h-5" />
                        <span className="font-bold text-sm">Audit Log</span>
                    </button>
                    <button
                        onClick={() => setActiveView('chat')}
                        className={`w-full p-3 rounded-full flex items-center gap-3 transition-all ${activeView === 'chat' ? 'bg-black text-white' : 'bg-[#e9e9e6] text-gray-700 hover:bg-[#dededb]'}`}
                    >
                        <MessageSquare className="w-5 h-5" />
                        <span className="font-bold text-sm">Chat Center</span>
                    </button>
                </div>

                {/* Main View Panel */}
                <div className="lg:col-span-10 card rounded-3xl p-6 flex flex-col gap-6">
                    {activeView === 'inbox' ? (
                        <>
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Database className="w-5 h-5 text-gray-900" />
                                    ANONYMOUS INTAKE LIST
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="bg-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-gray-500 border border-black/10">
                                        <Filter className="w-3 h-3" />
                                        <span>Sort: Recent</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto space-y-3 pr-2">
                                {reports.length > 0 ? reports.map(report => (
                                    <motion.div
                                        layoutId={report.id}
                                        key={report.id}
                                        onClick={() => {
                                            setSelectedReport(report);
                                            setDecryptedContent(null);
                                        }}
                                        className={`bg-white/80 p-4 rounded-2xl border border-black/10 hover:border-black/20 cursor-pointer transition-all flex items-center justify-between group ${selectedReport?.id === report.id ? 'bg-black/5 ring-1 ring-black/20' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${report.qber < 0.11 ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-600'}`}>
                                                <Lock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-mono text-sm font-bold text-gray-700">ID: {report.id}</div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(report.timestamp).toLocaleString()}
                                                    <span>•</span>
                                                    <span>{report.qkd_protocol}</span>
                                                    <span>•</span>
                                                    <span>QBER: {(report.qber * 100).toFixed(2)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={report.status} />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadReport(report);
                                                }}
                                                className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                                                title="Download Report"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteReport(report.id);
                                                }}
                                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-600 hover:text-red-700"
                                                title="Delete Report"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <Eye className="w-4 h-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-gray-600 italic">
                                        <Inbox className="w-8 h-8 mb-2 opacity-20" />
                                        No reports received via quantum channel.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : activeView === 'audit' ? (
                        <div className="flex flex-col h-full gap-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-gray-900" />
                                COMPLIANCE AUDIT TRAIL
                            </h2>
                            <div className="flex-1 overflow-auto rounded-2xl bg-white border border-black/10 p-4 font-mono text-xs">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-gray-700 border-b border-black/10">
                                            <th className="pb-2">TIMESTAMP</th>
                                            <th className="pb-2">AGENT</th>
                                            <th className="pb-2">RESOURCE</th>
                                            <th className="pb-2">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-600">
                                        {auditLogs.map(log => (
                                            <tr key={log.id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                                                <td className="py-2">{new Date(log.timestamp).toISOString().slice(11, 19)}</td>
                                                <td className="py-2">{log.agent_email}</td>
                                                <td className="py-2">{log.report_id}</td>
                                                <td className="py-2">
                                                    <span className="text-green-700">ACCESS_EPHEMERAL</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-gray-900" />
                                SECURE OPERATIONAL CHATS
                            </h2>
                            <div className="flex-1 overflow-auto space-y-3 pr-2">
                                {chatSessions.length > 0 ? chatSessions.map(session => (
                                    <div
                                        key={session.session_id}
                                        onClick={() => navigate(`/chat/${session.session_id}`)}
                                        className="bg-white/80 p-5 rounded-3xl border border-black/10 hover:border-black/20 cursor-pointer group transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center border border-black/10 group-hover:border-black/20">
                                                    <Lock className="w-6 h-6 text-gray-900" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">Session: {session.session_id.slice(0, 12)}...</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] text-gray-500 uppercase font-mono flex items-center gap-1">
                                                            <Activity className="w-3 h-3" /> QBER: {(session.qber * 100).toFixed(2)}%
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 uppercase font-mono flex items-center gap-1">
                                                            <MessageSquare className="w-3 h-3" /> {session.message_count} messages
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                                                <button className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl">
                                                    JOIN CHANNEL
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteChatSession(e, session.session_id)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                                                    title="Delete Session"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="h-60 flex flex-col items-center justify-center text-gray-600 italic gap-3">
                                        <div className="p-4 bg-black/5 rounded-full">
                                            <MessageSquare className="w-10 h-10 opacity-30" />
                                        </div>
                                        <p>No active field communications detected.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Inspection Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedReport(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        ></motion.div>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl max-h-[90vh] card rounded-[2.5rem] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-black/10 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${selectedReport.qber < 0.11 ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-600'}`}>
                                            <Fingerprint className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-2xl font-bold font-mono">REPORT_{selectedReport.id.toUpperCase()}</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 ml-11">SUBMITTED: {new Date(selectedReport.timestamp).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="p-2 hover:bg-black/10 rounded-full transition-colors"
                                >
                                    <LogOut className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left: Cryptographic Integrity Panel */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-gray-700 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            Quantum Integrity Panel
                                        </h4>
                                        <div className="bg-white p-5 rounded-3xl border border-black/10 space-y-4">
                                            <div className="flex items-center justify-between border-b border-black/10 pb-3">
                                                <span className="text-sm text-gray-600">AES-GCM Status</span>
                                                <span className="text-green-700 flex items-center gap-1 font-bold text-sm">
                                                    <CheckCircle2 className="w-4 h-4" /> VALID
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-black/10 pb-3">
                                                <span className="text-sm text-gray-600">Kyber KEM</span>
                                                <span className="text-gray-900 font-mono text-sm">VERIFIED_768</span>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-black/10 pb-3">
                                                <span className="text-sm text-gray-600">Network QBER</span>
                                                <span className={`text-sm font-bold font-mono ${selectedReport.qber < 0.11 ? 'text-green-700' : 'text-red-600'}`}>
                                                    {(selectedReport.qber * 100).toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="pt-2">
                                                <div className="px-3 py-2 bg-black/5 border border-black/10 rounded-xl text-[10px] text-gray-700 font-bold text-center">
                                                    PROTECTED AGAINST "STORE-NOW-DECRYPT-LATER" ATTACKS
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-gray-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4" />
                                            Session Analysis
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white p-3 rounded-2xl text-center border border-black/10">
                                                <div className="text-[10px] text-gray-500 uppercase">Basis Match</div>
                                                <div className="font-bold text-gray-900">51.2%</div>
                                            </div>
                                            <div className="bg-white p-3 rounded-2xl text-center border border-black/10">
                                                <div className="text-[10px] text-gray-500 uppercase">Final Entropy</div>
                                                <div className="font-bold text-gray-900">256-bit</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Ephemeral Decryption Display */}
                                <div className="flex flex-col gap-6">
                                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Lock className="w-4 h-4" />
                                        Secure Intake Payload
                                    </h4>

                                    {!decryptedContent ? (
                                        <div className="flex-1 bg-white rounded-3xl border border-black/10 p-6 flex flex-col items-center justify-center gap-6 text-center">
                                            <div className="p-5 bg-black/5 rounded-full border border-black/10">
                                                <Eye className="w-10 h-10 text-gray-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <h5 className="font-bold text-lg">Payload is Encrypted</h5>
                                                <p className="text-sm text-gray-600 max-w-[250px] mx-auto">Decryption is ephemeral and will be logged to the audit trail.</p>
                                            </div>
                                            <button
                                                onClick={() => handleDecrypt(selectedReport.id)}
                                                disabled={decrypting || selectedReport.qber >= 0.11}
                                                className={`w-full btn-primary flex items-center justify-center gap-2 py-4 ${selectedReport.qber >= 0.11 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                            >
                                                {decrypting ? (
                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Cpu className="w-5 h-5" />
                                                        <span>Decrypt via PQC Core</span>
                                                    </>
                                                )}
                                            </button>
                                            {selectedReport.qber >= 0.11 && (
                                                <p className="text-red-600 text-[10px] font-bold">DECRYPTION BLOCKED: CHANNEL INTEGRITY COMPROMISED</p>
                                            )}
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex-1 bg-white rounded-3xl border border-black/10 p-6 flex flex-col gap-4 overflow-y-auto max-h-[600px]"
                                        >
                                            {/* Header */}
                                            <div className="flex items-center justify-between border-b border-black/10 pb-3">
                                                <span className="text-[10px] font-black text-gray-700 tracking-tighter">DECRYPTED_PLAINTEXT_EPHEMERAL</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-gray-500">{new Date(decryptedContent.timestamp).toLocaleTimeString()}</span>
                                                    <button
                                                        onClick={() => generatePDF(decryptedContent)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        <span>PDF</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Report Content - Structured Display */}
                                            <div className="space-y-5">
                                                {/* Title Section */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Report Title</label>
                                                    <p className="text-base font-bold text-gray-900">{decryptedContent.decrypted_content?.title || 'Untitled Report'}</p>
                                                </div>

                                                {/* Category Badge */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-black text-white">
                                                        {(decryptedContent.decrypted_content?.category || 'unknown').replace(/_/g, ' ').toUpperCase()}
                                                    </span>
                                                </div>

                                                {/* Submission Date */}
                                                {decryptedContent.decrypted_content?.submitted_at && (
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Submitted</label>
                                                        <p className="text-sm text-gray-700">{new Date(decryptedContent.decrypted_content.submitted_at).toLocaleString()}</p>
                                                    </div>
                                                )}

                                                {/* Description */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Report Details</label>
                                                    <div className="bg-gray-50 rounded-xl p-4 border border-black/5">
                                                        <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                                                            {decryptedContent.decrypted_content?.description || 'No details available'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Contact Info (if provided) */}
                                                {decryptedContent.decrypted_content?.contact_info && (
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Contact Information</label>
                                                        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                                            <p className="text-xs text-yellow-800 font-semibold mb-2">⚠️ Reporter opted to reduce anonymity</p>
                                                            <div className="text-sm text-gray-800 space-y-1">
                                                                {decryptedContent.decrypted_content.contact_info.email && (
                                                                    <p><strong>Email:</strong> {decryptedContent.decrypted_content.contact_info.email}</p>
                                                                )}
                                                                {decryptedContent.decrypted_content.contact_info.phone && (
                                                                    <p><strong>Phone:</strong> {decryptedContent.decrypted_content.contact_info.phone}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Attachments */}
                                                {decryptedContent.decrypted_content?.attachments && decryptedContent.decrypted_content.attachments.length > 0 && (
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Attachments ({decryptedContent.decrypted_content.attachments.length})</label>
                                                        <div className="space-y-2">
                                                            {decryptedContent.decrypted_content.attachments.map((file, idx) => (
                                                                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-black/5 hover:bg-gray-100 transition-colors">
                                                                    <FileText className="w-5 h-5 text-gray-600" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                                        <p className="text-xs text-gray-500">{file.size} • {file.type}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setViewingAttachment(file)}
                                                                        className="px-3 py-1 text-xs font-semibold bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                                                                    >
                                                                        View
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* No attachments message */}
                                                {(!decryptedContent.decrypted_content?.attachments || decryptedContent.decrypted_content.attachments.length === 0) && (
                                                    <div className="text-center py-4">
                                                        <p className="text-xs text-gray-400 italic">No attachments included with this report</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer - Verification Status */}
                                            <div className="pt-4 border-t border-black/10 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4 text-green-700" />
                                                    <span className="text-[10px] font-bold text-green-700 uppercase">
                                                        {decryptedContent.decrypted_content?.integrity_verified ? 'Trusted Content' : 'Unverified'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500 uppercase">Veracity:</span>
                                                    <span className="text-[10px] font-mono text-gray-900">{(decryptedContent.veracity_score * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer - Actions */}
                            <div className="border-t border-black/10 p-6 bg-gray-50 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <label className="text-xs font-bold text-gray-600 uppercase">Status:</label>
                                    <select
                                        value={reportStatus[selectedReport.id] || 'pending'}
                                        onChange={(e) => handleStatusUpdate(selectedReport.id, e.target.value)}
                                        className="px-4 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-quantum-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="under_review">Under Review</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleDownloadReport(selectedReport.id)}
                                        className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Download</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteReport(selectedReport.id)}
                                        className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>

                            {/* Warning Banner if tampered */}
                            {selectedReport.qber >= 0.11 && (
                                <div className="bg-red-500/10 border-t border-red-500/30 p-3 flex items-center justify-center gap-3 text-red-600">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase tracking-widest">INTERCEPTION DETECTED DURING QUANTUM KEY ESTABLISHMENT</span>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Attachment Viewer Modal */}
            <AnimatePresence>
                {viewingAttachment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingAttachment(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        ></motion.div>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-4xl max-h-[90vh] card rounded-3xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-black/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{viewingAttachment.name}</h3>
                                    <p className="text-sm text-gray-500">{viewingAttachment.type} • {viewingAttachment.size}</p>
                                </div>
                                <button
                                    onClick={() => setViewingAttachment(null)}
                                    className="p-2 hover:bg-black/10 rounded-full transition-colors"
                                >
                                    <LogOut className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto p-6 bg-gray-50">
                                {viewingAttachment.type?.startsWith('image/') ? (
                                    <img
                                        src={viewingAttachment.data}
                                        alt={viewingAttachment.name}
                                        className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                                    />
                                ) : viewingAttachment.type?.startsWith('video/') ? (
                                    <video
                                        src={viewingAttachment.data}
                                        controls
                                        className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                                    />
                                ) : viewingAttachment.type === 'application/pdf' ? (
                                    <div className="text-center py-12">
                                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-4">PDF Preview not available</p>
                                        <a
                                            href={viewingAttachment.data}
                                            download={viewingAttachment.name}
                                            className="btn-primary inline-flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download PDF
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                                        <a
                                            href={viewingAttachment.data}
                                            download={viewingAttachment.name}
                                            className="btn-primary inline-flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download File
                                        </a>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Reuse RefreshCw from lucide-react (was missing in imports but using standard name)
function RefreshCw(props) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
}
