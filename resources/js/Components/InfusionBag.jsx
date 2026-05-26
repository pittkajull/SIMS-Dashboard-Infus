import { useEffect, useRef } from 'react';

export default function InfusionBag({ percentage = 100, size = 120 }) {
    const liquidRef = useRef(null);
    const bubblesRef = useRef(null);
    const currentPercRef = useRef(percentage);

    useEffect(() => {
        let animId;
        const animate = () => {
            const diff = percentage - currentPercRef.current;
            if (Math.abs(diff) > 0.1) {
                currentPercRef.current += diff * 0.03;
            } else {
                currentPercRef.current = percentage;
            }

            if (liquidRef.current) {
                const p = Math.max(0, Math.min(100, currentPercRef.current));
                // Bag area: y=22 (top) to y=140 (bottom) = 118px total
                const maxHeight = 118;
                const bottomY = 140;
                const liquidHeight = (p / 100) * maxHeight;
                const liquidY = bottomY - liquidHeight;
                liquidRef.current.setAttribute('height', liquidHeight);
                liquidRef.current.setAttribute('y', liquidY);
            }

            if (currentPercRef.current !== percentage) {
                animId = requestAnimationFrame(animate);
            }
        };
        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [percentage]);

    // Warna berdasarkan persentase: hijau > 50%, kuning 25-50%, merah < 25%
    const getColors = (p) => {
        if (p > 50) return { main: '#10b981', light: '#6ee7b7' };
        if (p > 25) return { main: '#eab308', light: '#fde047' };
        return { main: '#f43f5e', light: '#fda4af' };
    };

    const colors = getColors(percentage);
    const liquidColor = colors.main;
    const liquidColorLight = colors.light;
    const isWarning = percentage <= 50;

    return (
        <svg width={size} height={size * 1.3} viewBox="0 0 120 156" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Hanging hook */}
            <rect x="52" y="2" width="16" height="6" rx="3" fill="#94a3b8" />
            <rect x="57" y="6" width="6" height="10" rx="1" fill="#94a3b8" />

            {/* Bag body outline */}
            <path d="M30 20 H90 Q92 20 92 22 V120 Q92 140 72 145 H48 Q28 140 28 120 V22 Q28 20 30 20 Z"
                  fill="white" stroke="#cbd5e1" strokeWidth="2.5" />

            {/* Liquid fill */}
            <defs>
                <clipPath id={`bagClip-${size}`}>
                    <path d="M30 20 H90 Q92 20 92 22 V120 Q92 140 72 145 H48 Q28 140 28 120 V22 Q28 20 30 20 Z" />
                </clipPath>
                <linearGradient id={`liquidGrad-${size}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={liquidColorLight} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={liquidColor} stopOpacity="0.95" />
                </linearGradient>
            </defs>

            <g clipPath={`url(#bagClip-${size})`}>
                {/* Main liquid body */}
                <rect ref={liquidRef} x="28" y="22" width="64" height="118"
                      fill={`url(#liquidGrad-${size})`} />

                {/* Wave surface */}
                <path d="M28 22 Q40 18 50 22 Q60 26 70 22 Q80 18 92 22 V25 Q80 21 70 25 Q60 29 50 25 Q40 21 28 25 Z"
                      fill={liquidColorLight} opacity="0.6">
                    <animate attributeName="d"
                        values="M28 22 Q40 18 50 22 Q60 26 70 22 Q80 18 92 22 V25 Q80 21 70 25 Q60 29 50 25 Q40 21 28 25 Z;
                                M28 22 Q40 26 50 22 Q60 18 70 22 Q80 26 92 22 V25 Q80 29 70 25 Q60 21 50 25 Q40 29 28 25 Z;
                                M28 22 Q40 18 50 22 Q60 26 70 22 Q80 18 92 22 V25 Q80 21 70 25 Q60 29 50 25 Q40 21 28 25 Z"
                        dur="3s" repeatCount="indefinite" />
                </path>

                {/* Floating bubbles */}
                <circle cx="45" cy="90" r="2.5" fill="white" opacity="0.4">
                    <animate attributeName="cy" values="120;40;120" dur="4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="65" cy="80" r="2" fill="white" opacity="0.3">
                    <animate attributeName="cy" values="110;35;110" dur="5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.05;0.3" dur="5s" repeatCount="indefinite" />
                </circle>
                <circle cx="55" cy="70" r="1.5" fill="white" opacity="0.35">
                    <animate attributeName="cy" values="100;32;100" dur="3.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0.1;0.35" dur="3.5s" repeatCount="indefinite" />
                </circle>
            </g>

            {/* Drip tube at bottom */}
            <rect x="56" y="143" width="8" height="8" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="60" y1="151" x2="60" y2="156" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

            {/* Graduation marks */}
            <line x1="90" y1="45" x2="93" y2="45" stroke="#94a3b8" strokeWidth="1" />
            <line x1="90" y1="70" x2="93" y2="70" stroke="#94a3b8" strokeWidth="1" />
            <line x1="90" y1="95" x2="93" y2="95" stroke="#94a3b8" strokeWidth="1" />
            <line x1="90" y1="120" x2="93" y2="120" stroke="#94a3b8" strokeWidth="1" />

            {/* Percentage text */}
            <text x="60" y="88" textAnchor="middle" fontSize="18" fontWeight="900"
                  fill="#fff" fontFamily="Plus Jakarta Sans, sans-serif"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {Math.round(percentage)}%
            </text>

            {/* Shine effect on bag */}
            <path d="M35 30 Q36 65 35 100" stroke="white" strokeWidth="2" opacity="0.3" strokeLinecap="round" />

            {/* Warning pulse glow */}
            {isWarning && (
                <rect x="26" y="18" width="68" height="130" rx="14" fill="none"
                      stroke="#f43f5e" strokeWidth="2" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite" />
                </rect>
            )}
        </svg>
    );
}
