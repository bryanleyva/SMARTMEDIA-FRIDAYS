'use client';

import React from 'react';

interface ExecutiveData {
    name: string;
    lineasActivas: number;
    cfTotalNet: number;
    lineasTotales: number;
    ventasActivas: number;
    ventasTotales: number;
    statusBreakdown: { label: string, count: number, cfReal: number, salesCount: number, color: string }[];
    arpu: number;
}

interface ExecutiveRankingProps {
    data: ExecutiveData[];
    showPodium?: boolean;
    showTable?: boolean;
    onSelect?: (name: string) => void;
    hideSalesCount?: boolean;
}

export default function ExecutiveRanking({ data, showPodium = true, showTable = true, onSelect, hideSalesCount = false }: ExecutiveRankingProps) {
    // Sort data by cfTotalNet descending
    const sortedData = [...data].sort((a, b) => b.cfTotalNet - a.cfTotalNet);

    const first = sortedData[0];
    const second = sortedData[1];
    const third = sortedData[2];

    const PodiumBar = ({ item, rank, color, height, delay }: { item: ExecutiveData | undefined, rank: number, color: string, height: string, delay: string }) => {
        if (!item) return <div style={{ flex: 1 }}></div>;

        const isFirst = rank === 1;

        return (
            <div className="podium-column" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                padding: '0 10px',
                animation: `podiumRise 1s cubic-bezier(0.16, 1, 0.3, 1) forwards ${delay}`
            }}>
                <div className="podium-bar" style={{
                    width: '100%',
                    height: height,
                    background: `linear-gradient(135deg, ${color}, ${color}44)`,
                    borderRadius: '2rem 2rem 0.5rem 0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    position: 'relative',
                    boxShadow: `0 20px 40px -10px ${color}88, inset 0 2px 10px rgba(255,255,255,0.2)`,
                    border: `1px solid ${color}88`,
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'default'
                }}>
                    {/* Rank Number with Glow */}
                    <div style={{
                        fontSize: isFirst ? '3.5rem' : '2.5rem',
                        fontWeight: 900,
                        color: 'white',
                        lineHeight: 1,
                        textShadow: `0 0 20px ${color}, 0 0 40px ${color}44`,
                        marginBottom: '0.5rem',
                        fontFamily: "'Outfit', sans-serif"
                    }}>
                        {rank}°
                    </div>

                    {/* Executive Name with specific style */}
                    <div style={{
                        fontSize: isFirst ? '1.1rem' : '0.95rem',
                        fontWeight: 800,
                        color: 'white',
                        textAlign: 'center',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        marginBottom: '0.75rem',
                        fontFamily: "'Outfit', sans-serif"
                    }}>
                        {item.name}
                    </div>

                    {/* Stats Grid */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '0.75rem',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '12px',
                        borderRadius: '0.75rem',
                        width: '100%',
                        fontFamily: "'Inter', sans-serif"
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ opacity: 0.7 }}>{hideSalesCount ? 'Líneas Totales:' : 'Gestiones:'}</span>
                            <strong style={{ color: '#fff', fontSize: '0.85rem' }}>
                                {hideSalesCount ? (
                                    item.lineasTotales
                                ) : (
                                    <>{item.ventasTotales} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>(V)</span> / {item.lineasTotales} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>(L)</span></>
                                )}
                            </strong>
                        </div>

                        {/* Shaded Status Breakdown Bar */}
                        <div style={{
                            width: '100%',
                            height: '6px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '3px',
                            display: 'flex',
                            overflow: 'hidden',
                            marginTop: '2px'
                        }}>
                            {item.statusBreakdown.map((s, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: `${(s.count / item.lineasTotales) * 100}%`,
                                        height: '100%',
                                        backgroundColor: s.color,
                                        transition: 'width 0.5s ease'
                                    }}
                                    title={`${s.label}: ${hideSalesCount ? s.count : `${s.salesCount}V / ${s.count}L`}`}
                                />
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ opacity: 0.7 }}>CF Net:</span>
                            <strong style={{ color: '#10b981' }}>S/ {item.cfTotalNet.toFixed(2)}</strong>
                        </div>
                    </div>

                    {/* Decorative Crown for 1st place */}
                    {isFirst && (
                        <div style={{
                            position: 'absolute',
                            top: '-50px',
                            fontSize: '2.5rem',
                            animation: 'float 3s ease-in-out infinite'
                        }}>
                            👑
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="ranking-container" style={{ padding: '0 1rem', color: 'white' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes podiumRise {
                    from { opacity: 0; transform: translateY(100px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(-5deg); filter: drop-shadow(0 0 10px #fbbf24); }
                    50% { transform: translateY(-15px) rotate(5deg); filter: drop-shadow(0 15px 20px #fbbf24); }
                }
                .podium-bar:hover {
                    transform: scale(1.03) translateY(-10px);
                    filter: brightness(1.15);
                    z-index: 10;
                }
                .ranking-row:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                    transform: translateX(10px);
                }
                .ranking-row {
                    transition: all 0.3s ease;
                }
            `}} />

            {showPodium && (
                <div style={{
                    height: '350px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    marginBottom: '2.5rem',
                    gap: '10px',
                    maxWidth: '800px',
                    margin: '0 auto 2.5rem auto'
                }}>
                    <PodiumBar item={second} rank={2} color="#0891b2" height="75%" delay="0.2s" />
                    <PodiumBar item={first} rank={1} color="#8b5cf6" height="100%" delay="0s" />
                    <PodiumBar item={third} rank={3} color="#10b981" height="60%" delay="0.4s" />
                </div>
            )}

            {showTable && (
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
                            fontFamily: "'Outfit', sans-serif"
                        }}>
                            Listado Completo de Rendimiento
                        </h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                                    <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>Pos</th>
                                    <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>Ejecutivo</th>
                                    <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>{hideSalesCount ? 'Líneas' : 'Líneas / Estados'}</th>
                                    <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>CF Total (Net)</th>
                                    <th style={{ padding: '1rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>ARPU</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((item, index) => (
                                    <tr key={item.name}
                                        className="ranking-row"
                                        onClick={() => onSelect?.(item.name)}
                                        style={{
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                            background: index < 3 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                                            cursor: onSelect ? 'pointer' : 'default'
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
                                            color: item.lineasTotales === 0 ? '#ef4444' : '#fff'
                                        }}>
                                            {item.name}
                                            {item.lineasTotales === 0 && <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', opacity: 0.7 }}>(SIN GESTIONES)</span>}
                                        </td>
                                        <td style={{
                                            padding: '0.75rem 1rem',
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '0.9rem',
                                            color: item.lineasTotales === 0 ? '#ef4444' : '#fff',
                                            minWidth: '150px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                {hideSalesCount ? (
                                                    <span>{item.lineasTotales}</span>
                                                ) : (
                                                    <span>{item.ventasTotales} <span style={{ opacity: 0.5 }}>V</span> / {item.lineasTotales} <span style={{ opacity: 0.5 }}>L</span></span>
                                                )}
                                                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Act: {hideSalesCount ? item.lineasActivas : `${item.ventasActivas}V / ${item.lineasActivas}L`}</span>
                                            </div>
                                            <div style={{
                                                width: '100%',
                                                height: '4px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '2px',
                                                display: 'flex',
                                                overflow: 'hidden',
                                                marginBottom: '6px'
                                            }}>
                                                {item.statusBreakdown.map((s, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            width: `${(s.count / (item.lineasTotales || 1)) * 100}%`,
                                                            height: '100%',
                                                            backgroundColor: s.color
                                                        }}
                                                        title={`${s.label}: ${hideSalesCount ? s.count : `${s.salesCount}V / ${s.count}L`}`}
                                                    />
                                                ))}
                                            </div>
                                            {!hideSalesCount && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                                    {item.statusBreakdown.filter(s => s.salesCount > 0).map((s, idx) => (
                                                        <div key={idx} style={{
                                                            fontSize: '0.65rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px',
                                                            background: `${s.color}22`,
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${s.color}44`,
                                                            color: s.color,
                                                            fontWeight: 900
                                                        }}>
                                                            <span>{s.salesCount}</span>
                                                            <span style={{ opacity: 0.6, fontSize: '0.55rem' }}>{s.label.substring(0, 3)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
                                            opacity: 0.8,
                                            fontSize: '0.9rem',
                                            fontFamily: "'Inter', sans-serif",
                                            color: item.cfTotalNet === 0 ? '#71717a' : '#fff'
                                        }}>S/ {item.arpu.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
