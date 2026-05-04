'use client';

import React from 'react';

interface ReportData {
    status: string;
    count: number;
    cfReal: number;
    salesCount: number;
    color: string;
    label: string;
}

interface LineProgressDashboardProps {
    data: ReportData[];
    hideTitle?: boolean;
}

const CATEGORY_STYLES: Record<string, { gradient: string, glow: string }> = {
    'RECHAZADO': {
        gradient: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
        glow: 'rgba(239, 68, 68, 0.4)'
    },
    'NUEVOS INGRESOS': {
        gradient: 'linear-gradient(135deg, #9a3412 0%, #f97316 100%)',
        glow: 'rgba(249, 115, 22, 0.4)'
    },
    'PENDIENTE INGRESOS': {
        gradient: 'linear-gradient(135deg, #92400e 0%, #fb923c 100%)',
        glow: 'rgba(251, 146, 60, 0.4)'
    },
    'DESPACHO': {
        gradient: 'linear-gradient(135deg, #3f6212 0%, #84cc16 100%)',
        glow: 'rgba(132, 204, 22, 0.4)'
    },
    'INGRESADO': {
        gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
        glow: 'rgba(245, 158, 11, 0.4)'
    },
    'OBSERVADO POR ENTEL': {
        gradient: 'linear-gradient(135deg, #a16207 0%, #eab308 100%)',
        glow: 'rgba(234, 179, 8, 0.4)'
    },
    'PROCESO DE ACTIVACION': {
        gradient: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
        glow: 'rgba(34, 197, 94, 0.4)'
    },
    'PENDIENTE ENVÍO': {
        gradient: 'linear-gradient(135deg, #15803d 0%, #4ade80 100%)',
        glow: 'rgba(74, 222, 128, 0.4)'
    },
    'ACTIVADO': {
        gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
        glow: 'rgba(16, 185, 129, 0.4)'
    },
    'ACTIVO': {
        gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
        glow: 'rgba(16, 185, 129, 0.4)'
    },
    'PENDIENTE': {
        gradient: 'linear-gradient(135deg, #3f6212 0%, #84cc16 100%)',
        glow: 'rgba(132, 204, 22, 0.4)'
    }
};

export default function LineProgressDashboard({ data, hideTitle = false }: LineProgressDashboardProps) {
    const statusItems = data.filter(item => item.status !== 'TOTAL GENERAL');
    const totalItem = data.find(item => item.status === 'TOTAL GENERAL');

    return (
        <div className="dashboard-container">
            {!hideTitle && <h2 className="dashboard-title">Avance de Líneas</h2>}

            <div className="cards-grid">
                {statusItems.map((item, index) => {
                    const style = CATEGORY_STYLES[item.status] || {
                        gradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                        glow: 'rgba(31, 41, 55, 0.4)'
                    };

                    return (
                        <div key={index} className="status-column" style={{ '--item-index': index } as any}>
                            {/* Count Box */}
                            <div className="card count-card" style={{ background: style.gradient, '--glow-color': style.glow } as any}>
                                <div className="card-label">LÍNEAS</div>
                                <div className="card-value">{item.count}</div>
                                <div className="card-category">{item.label}</div>
                            </div>

                            {/* CF Box */}
                            <div className="card cf-card" style={{ background: style.gradient, '--glow-color': style.glow } as any}>
                                <div className="card-label">CF GLOBAL (NETO)</div>
                                <div className="card-value">S/.{item.cfReal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                                <div className="card-category">{item.label}</div>
                                <div className="card-glow-overlay" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {totalItem && (
                <div className="total-summary-bar">
                    <div className="total-label-wrapper">
                        <span className="total-main-label">RESUMEN GENERAL</span>
                        <div className="total-divider" />
                    </div>
                    <div className="total-stats-row">
                        <div className="total-stat-box">
                            <span className="ts-label">ARPU (PROM)</span>
                            <span className="ts-value" style={{ color: '#10b981' }}>S/.{totalItem.count > 0 ? (totalItem.cfReal / totalItem.count).toFixed(2) : '0.00'}</span>
                        </div>
                        <div className="total-stat-box">
                            <span className="ts-label">TOTAL VENTAS</span>
                            <span className="ts-value">{totalItem.salesCount}</span>
                        </div>
                        <div className="total-stat-box">
                            <span className="ts-label">TOTAL LÍNEAS</span>
                            <span className="ts-value">{totalItem.count}</span>
                        </div>
                        <div className="total-stat-box">
                            <span className="ts-label">CF GLOBAL NETO</span>
                            <span className="ts-value primary">S/.{totalItem.cfReal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .dashboard-container {
                    padding: 0.5rem 2rem 3rem 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    max-width: 1600px;
                    margin: 0 auto;
                }

                .dashboard-title {
                    color: white;
                    font-size: 2rem;
                    font-weight: 950;
                    text-align: center;
                    letter-spacing: -0.04em;
                    margin-bottom: 2rem;
                    text-transform: uppercase;
                    background: linear-gradient(to bottom, #fff 0%, #a1a1aa 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: 1rem;
                    width: 100%;
                }

                .status-column {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    animation: fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                    opacity: 0;
                    animation-delay: calc(var(--item-index) * 0.1s);
                }

                .card {
                    position: relative;
                    padding: 1.5rem 1rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    overflow: hidden;
                    cursor: default;
                }

                .count-card {
                    border-radius: 1.2rem;
                    min-height: 120px;
                }

                .cf-card {
                    border-radius: 2.2rem;
                    min-height: 140px;
                    box-shadow: 0 15px 30px -10px var(--glow-color);
                }

                .card:hover {
                    transform: translateY(-8px) scale(1.02);
                    border-color: rgba(255, 255, 255, 0.3);
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.7), 0 0 20px var(--glow-color);
                }

                .card-label {
                    font-size: 0.6rem;
                    font-weight: 900;
                    color: rgba(255, 255, 255, 0.6);
                    letter-spacing: 0.15em;
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                }

                .card-value {
                    font-size: 1.6rem;
                    font-weight: 950;
                    color: white;
                    line-height: 1;
                    margin-bottom: 0.75rem;
                    letter-spacing: -0.02em;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                }

                .card-category {
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.9);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                /* Total Summary Bar Styling */
                .total-summary-bar {
                    margin-top: 4rem;
                    width: 100%;
                    background: rgba(10, 10, 11, 0.6);
                    border: 1px solid rgba(79, 70, 229, 0.3);
                    border-radius: 2rem;
                    padding: 2rem 3rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    backdrop-filter: blur(20px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4), inset 0 0 20px rgba(79, 70, 229, 0.1);
                    animation: fadeInUp 1s ease-out forwards;
                }

                .total-label-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                }

                .total-main-label {
                    font-size: 1.2rem;
                    font-weight: 950;
                    color: #fff;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                .total-divider {
                    width: 80px;
                    height: 4px;
                    background: linear-gradient(90deg, #4f46e5, transparent);
                    border-radius: 2px;
                }

                .total-stats-row {
                    display: flex;
                    gap: 5rem;
                }

                .total-stat-box {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: flex-end;
                }

                .ts-label {
                    font-size: 0.7rem;
                    font-weight: 900;
                    color: #71717a;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }

                .ts-value {
                    font-size: 2.2rem;
                    font-weight: 950;
                    color: #fff;
                    line-height: 1;
                }

                .ts-value.primary {
                    color: #4f46e5;
                    text-shadow: 0 0 15px rgba(79, 70, 229, 0.3);
                }

                .card-glow-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
                    pointer-events: none;
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @media (max-width: 1024px) {
                    .dashboard-title { font-size: 2.25rem; }
                    .cards-grid { grid-template-columns: repeat(3, 1fr); }
                    .total-summary-bar { padding: 2rem; }
                    .total-stats-row { gap: 2rem; }
                }

                @media (max-width: 768px) {
                    .cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .dashboard-title { font-size: 1.75rem; }
                    .total-summary-bar { flex-direction: column; gap: 2rem; align-items: flex-start; }
                    .total-stats-row { width: 100%; justify-content: space-between; }
                    .total-stat-box { align-items: flex-start; }
                }

                @media (max-width: 480px) {
                    .cards-grid { grid-template-columns: 1fr; }
                    .total-stats-row { flex-direction: column; gap: 1.5rem; }
                }
            `}</style>
        </div>
    );
}
