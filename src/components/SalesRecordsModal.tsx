'use client';

import React from 'react';

interface SalesRecordsModalProps {
    isOpen: boolean;
    onClose: () => void;
    executiveName: string;
    salesData: any[];
}

export default function SalesRecordsModal({ isOpen, onClose, executiveName, salesData }: SalesRecordsModalProps) {
    if (!isOpen) return null;

    const records = salesData.filter(s => (s.ejecutivo || '').trim().toUpperCase() === executiveName);

    const getStatusColor = (status: string) => {
        const s = (status || '').toUpperCase();
        if (['ACTIVADO'].includes(s)) return '#10b981';
        if (['RECHAZADO', 'ERROR DE DATA', 'VENTA CAIDA', 'ANULADO'].includes(s)) return '#f43f5e';
        if (['INGRESADO', 'APROBADO', 'DESPACHO'].includes(s)) return '#8b5cf6';
        if (['PENDIENTE ENVÍO'].includes(s)) return '#0ea5e9';
        if (['PENDIENTE', 'NUEVO INGRESO'].includes(s)) return '#f59e0b';
        return '#3b82f6';
    };

    return (
        <div className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 1300, // Higher than TeamDetailsModal
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                animation: 'fadeIn 0.3s ease'
            }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .close-btn-records {
                    position: absolute; top: 1.5rem; right: 2rem;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    color: white; width: 45px; height: 45px; border-radius: 50%;
                    display: flex; alignItems: center; justifyContent: center;
                    cursor: pointer; transition: all 0.3s ease; z-index: 1310;
                }
                .close-btn-records:hover {
                    background: rgba(239, 68, 68, 0.5); border-color: #ef4444; transform: rotate(90deg);
                }
            `}} />

            <button className="close-btn-records" onClick={onClose} aria-label="Cerrar">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="modal-content" style={{
                width: '100%', maxWidth: '1400px', maxHeight: '90vh',
                overflowY: 'auto', background: '#050505',
                borderRadius: '2rem', padding: '3rem', border: '1px solid rgba(59, 130, 246, 0.2)',
                animation: 'slideUp 0.4s ease forwards',
                position: 'relative'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.9rem' }}>Registros de</span>
                    <h2 style={{ color: 'white', fontSize: '3rem', fontWeight: 950, margin: '0.5rem 0' }}>{executiveName}</h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>RUC</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Razón Social</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Estado</th>
                                <th style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Líneas</th>
                                <th style={{ padding: '1.2rem', textAlign: 'right', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Cargo Fijo</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.length > 0 ? records.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} className="record-row">
                                    <td style={{ padding: '1.2rem', fontSize: '0.9rem' }}>{r.ruc}</td>
                                    <td style={{ padding: '1.2rem', fontSize: '0.95rem', fontWeight: 600 }}>{r.razonSocial}</td>
                                    <td style={{ padding: '1.2rem' }}>
                                        <div style={{
                                            background: `${getStatusColor(r.estado)}22`,
                                            color: getStatusColor(r.estado),
                                            padding: '0.4rem 1rem',
                                            borderRadius: '2rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            display: 'inline-block',
                                            border: `1px solid ${getStatusColor(r.estado)}44`
                                        }}>
                                            {r.estado}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center', fontWeight: 700 }}>{r.lineas}</td>
                                    <td style={{ padding: '1.2rem', textAlign: 'right', color: '#10b981' }}>S/ {Number(r.cargoFijo || 0).toFixed(2)}</td>
                                    <td style={{ padding: '1.2rem', opacity: 0.6, fontSize: '0.8rem' }}>{r.fecha || r.fechaInicio}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>No hay registros para este ejecutivo en el periodo seleccionado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style jsx>{`
                .record-row:hover { background: rgba(255,255,255,0.02); }
            `}</style>
        </div>
    );
}
