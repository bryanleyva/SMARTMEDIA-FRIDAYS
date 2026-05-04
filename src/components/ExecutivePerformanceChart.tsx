'use client';

import React from 'react';

interface ExecutiveData {
    name: string;
    lineasActivas: number;
    cfTotalNet: number;
    lineasTotales: number;
    ventasTotales: number;
    statusBreakdown: { label: string, count: number, cfReal: number, salesCount: number, color: string }[];
    arpu: number;
}

interface ExecutivePerformanceChartProps {
    data: ExecutiveData[];
    onShowDetail?: () => void;
}

export default function ExecutivePerformanceChart({ data, onShowDetail }: ExecutivePerformanceChartProps) {
    // Sort by lineasTotales descending (0 lines at the last)
    const sortedData = [...data].sort((a, b) => {
        if (b.lineasTotales !== a.lineasTotales) {
            return b.lineasTotales - a.lineasTotales;
        }
        return b.cfTotalNet - a.cfTotalNet; // Secondary sort by CF Net
    });

    // Find max value for scaling columns (based on total lines now)
    const maxLines = Math.max(...sortedData.map(d => d.lineasTotales), 10);
    const chartMax = Math.ceil(maxLines / 5) * 5; // Round up for grid lines

    // Helper to format currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            minimumFractionDigits: 2
        }).format(val).replace('PEN', 'S/.');
    };

    return (
        <div className="performance-chart-container" style={{
            marginTop: '3rem',
            padding: '2rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8)',
            maxWidth: '1200px', // Larger container
            margin: '3rem auto',
            backdropFilter: 'blur(20px)'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes barGrow {
                    from { width: 0; }
                    to { width: var(--final-width); }
                }
                 .performance-bar {
                    height: 24px; /* Slightly taller */
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 6px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    display: flex;
                    overflow: visible;
                    animation: barGrow 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .performance-segment {
                    height: 100%;
                    position: relative;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                .performance-segment:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
                .performance-segment:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
                
                .performance-segment:hover {
                    filter: brightness(1.4) saturate(1.2);
                    z-index: 10;
                    transform: scaleY(1.1);
                }
                .performance-row {
                    padding: 4px 0;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }
                .performance-row:hover {
                    background: rgba(255, 255, 255, 0.03);
                }
                .performance-row:hover .exec-name {
                    color: #fff;
                    transform: translateX(4px);
                }
                .chart-grid-line {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    border-left: 1px dashed rgba(255, 255, 255, 0.05);
                    z-index: 1;
                }
                .performance-tooltip {
                    position: absolute;
                    bottom: 140%;
                    left: 50%;
                    transform: translateX(-50%) translateY(10px);
                    background: rgba(15, 15, 15, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.15);
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    white-space: nowrap;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 100;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                }
                .performance-segment:hover .performance-tooltip {
                    opacity: 1;
                    visibility: visible;
                    transform: translateX(-50%) translateY(0);
                }
                .view-detail-btn {
                    background: linear-gradient(135deg, rgba(192, 132, 252, 0.1), rgba(147, 51, 234, 0.1));
                    border: 1px solid rgba(192, 132, 252, 0.3);
                    color: #c084fc;
                    padding: 0.7rem 1.4rem;
                    border-radius: 1rem;
                    font-size: 0.8rem;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    font-family: 'Outfit', sans-serif;
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                }
                .view-detail-btn:hover {
                    background: rgba(192, 132, 252, 0.2);
                    border-color: #c084fc;
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px rgba(192, 132, 252, 0.25);
                    color: white;
                }
                .exec-name {
                    transition: all 0.3s ease;
                }
            `}} />

            {/* Header section matching image style */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3rem'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    <div style={{
                        background: 'linear-gradient(90deg, #c084fc, #9333ea)',
                        color: 'white',
                        padding: '0.8rem 2.2rem',
                        borderRadius: '1.2rem',
                        display: 'inline-block',
                        boxShadow: '0 10px 30px rgba(147, 51, 234, 0.4)'
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '1rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            fontStyle: 'italic',
                            fontFamily: "'Outfit', sans-serif"
                        }}>
                            RENDIMIENTO POR EJECUTIVO
                        </h3>
                    </div>
                </div>

                {onShowDetail && (
                    <button className="view-detail-btn" onClick={onShowDetail}>
                        VISUALIZAR DETALLE
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                    </button>
                )}
            </div>

            <div style={{ position: 'relative', minHeight: '400px', paddingRight: '120px' }}>
                {/* Grid Headers */}
                <div style={{
                    display: 'flex',
                    marginLeft: '160px',
                    marginBottom: '1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: '0.6rem'
                }}>
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((p) => (
                        <div key={p} style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.4)',
                            textAlign: 'left',
                            fontFamily: "'Outfit', sans-serif"
                        }}>
                            {Math.round(chartMax * p)} LÍNEAS
                        </div>
                    ))}
                </div>

                {/* Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 2, position: 'relative' }}>
                    {sortedData.map((item, idx) => {
                        const widthPct = (item.lineasTotales / chartMax) * 100;
                        const isZero = item.lineasTotales === 0;

                        return (
                            <div key={item.name} className="performance-row" style={{
                                display: 'flex',
                                alignItems: 'center',
                                opacity: isZero ? 0.4 : 1
                            }}>
                                <div className="exec-name" style={{
                                    width: '160px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    color: isZero ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                                    textTransform: 'uppercase',
                                    fontFamily: "'Outfit', sans-serif",
                                    paddingRight: '1.25rem',
                                    textAlign: 'right',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {item.name}
                                </div>
                                <div style={{ flex: 1, position: 'relative', height: '24px' }}>
                                    {!isZero ? (
                                        <div
                                            className="performance-bar"
                                            style={{
                                                '--final-width': `${widthPct}%`,
                                                width: `${widthPct}%`
                                            } as any}
                                        >
                                            {item.statusBreakdown.filter(s => s.count > 0).map((s, sidx) => (
                                                <div
                                                    key={sidx}
                                                    className="performance-segment"
                                                    style={{
                                                        width: `${(s.count / (item.lineasTotales || 1)) * 100}%`,
                                                        backgroundColor: s.color,
                                                        boxShadow: `inset 0 0 15px rgba(0,0,0,0.2)`
                                                    }}
                                                >
                                                    <div className="performance-tooltip">
                                                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: s.color, marginBottom: '4px' }}>{s.label}</div>
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                            <div style={{ color: 'rgba(255,255,255,0.8)' }}>Ventas: <b style={{ color: '#fff' }}>{s.salesCount}</b></div>
                                                            <div style={{ color: 'rgba(255,255,255,0.8)' }}>Líneas: <b style={{ color: '#fff' }}>{s.count}</b></div>
                                                            <div style={{ color: 'rgba(255,255,255,0.8)' }}>CF: <b style={{ color: '#10b981' }}>{formatCurrency(s.cfReal)}</b></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            fontSize: '0.65rem',
                                            color: 'rgba(255,255,255,0.2)',
                                            fontFamily: "'Inter', sans-serif",
                                            fontStyle: 'italic',
                                            lineHeight: '24px'
                                        }}>
                                            SIN LÍNEAS REGISTRADAS
                                        </div>
                                    )}

                                    {!isZero && (
                                        <span style={{
                                            position: 'absolute',
                                            left: `calc(${widthPct}% + 15px)`,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            fontSize: '0.8rem',
                                            fontWeight: 900,
                                            color: '#fff',
                                            fontFamily: "'Outfit', sans-serif",
                                            whiteSpace: 'nowrap',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                        }}>
                                            {item.lineasTotales} <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>L</span> / {item.ventasTotales} <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>V</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Grid Lines in background */}
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '160px',
                    right: '100px',
                    bottom: 0,
                    display: 'flex',
                    zIndex: 0
                }}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="chart-grid-line" style={{ left: `${i * 20}%` }} />
                    ))}
                </div>
            </div>

            <div style={{
                marginTop: '2.5rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: '1.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '3rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: "'Outfit', sans-serif" }}>
                    <div style={{ width: '14px', height: '14px', background: 'linear-gradient(45deg, #10b981, #3b82f6)', borderRadius: '4px' }} />
                    Distribución de Estados por Línea
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                    * Ordenado por Líneas Totales de mayor a menor
                </div>
            </div>
        </div >
    );
}
