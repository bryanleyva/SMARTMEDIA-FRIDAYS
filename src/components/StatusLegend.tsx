'use client';

import React from 'react';

const CATEGORIES = [
    { label: 'RECHAZADO', color: '#ef4444', desc: 'Ventas anuladas, caídas o con errores críticos de data.' },
    { label: 'NUEVOS INGRESOS', color: '#f97316', desc: 'Solicitudes nuevas o pendientes de revisión inicial.' },
    { label: 'PENDIENTE INGRESOS', color: '#fb923c', desc: 'Ventas que requieren ingreso formal al sistema.' },
    { label: 'INGRESADO', color: '#f59e0b', desc: 'Ventas correctamente ingresadas al sistema del operador.' },
    { label: 'OBSERVADO POR ENTEL', color: '#eab308', desc: 'Ventas con errores de datos o en evaluación por el operador.' },
    { label: 'DESPACHO', color: '#84cc16', desc: 'Ventas aprobadas que están siendo preparadas para envío.' },
    { label: 'PENDIENTE ENVÍO', color: '#4ade80', desc: 'Ventas en espera de ser enviadas a su destino.' },
    { label: 'PROCESO DE ACTIVACION', color: '#22c55e', desc: 'Ventas en etapa final, esperando activación (Fluxo, En Despacho).' },
    { label: 'ACTIVADO', color: '#10b981', desc: 'Ventas finalizadas con éxito y activadas.' },
];

export default function StatusLegend() {
    return (
        <div className="status-legend" style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            borderRadius: '2rem',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginTop: '3rem',
            marginBottom: '4rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
            <h3 style={{
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 900,
                marginBottom: '1.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textAlign: 'center',
                opacity: 0.8
            }}>
                Leyenda de Estados
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {CATEGORIES.map((cat, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '1rem',
                        border: `1px solid ${cat.color}22`
                    }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: cat.color,
                            boxShadow: `0 0 10px ${cat.color}`,
                            marginTop: '0.4rem',
                            flexShrink: 0
                        }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{
                                color: 'white',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase'
                            }}>
                                {cat.label}
                            </span>
                            <p style={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.75rem',
                                margin: 0,
                                lineHeight: '1.4'
                            }}>
                                {cat.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
