'use client';

import React from 'react';

interface GoalProgressGaugeProps {
    current: number;
    goal: number;
}

export default function GoalProgressGauge({ current, goal }: GoalProgressGaugeProps) {
    const percentage = Math.min((current / goal) * 100, 100);
    const radius = 80;
    const circumference = Math.PI * radius; // Semi-circle circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const formatNumber = (val: number) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="goal-gauge-container" style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)',
            borderRadius: '1rem',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            width: '100%',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes gaugeFill {
                    from { stroke-dashoffset: ${circumference}; }
                    to { stroke-dashoffset: ${strokeDashoffset}; }
                }
                .gauge-path {
                    stroke: rgba(255, 255, 255, 0.05);
                }
                .gauge-fill {
                    stroke: #8b5cf6;
                    stroke-dasharray: ${circumference};
                    stroke-dashoffset: ${circumference};
                    animation: gaugeFill 2s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.5s;
                    filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.5));
                }
            `}} />

            <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#c084fc',
                padding: '0.3rem 0.8rem',
                borderRadius: '0.6rem',
                fontSize: '0.6rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'inline-block',
                marginBottom: '0.5rem',
                fontFamily: "'Outfit', sans-serif"
            }}>
                AVANCE META
            </div>

            <div style={{ position: 'relative', width: '180px', margin: '0 auto' }}>
                <svg width="180" height="100" viewBox="0 0 200 120">
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                    </defs>
                    {/* Background Semi-circle */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        strokeWidth="15"
                        strokeLinecap="round"
                        className="gauge-path"
                    />
                    {/* Progress Semi-circle */}
                    <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="15"
                        strokeLinecap="round"
                        className="gauge-fill"
                    />
                </svg>

                <div style={{
                    position: 'absolute',
                    top: '55px',
                    left: 0,
                    right: 0,
                    textAlign: 'center'
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        % AVANCE META
                    </div>
                    <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                        {percentage.toFixed(2)}%
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '-10px',
                    padding: '0 5px'
                }}>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 700 }}>{formatNumber(current)} LÍNEAS</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 700 }}>META: {formatNumber(goal)}</div>
                </div>
            </div>
        </div>
    );
}
