import React from 'react';

/**
 * Quantum Status Panel - Visual status of the QKD channel
 */
const QuantumStatusPanel = ({ status, protocol = "BB84/B92" }) => {
    const statusConfig = {
        idle: { color: '#00f2ff', label: 'Ready', icon: '🔒' },
        active: { color: '#00f2ff', label: 'Quantum-Secure', icon: '🛡️', animate: true },
        processing: { color: '#ffcc00', label: 'Processing', icon: '⚙️', animate: true },
        error: { color: '#ff0055', label: 'Intrusion Detected', icon: '⚠️' }
    };

    const current = statusConfig[status] || statusConfig.idle;

    return (
        <div className="glass mb-4 p-4 flex items-center justify-between rounded-xl border-l-4" style={{ borderColor: current.color }}>
            <div className="flex items-center gap-4">
                <div className={`text-2xl ${current.animate ? 'animate-pulse' : ''}`}>
                    {current.icon}
                </div>
                <div>
                    <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500">Security Protocol</h4>
                    <p className="font-bold text-sm text-gray-900">{protocol} + Kyber-768</p>
                </div>
            </div>

            <div className="text-right">
                <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500">Channel Status</h4>
                <div className="flex items-center gap-2 justify-end">
                    <div className={`w-2 h-2 rounded-full ${current.animate ? 'animate-ping' : ''}`} style={{ backgroundColor: current.color }} />
                    <p className="font-bold text-sm" style={{ color: current.color }}>{current.label}</p>
                </div>
            </div>
        </div>
    );
};

export default QuantumStatusPanel;
