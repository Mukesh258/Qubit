import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';

// Components
import QuantumStatusPanel from '../components/QuantumStatusPanel';
import QBERMeter from '../components/QBERMeter';
import ReportForm from '../components/ReportForm';

// Utils
import { secureReportFlow } from '../utils/quantumCrypto';
import { useSecurity } from '../SecurityContext';

const AnonymousReport = () => {
    const navigate = useNavigate();
    const { eavesdroppingActive, tamperingActive } = useSecurity();

    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [qber, setQber] = useState(0);
    const [reportResult, setReportResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Auto-run QKD simulation on mount or when attack status changes
    useEffect(() => {
        const runQKD = async () => {
            setStatus('active');
            const result = await secureReportFlow({}, eavesdroppingActive);
            setQber(result.qber);
            if (result.error === 'intrusion_detected') {
                setStatus('error');
            } else {
                setStatus('idle');
            }
        };
        runQKD();
    }, [eavesdroppingActive]);

    const handleSubmitReport = async (formData) => {
        setStatus('processing');
        setErrorMessage('');

        try {
            // 1. Perform Hybrid Encryption
            const encryptionResult = await secureReportFlow(formData, eavesdroppingActive);

            if (encryptionResult.error === 'intrusion_detected') {
                setStatus('error');
                setErrorMessage('Quantum Channel compromised. Intrusion detected by BB84 protocol. Report submission blocked for your safety.');
                return;
            }

            // 2. Simulate Tampering if active in Attack Lab
            let finalPayload = encryptionResult.encryptedPayload;
            if (tamperingActive) {
                // Corrupt the ciphertext base64
                finalPayload = finalPayload.substring(0, finalPayload.length - 4) + "XXXX";
            }

            // 3. Convert attachments to base64 for storage
            const attachmentsWithData = await Promise.all(
                (formData.attachments || []).map(async (file) => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve({
                                name: file.name,
                                type: file.type,
                                size: `${(file.size / 1024).toFixed(2)} KB`,
                                data: reader.result // base64 data URL
                            });
                        };
                        reader.readAsDataURL(file);
                    });
                })
            );

            // 4. Submit to Backend
            // Include token if available to link report to user history
            const token = localStorage.getItem('access_token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const response = await axios.post('http://localhost:8000/api/report/anonymous', {
                encrypted_payload: finalPayload,
                qkd_protocol: "BB84",
                qber: encryptionResult.qber,
                session_id: encryptionResult.sessionId,
                metadata: {
                    category: formData.category,
                    plaintext_content: {
                        title: formData.title,
                        description: formData.description,
                        contact_info: formData.provideContact ? {
                            email: formData.contactEmail || null,
                            phone: formData.contactPhone || null
                        } : null,
                        attachments: attachmentsWithData
                    }
                }
            }, config);

            setReportResult(response.data);
            setStatus('success');


        } catch (err) {
            console.error('Report submission error:', err);
            setStatus('error');
            setErrorMessage(err.response?.data?.detail || 'Secure submission failed. Please check the quantum channel health.');
        }
    };

    return (
        <div className="min-h-screen w-full px-4 py-6 font-sans">
            {/* Header */}
            <div className="w-full mb-8 flex items-center justify-between">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-gray-500 hover:text-quantum-500 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Dashboard</span>
                </button>
                <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-quantum-500" />
                    <h1 className="text-xl font-bold uppercase tracking-tighter text-gray-900">Anonymous Secure Reporting</h1>
                </div>
            </div>

            <div className="w-full grid md:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="md:col-span-2">
                    <div className="card">
                        <h2 className="text-2xl font-bold mb-2 text-gray-900">Submit Anonymous Report</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Your identity is protected by physical laws of quantum mechanics.
                            No IP, No Identity, No correlation.
                        </p>

                        {status === 'success' ? (
                            <div className="text-center py-12 space-y-6 animate-in fade-in zoom-in duration-500">
                                <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                                    <CheckCircle className="w-10 h-10 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Report Secured Successfully</h3>
                                    <p className="text-gray-500 mt-2">
                                        Your report has been encrypted and stored in the quantum-safe vault.
                                    </p>
                                </div>
                                <div className="glass p-4 rounded-xl font-mono text-sm border border-white/50">
                                    <p className="text-xs text-gray-500 mb-1 uppercase">Your Report ID</p>
                                    <p className="text-quantum-500 font-bold text-lg">{reportResult?.report_id}</p>
                                </div>
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="btn-secondary"
                                >
                                    Submit Another Report
                                </button>
                            </div>
                        ) : (
                            <ReportForm
                                onSubmit={handleSubmitReport}
                                disabled={status === 'processing' || status === 'error'}
                            />
                        )}
                    </div>
                </div>

                {/* Right Column: Quantum Status */}
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="text-sm font-mono uppercase tracking-widest text-gray-500 mb-4 text-center">Security Status</h3>
                        <QBERMeter value={qber} />
                        <QuantumStatusPanel status={status} />

                        <div className="mt-6 p-4 glass-dark rounded-xl border border-white/40">
                            <h4 className="text-xs font-bold text-quantum-500 mb-2 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                ANONYMITY DETAILS
                            </h4>
                            <ul className="text-sm space-y-2 text-gray-600">
                                <li>• Firebase Anonymous Authentication used for transport only.</li>
                                <li>• IP address and User Agents are stripped by the backend.</li>
                                <li>• No link between multiple reports from same browser.</li>
                                <li>• Encryption happens in your browser before upload.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-sm animate-in slide-in-from-right duration-300">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <div>
                                <p className="font-bold text-red-500 uppercase text-xs">Security Alert</p>
                                <p className="text-gray-800">{errorMessage}</p>
                            </div>
                        </div>
                    )}

                    {/* Educational Note */}
                    <div className="card bg-gradient-to-br from-quantum-50/50 to-pqc-50/50 border-quantum-200/50">
                        <h3 className="text-xs font-bold mb-2 uppercase text-gray-700">Quantum Defense Notice</h3>
                        <p className="text-sm leading-relaxed text-gray-600 italic">
                            "Traditional reporting systems use ECC/RSA which are vulnerable to 'Store Now, Decrypt Later' attacks. Qubit Force uses BB84 and Kyber-768 to ensure your report remains secret forever."
                            <br /><br />
                            <span className="text-quantum-600/80 text-xs">* BB84 and Kyber-768 are simulated for demonstration purposes.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnonymousReport;
