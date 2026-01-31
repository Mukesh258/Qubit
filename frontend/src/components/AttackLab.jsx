import { useState } from 'react';
import { AlertTriangle, Info, Shield } from 'lucide-react';
import { useSecurity } from '../SecurityContext';
import { attackAPI } from '../services/api';

export default function AttackLab() {
    const {
        eavesdroppingActive, setEavesdroppingActive,
        tamperingActive, setTamperingActive,
        qber, setQber,
        mitmAttempts, setMitmAttempts,
        tamperingDetected, setTamperingDetected,
        lastThreatAlert, setLastThreatAlert
    } = useSecurity();

    const [eavesdropResult, setEavesdropResult] = useState(null);
    const [tamperResult, setTamperResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeAttack, setActiveAttack] = useState(null);

    const runEavesdropAttack = async () => {
        if (eavesdroppingActive) {
            setEavesdroppingActive(false);
            setQber(0);
            setActiveAttack(null);
            return;
        }

        setLoading(true);
        setActiveAttack('eavesdrop');
        setEavesdroppingActive(true);
        try {
            const response = await attackAPI.simulateEavesdropper(2048, 1.0);
            setEavesdropResult(response.data);
            if (typeof response.data?.qber_with_attack === 'number') {
                setQber(response.data.qber_with_attack);
            }
            if (response.data?.detected) {
                setMitmAttempts(mitmAttempts + 1);
                setLastThreatAlert('Eavesdropper detected');
            }
        } catch (error) {
            console.error('Eavesdrop simulation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const runTamperAttack = async (tamperType = 'ciphertext') => {
        setLoading(true);
        setActiveAttack('tamper');
        setTamperingActive(true);
        try {
            const response = await attackAPI.simulateTampering('demo_session', tamperType);
            setTamperResult(response.data);
            if (response.data?.detected) {
                setTamperingDetected(tamperingDetected + 1);
                setLastThreatAlert(`Tampering detected (${tamperType})`);
            }
        } catch (error) {
            console.error('Tamper simulation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30">
                <div className="flex items-start gap-4">
                    <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
                    <div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-900">Attack Simulation Lab</h2>
                        <p className="text-gray-700">
                            Demonstrate security vulnerabilities and how quantum-safe cryptography protects against attacks.
                            All simulations are safe and educational.
                        </p>
                    </div>
                </div>
            </div>

            {/* Attack Controls */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Eavesdropper Attack */}
                <div className="card">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span>Eavesdropper (Man-in-the-Middle)</span>
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Simulate Eve intercepting quantum key distribution. BB84 will detect her presence via elevated QBER.
                    </p>
                    <button
                        onClick={runEavesdropAttack}
                        disabled={loading}
                        className="w-full btn-secondary bg-red-500/20 hover:bg-red-500/30 border-red-500/50"
                    >
                        {loading && activeAttack === 'eavesdrop'
                            ? 'Simulating...'
                            : eavesdroppingActive
                                ? 'Stop Eavesdrop Attack'
                                : 'Run Eavesdrop Attack'}
                    </button>

                    {eavesdropResult && (
                        <div className="mt-4 space-y-3">
                            <div className="glass-dark p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                    <div>
                                        <span className="text-gray-600">QBER without Eve:</span>
                                        <div className="text-2xl font-bold text-green-400">
                                            {(eavesdropResult.qber_without_attack * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">QBER with Eve:</span>
                                        <div className="text-2xl font-bold text-red-400">
                                            {(eavesdropResult.qber_with_attack * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-lg ${eavesdropResult.detected ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                    <p className="text-sm font-medium">
                                        {eavesdropResult.detected ? '🚨 Eavesdropper Detected!' : '✓ No Eavesdropper'}
                                    </p>
                                    <p className="text-xs mt-1 opacity-80">{eavesdropResult.explanation}</p>
                                </div>
                            </div>

                            <div className="glass-dark p-3 rounded-lg">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-gray-900">
                                    <Info className="w-4 h-4" />
                                    <span>Recommendations</span>
                                </h4>
                                <ul className="text-xs space-y-1 text-gray-600">
                                    {eavesdropResult.recommendations?.slice(0, 3).map((rec, idx) => (
                                        <li key={idx}>• {rec}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Tampering Attack */}
                <div className="card">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                        <Shield className="w-5 h-5 text-orange-400" />
                        <span>Data Tampering</span>
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Simulate attacker modifying encrypted data. AES-GCM authentication will detect tampering.
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <button
                            onClick={() => runTamperAttack('ciphertext')}
                            disabled={loading}
                            className="btn-secondary text-sm py-2"
                        >
                            Tamper Ciphertext
                        </button>
                        <button
                            onClick={() => runTamperAttack('nonce')}
                            disabled={loading}
                            className="btn-secondary text-sm py-2"
                        >
                            Tamper Nonce
                        </button>
                        <button
                            onClick={() => runTamperAttack('tag')}
                            disabled={loading}
                            className="btn-secondary text-sm py-2"
                        >
                            Tamper Tag
                        </button>
                    </div>

                    {tamperResult && (
                        <div className="mt-4 space-y-3">
                            <div className="glass-dark p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Tamper Type:</span>
                                    <span className="font-mono text-sm text-gray-900">{tamperResult.tamper_type}</span>
                                </div>
                                <div className={`p-3 rounded-lg ${tamperResult.detected ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                    <p className="text-sm font-medium">
                                        {tamperResult.detected ? '✓ Tampering Detected!' : '✗ Tampering Not Detected'}
                                    </p>
                                    <p className="text-xs mt-1 opacity-80">{tamperResult.explanation}</p>
                                </div>
                            </div>

                            <div className="glass-dark p-3 rounded-lg">
                                <h4 className="font-medium text-sm mb-2 text-gray-900">Technical Details</h4>
                                <div className="text-xs space-y-1 text-gray-600">
                                    <p><strong>Mechanism:</strong> {tamperResult.technical_details?.detection_mechanism}</p>
                                    <p><strong>Property:</strong> {tamperResult.technical_details?.security_property}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
