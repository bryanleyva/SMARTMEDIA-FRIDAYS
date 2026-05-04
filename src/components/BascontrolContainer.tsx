'use client';

import { useState } from 'react';
import LeadManager from "@/components/LeadManager";
import AdminTracking from "@/components/AdminTracking";
import AssignmentPanel from "@/components/AssignmentPanel";
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    userEmail: string;
    userName: string;
    userRole: string;
    userCargo?: string;
    userSupervisor?: string;
}

export default function BascontrolContainer({ userEmail, userName, userRole, userCargo, userSupervisor }: Props) {
    const [viewMode, setViewMode] = useState<'manage' | 'track' | 'assign'>(userRole === 'ADMIN' ? 'track' : 'manage');
    const [selectedBase, setSelectedBase] = useState<'RYDERS' | 'ESPECIAL' | null>(null);

    const handleViewChange = async (newMode: 'manage' | 'track' | 'assign') => {
        if (newMode === 'manage' && userRole === 'ADMIN') {
            const result = await AppSwal.fire({
                title: '⚠️ ACCESO RESTRINGIDO',
                text: 'En la sección de GESTIONAR se solicita carga de base de datos activa. ¿Deseas continuar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'SÍ, CONTINUAR',
                cancelButtonText: 'CANCELAR',
                reverseButtons: true
            });

            if (!result.isConfirmed) return;
        }

        if (newMode === 'manage') setSelectedBase(null);
        setViewMode(newMode);
    };

    const handleBaseSelection = (base: 'RYDERS' | 'ESPECIAL') => {
        if (base === 'ESPECIAL') {
            AppSwal.fire({
                title: 'PRÓXIMAMENTE',
                text: 'Esta base de datos estará disponible próximamente.',
                icon: 'info',
                confirmButtonColor: '#10b981'
            });
            return;
        }
        setSelectedBase(base);
    };

    return (
        <div className="w-full py-2 animate-in fade-in duration-500" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {/* HEADER SECTION - Glassmorphism style */}
            <div
                className="flex justify-between items-center mb-10 pl-6 bg-zinc-900/40 py-5 rounded-2xl pr-8 shadow-2xl border border-zinc-800/50"
                style={{
                    backdropFilter: 'blur(15px)',
                    WebkitBackdropFilter: 'blur(15px)',
                    borderLeft: '5px solid #10b981'
                }}
            >
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase" style={{ fontSize: '2.2rem', letterSpacing: '-0.03em' }}>
                        {viewMode === 'assign' ? 'Panel de Asignación' : selectedBase === 'RYDERS' ? 'Gestión: Base Ryders' : 'Centro de Leads'}
                    </h2>
                    {userCargo && (
                        <div style={{ marginTop: '0.4rem' }}>
                            <p style={{
                                fontSize: '10px',
                                color: '#a1a1aa',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.25em',
                                opacity: 0.8
                            }}>
                                {userRole} <span style={{ color: '#10b981', margin: '0 0.6rem' }}>●</span> {userCargo}
                                {userSupervisor ? <><span style={{ color: '#10b981', margin: '0 0.6rem' }}>●</span> <span style={{ color: '#71717a' }}>Supervisor:</span> {userSupervisor}</> : ''}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    {selectedBase && viewMode === 'manage' && (
                        <button
                            onClick={() => setSelectedBase(null)}
                            style={{
                                background: 'rgba(39, 39, 42, 0.6)',
                                color: '#fff',
                                padding: '0.9rem 1.6rem',
                                borderRadius: '14px',
                                fontSize: '11px',
                                fontWeight: '900',
                                border: '1px solid rgba(63, 63, 70, 0.5)',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                boxShadow: '0 10px 15px -5px rgba(0,0,0,0.3)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(63, 63, 70, 0.8)';
                                e.currentTarget.style.transform = 'translateX(-4px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(39, 39, 42, 0.6)';
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>←</span> CAMBIAR BASE
                        </button>
                    )}

                    {(userRole === 'ADMIN' || userRole === 'SPECIAL') && (
                        <div className="btn-toggle-container shadow-2xl" style={{
                            background: '#09090b',
                            border: '1px solid #27272a',
                            padding: '0.4rem',
                            borderRadius: '16px',
                            display: 'flex',
                            gap: '4px'
                        }}>
                            <button
                                onClick={() => handleViewChange('manage')}
                                className={`btn-toggle ${viewMode === 'manage' ? 'active-manage' : 'inactive'}`}
                                style={{ borderRadius: '12px' }}
                            >
                                GESTIONAR
                            </button>
                            <button
                                onClick={() => handleViewChange('assign')}
                                className={`btn-toggle ${viewMode === 'assign' ? 'active-track' : 'inactive'}`} // Reusing track color (emerald)
                                style={{ borderRadius: '12px' }}
                            >
                                ASIGNACIÓN
                            </button>
                            <button
                                onClick={() => handleViewChange('track')}
                                className={`btn-toggle ${viewMode === 'track' ? 'active-track' : 'inactive'}`}
                                style={{ borderRadius: '12px' }}
                            >
                                SEGUIMIENTO
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="w-full">
                {viewMode === 'manage' ? (
                    selectedBase === 'RYDERS' ? (
                        <LeadManager
                            userEmail={userEmail}
                            userName={userName}
                            userRole={userRole}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-700">
                            {/* ... same selection UI ... */}
                            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                                <h3 style={{
                                    fontSize: '3rem',
                                    fontWeight: '950',
                                    color: 'white',
                                    letterSpacing: '-0.04em',
                                    marginBottom: '0.5rem',
                                    filter: 'drop-shadow(0 0 20px rgba(16,185,129,0.3))'
                                }}>
                                    Seleccione su Destino
                                </h3>
                                <p style={{ color: '#71717a', fontSize: '1.1rem', fontWeight: '500' }}>
                                    Elija la base de datos para comenzar su gestión diaria
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-10">
                                {/* Card 1: BASE RYDERS */}
                                <div
                                    onClick={() => handleBaseSelection('RYDERS')}
                                    style={{
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        borderRadius: '32px',
                                        background: 'linear-gradient(165deg, #18181b 0%, #09090b 100%)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        padding: '3.5rem',
                                        width: '420px',
                                        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center'
                                    }}
                                    className="group-card-premium"
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-15px) scale(1.02)';
                                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.8)';
                                        e.currentTarget.style.boxShadow = '0 30px 60px -15px rgba(16, 185, 129, 0.25)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                        e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0,0,0,0.5)';
                                    }}
                                >
                                    {/* Icon Container */}
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        borderRadius: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '2.5rem',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        fontSize: '3.5rem',
                                        boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.1)'
                                    }}>
                                        🚀
                                    </div>

                                    <h4 style={{
                                        fontSize: '2.4rem',
                                        fontWeight: '900',
                                        color: 'white',
                                        marginBottom: '1rem',
                                        letterSpacing: '-0.02em'
                                    }}>BASE RYDERS</h4>
                                    <p style={{ color: '#a1a1aa', fontSize: '1rem', lineHeight: '1.6', maxWidth: '80%' }}>
                                        Acceso completo a la base de datos principal para gestión de leads activos.
                                    </p>

                                    <div style={{
                                        marginTop: '3.5rem',
                                        background: '#10b981',
                                        color: '#000',
                                        padding: '1rem 2.5rem',
                                        borderRadius: '16px',
                                        fontWeight: '900',
                                        fontSize: '0.9rem',
                                        letterSpacing: '0.1em',
                                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                                        transition: 'all 0.3s'
                                    }}>
                                        ACCEDER AHORA →
                                    </div>

                                    {/* Decoration */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '-20px',
                                        right: '-20px',
                                        width: '100px',
                                        height: '100px',
                                        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
                                        filter: 'blur(10px)'
                                    }}></div>
                                </div>

                                {/* Card 2: BASE ESPECIAL */}
                                <div
                                    onClick={() => handleBaseSelection('ESPECIAL')}
                                    style={{
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        borderRadius: '32px',
                                        background: 'rgba(24, 24, 27, 0.4)',
                                        border: '1px solid #27272a',
                                        padding: '3.5rem',
                                        width: '420px',
                                        transition: 'all 0.4s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        opacity: '0.7'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-8px)';
                                        e.currentTarget.style.background = 'rgba(24, 24, 27, 0.6)';
                                        e.currentTarget.style.opacity = '1';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.background = 'rgba(24, 24, 27, 0.4)';
                                        e.currentTarget.style.opacity = '0.7';
                                    }}
                                >
                                    {/* Locked Icon */}
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        background: 'rgba(63, 63, 70, 0.2)',
                                        borderRadius: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '2.5rem',
                                        border: '1px solid rgba(63, 63, 70, 0.3)',
                                        fontSize: '3.5rem'
                                    }}>
                                        🔒
                                    </div>

                                    <h4 style={{
                                        fontSize: '2.4rem',
                                        fontWeight: '900',
                                        color: '#52525b',
                                        marginBottom: '1rem'
                                    }}>BASE ESPECIAL</h4>
                                    <p style={{ color: '#52525b', fontSize: '1rem', lineHeight: '1.6', maxWidth: '80%' }}>
                                        Base de datos segmentada para campañas especiales de alto impacto.
                                    </p>

                                    <div style={{
                                        marginTop: '3.5rem',
                                        background: 'rgba(39, 39, 42, 0.8)',
                                        color: '#71717a',
                                        padding: '1rem 2.5rem',
                                        borderRadius: '16px',
                                        fontWeight: '900',
                                        fontSize: '0.9rem',
                                        letterSpacing: '0.2em',
                                        border: '1px solid rgba(63, 63, 70, 0.5)'
                                    }}>
                                        PRÓXIMAMENTE
                                    </div>

                                    {/* Grayscale overlay effect for locked */}
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.1)',
                                        pointerEvents: 'none'
                                    }}></div>
                                </div>
                            </div>
                        </div>
                    )
                ) : viewMode === 'track' ? (
                    <AdminTracking
                        currentUserRole={userRole}
                        currentUserName={userName}
                    />
                ) : (
                    <AssignmentPanel
                        userRole={userRole}
                        userName={userName}
                    />
                )}
            </div>
        </div>
    );
}
