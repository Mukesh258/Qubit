import React, { useEffect, useRef } from 'react';
import { Zap, Circle } from 'lucide-react';

export default function QKDVisualizer({ data }) {
    const canvasRef = useRef(null);

    if (!data || !data.transmissions) {
        return (
            <div className="card">
                <h3 className="text-xl font-semibold mb-4">BB84 Photon Transmission</h3>
                <p className="text-gray-400">No transmission data available</p>
            </div>
        );
    }

    const { transmissions, eavesdropper_active } = data;
    const sampleTransmissions = transmissions.slice(0, 20); // Show first 20

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-quantum-400" />
                    <span>BB84 Photon Transmission</span>
                </h3>
                {eavesdropper_active && (
                    <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 animate-qber-alert">
                        <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                        <span className="text-sm font-medium text-red-400">Eavesdropper Active</span>
                    </div>
                )}
            </div>

            {/* Transmission visualization */}
            <div className="space-y-3 mb-6">
                {sampleTransmissions.map((t, idx) => (
                    <div key={idx} className="glass p-3 rounded-lg">
                        <div className="grid grid-cols-6 gap-4 text-sm">
                            <div>
                                <span className="text-gray-400">Photon #{idx + 1}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">Alice Bit:</span>
                                <span className="ml-2 font-mono font-bold text-quantum-400">{t.alice_bit}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">Alice Basis:</span>
                                <span className="ml-2 font-mono text-lg">{t.alice_basis}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">Bob Basis:</span>
                                <span className="ml-2 font-mono text-lg">{t.bob_basis}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">Bob Measured:</span>
                                <span className="ml-2 font-mono font-bold text-pqc-400">{t.bob_measurement}</span>
                            </div>
                            <div>
                                {t.bases_match ? (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                        ✓ Match
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-medium">
                                        ✗ Discard
                                    </span>
                                )}
                            </div>
                        </div>
                        {t.intercepted && (
                            <div className="mt-2 pt-2 border-t border-red-500/30">
                                <span className="text-xs text-red-400">
                                    ⚠️ Intercepted by Eve (Basis: {t.eve_basis})
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-quantum-400 rounded"></div>
                    <span className="text-sm text-gray-400">Rectilinear (+)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pqc-400 rounded"></div>
                    <span className="text-sm text-gray-400">Diagonal (×)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded"></div>
                    <span className="text-sm text-gray-400">Bases Match</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded"></div>
                    <span className="text-sm text-gray-400">Intercepted</span>
                </div>
            </div>

            <div className="mt-4 p-4 glass-dark rounded-lg">
                <p className="text-sm text-gray-300">
                    <strong>How it works:</strong> Alice sends photons encoded in random bases. Bob measures with random bases.
                    They publicly compare bases and keep only matching measurements. If Eve intercepts, she must guess the basis,
                    introducing errors that increase QBER.
                </p>
            </div>
        </div>
    );
}
