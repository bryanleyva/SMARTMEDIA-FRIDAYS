'use client';

import React from 'react';
import ExecutiveRanking from './ExecutiveRanking';

interface TeamDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    supervisorName: string;
    executiveData: any[];
    onSelectExecutive: (name: string) => void;
}

export default function TeamDetailsModal({ isOpen, onClose, supervisorName, executiveData, onSelectExecutive }: TeamDetailsModalProps) {
    if (!isOpen) return null;

    const team = executiveData.filter(e => e.supervisor === supervisorName);

    return (
        <div className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 1100,
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
                .close-btn-premium {
                    position: absolute; top: 1.5rem; right: 2rem;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    color: white; width: 45px; height: 45px; border-radius: 50%;
                    display: flex; alignItems: center; justifyContent: center;
                    cursor: pointer; transition: all 0.3s ease; z-index: 1110;
                }
                .close-btn-premium:hover {
                    background: rgba(239, 68, 68, 0.2); border-color: #ef4444; transform: rotate(90deg);
                }
            `}} />

            <button className="close-btn-premium" onClick={onClose} aria-label="Cerrar">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="modal-content" style={{
                width: '100%', maxWidth: '1200px', maxHeight: '90vh',
                overflowY: 'auto', background: '#0a0a0a',
                borderRadius: '2rem', padding: '3rem', border: '1px solid rgba(16, 185, 129, 0.2)',
                animation: 'slideUp 0.4s ease forwards'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.9rem' }}>Equipo de</span>
                    <h2 style={{ color: 'white', fontSize: '3rem', fontWeight: 950, margin: '0.5rem 0' }}>{supervisorName}</h2>
                    <div style={{ height: '4px', width: '60px', background: '#10b981', margin: '0 auto', borderRadius: '2px' }}></div>
                </div>

                <ExecutiveRanking data={team} showPodium={false} onSelect={onSelectExecutive} hideSalesCount={true} />
            </div>
        </div>
    );
}
