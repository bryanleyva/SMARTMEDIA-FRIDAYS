'use client';

import React from 'react';
import ExecutiveRanking from './ExecutiveRanking';

interface PerformanceDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
}

export default function PerformanceDetailsModal({ isOpen, onClose, data }: PerformanceDetailsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(15px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            animation: 'fadeIn 0.3s ease'
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .modal-content {
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .close-button {
                    position: absolute;
                    top: 1.5rem;
                    right: 2rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    z-index: 1010;
                }
                .close-button:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: #ef4444;
                    transform: rotate(90deg);
                }
            `}} />

            <button className="close-button" onClick={onClose} aria-label="Cerrar">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="modal-content" style={{
                width: '100%',
                maxWidth: '1400px',
                height: '90vh',
                overflowY: 'auto',
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '3rem',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '1rem',
                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.9)'
            }}>
                <div style={{ textAlign: 'center', margin: '3rem 0 1rem 0' }}>
                    <h2 style={{
                        color: 'white',
                        fontSize: '2.5rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.02em',
                        background: 'linear-gradient(to bottom, #fff 0%, #a1a1aa 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontFamily: "'Outfit', sans-serif"
                    }}>
                        Listado Completo de Rendimiento
                    </h2>
                </div>

                <div style={{ padding: '0 1rem' }}>
                    <ExecutiveRanking data={data} showPodium={false} />
                </div>

                <div style={{ height: '3rem' }} /> {/* Spacer */}
            </div>
        </div>
    );
}
