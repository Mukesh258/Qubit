import React from 'react';

/**
 * QBER Meter - Animated gauge for Quantum Bit Error Rate
 */
const QBERMeter = ({ value, threshold = 0.11 }) => {
    const percentage = (value * 100).toFixed(1);
    const normalizedValue = Math.min(value / (threshold * 2), 1);

    // Color based on value vs threshold
    let color = '#00f2ff'; // Cyan (Safe)
    if (value > threshold) color = '#ff0055'; // Pink/Red (Danger)
    else if (value > threshold * 0.7) color = '#ffcc00'; // Yellow (Warning)

    // Circular gauge calculation
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalizedValue * circumference);

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-32 h-32">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="rgba(0, 0, 0, 0.08)"
                        strokeWidth="8"
                        fill="transparent"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke={color}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        style={{
                            strokeDashoffset: offset,
                            transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s ease'
                        }}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </svg>

                {/* Value Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold font-mono" style={{ color }}>
                        {percentage}%
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">QBER</span>
                </div>
            </div>

            {/* Label */}
            <div className="mt-2 text-xs font-mono uppercase tracking-widest text-gray-600">
                {value > threshold ? '🚨 Intrusion Detected' : '✅ Channel Secured'}
            </div>
        </div>
    );
};

export default QBERMeter;
