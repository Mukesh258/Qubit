import React from 'react';
import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';

export default function QBERChart({ qber, threshold = 0.11, onSecureClick }) {
    const qberPercent = (qber * 100).toFixed(2);
    const thresholdPercent = (threshold * 100).toFixed(0);
    const isAboveThreshold = qber > threshold;
    const barWidth = Math.min((qber / 0.3) * 100, 100); // Scale to 30% max for visualization

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-quantum-400" />
                    <span>Quantum Bit Error Rate (QBER)</span>
                </h3>
                {isAboveThreshold ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-red-400">Eavesdropper Detected!</span>
                    </div>
                ) : onSecureClick ? (
                    <button
                        type="button"
                        onClick={onSecureClick}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-colors cursor-pointer"
                    >
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-green-400">Secure</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-green-400">Secure</span>
                    </div>
                )}
            </div>

            {/* QBER Value Display */}
            <div className="text-center mb-8">
                <div className={`text-6xl font-bold mb-2 ${isAboveThreshold ? 'text-red-400' : 'text-green-400'}`}>
                    {qberPercent}%
                </div>
                <p className="text-gray-400">Current QBER</p>
            </div>

            {/* Visual Bar */}
            <div className="relative h-12 bg-gray-800 rounded-lg overflow-hidden mb-4">
                {/* Threshold marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10"
                    style={{ left: `${(threshold / 0.3) * 100}%` }}
                >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-yellow-400 whitespace-nowrap">
                        Threshold ({thresholdPercent}%)
                    </div>
                </div>

                {/* QBER bar */}
                <div
                    className={`h-full transition-all duration-1000 ${isAboveThreshold
                            ? 'bg-gradient-to-r from-red-500 to-red-600 animate-qber-alert'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}
                    style={{ width: `${barWidth}%` }}
                />
            </div>

            {/* Scale */}
            <div className="flex justify-between text-xs text-gray-500 mb-6">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
                <span>30%</span>
            </div>

            {/* Explanation */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="glass-dark p-4 rounded-lg">
                    <h4 className="font-medium text-green-400 mb-2">✓ Normal Operation (QBER &lt; 11%)</h4>
                    <p className="text-sm text-gray-300">
                        Low QBER indicates natural quantum noise. No eavesdropping detected.
                        Session can proceed safely with the generated key.
                    </p>
                </div>
                <div className="glass-dark p-4 rounded-lg">
                    <h4 className="font-medium text-red-400 mb-2">⚠️ Eavesdropper Detected (QBER &gt; 11%)</h4>
                    <p className="text-sm text-gray-300">
                        High QBER indicates Eve's interference. Her measurements disturb quantum states,
                        increasing errors. Session must be aborted to prevent key compromise.
                    </p>
                </div>
            </div>

            {/* Technical Details */}
            <div className="mt-4 p-4 bg-gradient-to-r from-quantum-900/20 to-pqc-900/20 rounded-lg border border-white/10">
                <h4 className="font-medium mb-2">📊 QBER Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">Current:</span>
                        <span className="ml-2 font-bold">{qberPercent}%</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Threshold:</span>
                        <span className="ml-2 font-bold">{thresholdPercent}%</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Status:</span>
                        <span className={`ml-2 font-bold ${isAboveThreshold ? 'text-red-400' : 'text-green-400'}`}>
                            {isAboveThreshold ? 'ABORT' : 'SAFE'}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-400">Security:</span>
                        <span className={`ml-2 font-bold ${isAboveThreshold ? 'text-red-400' : 'text-green-400'}`}>
                            {isAboveThreshold ? 'Compromised' : 'Intact'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
