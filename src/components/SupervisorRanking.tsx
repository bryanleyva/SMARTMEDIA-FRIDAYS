'use client';

import React from 'react';

interface SupervisorData {
    name: string;
    lineasActivas: number;
    cfTotalNet: number;
    lineasTotales: number;
    statusBreakdown: { label: string, count: number, color: string }[];
    arpu: number;
}

interface SupervisorRankingProps {
    data: SupervisorData[];
    onSelect?: (name: string) => void;
    currentUserName?: string;
    isSpecial?: boolean;
}

export default function SupervisorRanking({ data, onSelect, currentUserName, isSpecial }: SupervisorRankingProps) {
    // Already sorted in page.tsx by lineasTotales DESC
    const sortedData = data;

    const canClickRow = (name: string) => {
        if (!onSelect) return false;
        if (!isSpecial) return true; // ADMIN or other allowed but not special
        return name.trim().toUpperCase() === currentUserName?.trim().toUpperCase();
    };

    return (
        <div className="ranking-container" style={{ padding: '0 1rem', color: 'white' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                .ranking-row:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                    transform: translateX(10px);
                }
                .ranking-row {
                    transition: all 0.3s ease;
                }
            `}} />

            <div className="glass-panel" style={{
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1.5rem',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 80px -20px rgba(0,0,0,0.8)',
                maxWidth: '1100px',
                margin: '0 auto'
            }}>
                <div style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(255,255,255,0.03)'
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontFamily: "'Outfit', sans-serif",
                        color: '#10b981'
                    }}>
                        Ranking de Supervisores
                    </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>Pos</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>Supervisor</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>Líneas / Estados</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>CF Total (Net)</th>
                                <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>Líneas Totales</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((item, index) => {
                                const isClickable = canClickRow(item.name);
                                return (
                                    <tr key={item.name}
                                        className="ranking-row"
                                        onClick={() => isClickable && onSelect?.(item.name)}
                                        style={{
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                            background: 'transparent',
                                            cursor: isClickable ? 'pointer' : 'default',
                                            opacity: isSpecial && !isClickable ? 0.7 : 1
                                        }}
                                    >
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: index === 0 ? '#fbbf2433' : index === 1 ? '#94a3b833' : index === 2 ? '#92400e33' : 'rgba(255,255,255,0.05)',
                                                color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#fff',
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                border: index === 0 ? '1px solid #fbbf2444' : index === 1 ? '1px solid #94a3b844' : index === 2 ? '1px solid #92400e44' : '1px solid transparent'
                                            }}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td style={{
                                            padding: '0.75rem 1rem',
                                            fontWeight: 700,
                                            fontFamily: "'Outfit', sans-serif",
                                            fontSize: '0.95rem',
                                            color: '#fff'
                                        }}>
                                            {item.name}
                                        </td>
                                        <td style={{
                                            padding: '0.75rem 1rem',
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '0.9rem',
                                            color: '#fff',
                                            minWidth: '200px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Distribución por Estados</span>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Act: {item.lineasActivas}</span>
                                            </div>
                                            <div style={{
                                                width: '100%',
                                                height: '6px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '3px',
                                                display: 'flex',
                                                overflow: 'hidden'
                                            }}>
                                                {item.statusBreakdown.map((s, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            width: `${(s.count / (item.lineasTotales || 1)) * 100}%`,
                                                            height: '100%',
                                                            backgroundColor: s.color
                                                        }}
                                                        title={`${s.label}: ${s.count}`}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{
                                            padding: '0.75rem 1rem',
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                            color: item.cfTotalNet === 0 ? '#71717a' : '#10b981',
                                            fontFamily: "'Inter', sans-serif"
                                        }}>S/ {item.cfTotalNet.toFixed(2)}</td>
                                        <td style={{
                                            padding: '0.75rem 1rem',
                                            fontWeight: 800,
                                            fontSize: '1.1rem',
                                            fontFamily: "'Outfit', sans-serif",
                                            color: '#fff',
                                            textAlign: 'center'
                                        }}>{item.lineasTotales}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
