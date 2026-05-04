'use client';

import React from 'react';

interface UserFotocheckProps {
    user: {
        name: string;
        role: string;
        cargo?: string;
        dni?: string;
        supervisor?: string;
        phone?: string;
        photo?: string;
    };
}

export default function UserFotocheck({ user }: UserFotocheckProps) {
    const initials = (user.name || '?')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    return (
        <div className="fotocheck-perspective" style={{
            perspective: '1200px',
            margin: '2rem 0',
        }}>
            <style>{`
                .fotocheck-card {
                    width: 380px;
                    height: 680px;
                    background: linear-gradient(165deg, #0a0f1d 0%, #020617 100%);
                    border-radius: 2.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.9), 0 0 50px rgba(79, 70, 229, 0.1);
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    color: white;
                    transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s ease;
                    transform-style: preserve-3d;
                    animation: cardEntrance 1s ease-out forwards;
                }

                .fotocheck-card:hover {
                    transform: rotateY(5deg) rotateX(2deg) translateY(-10px);
                    box-shadow: -20px 50px 100px -20px rgba(0, 0, 0, 1), 0 0 60px rgba(79, 70, 229, 0.2);
                }

                @keyframes cardEntrance {
                    from { opacity: 0; transform: translateY(40px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .holographic-glow {
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 50%);
                    pointer-events: none;
                    animation: holo 10s linear infinite;
                }

                @keyframes holo {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            <div className="fotocheck-card">
                <div className="holographic-glow"></div>

                {/* Lanyard Attachment Mockup */}
                <div style={{
                    width: '100%',
                    padding: '1.75rem 0 1rem',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div style={{
                        width: '60px',
                        height: '10px',
                        background: '#111827',
                        borderRadius: '5px',
                        margin: '0 auto 1rem',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}></div>

                    <h2 style={{
                        fontSize: '1rem',
                        fontWeight: '900',
                        letterSpacing: '0.5em',
                        color: 'white',
                        textShadow: '0 0 15px rgba(255,255,255,0.3)'
                    }}>SMART MEDIA</h2>
                    <p style={{
                        fontSize: '0.6rem',
                        color: '#818cf8',
                        fontWeight: '800',
                        letterSpacing: '0.2em',
                        marginTop: '4px'
                    }}>
                        CORPORATE SECURITY PASSPORT
                    </p>
                </div>

                {/* Main Identity Section */}
                <div style={{
                    marginTop: '2.5rem',
                    position: 'relative',
                    zIndex: 10,
                    transform: 'translateZ(30px)'
                }}>
                    <div style={{
                        width: '200px',
                        height: '200px',
                        borderRadius: '2.5rem',
                        overflow: 'hidden',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                        background: '#0a0f1d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {user.photo ? (
                            <img src={user.photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ fontSize: '5rem', fontWeight: '900', color: 'rgba(255,255,255,0.03)' }}>
                                {initials}
                            </div>
                        )}
                    </div>
                    {/* Status Indicator */}
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        width: '16px',
                        height: '16px',
                        background: '#10b981',
                        borderRadius: '50%',
                        border: '3px solid #020617',
                        boxShadow: '0 0 10px #10b981'
                    }}></div>
                </div>

                {/* Detailed Information */}
                <div style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    padding: '0 2.5rem',
                    width: '100%',
                    zIndex: 10,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{
                        fontSize: '1.6rem',
                        fontWeight: '900',
                        lineHeight: '1.1',
                        marginBottom: '0.75rem',
                        color: 'white',
                        letterSpacing: '-0.03em'
                    }}>
                        {(user.name || 'Usuario').toUpperCase()}
                    </h3>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        alignItems: 'center',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{
                            padding: '0.4rem 1.25rem',
                            background: 'rgba(79, 70, 229, 0.2)',
                            border: '1px solid rgba(79, 70, 229, 0.4)',
                            borderRadius: '2rem',
                        }}>
                            <p style={{ color: '#c7d2fe', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                {user.cargo || 'ANALISTA'}
                            </p>
                        </div>
                        <p style={{ color: '#6366f1', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {user.role}
                        </p>
                    </div>

                    {/* Supervisor - Moved here for better visibility */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: '1.5rem'
                    }}>
                        <span style={{ display: 'block', fontSize: '0.55rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>SUPERVISOR ASIGNADO</span>
                        <span style={{ fontSize: '1rem', color: '#818cf8', fontWeight: '800' }}>{user.supervisor || 'SIN ASIGNAR'}</span>
                    </div>

                    {/* Meta Grid - DNI and Phone */}
                    <div style={{
                        marginTop: 'auto',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        columnGap: '1.5rem',
                        textAlign: 'left',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        paddingTop: '1.5rem',
                        paddingBottom: '2.5rem',
                    }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.6rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>DNI / ID No.</span>
                            <span style={{ fontSize: '1rem', color: '#f1f5f9', fontWeight: '700', fontFamily: 'monospace' }}>{user.dni && user.dni.trim() !== '' ? user.dni : '********'}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontSize: '0.6rem', color: '#475569', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>TELEFONO</span>
                            <span style={{ fontSize: '1rem', color: '#f1f5f9', fontWeight: '700' }}>{user.phone || 'NO REG.'}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Strip */}
                <div style={{
                    width: '100%',
                    padding: '1.25rem 2.5rem',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    zIndex: 10
                }}>
                    <div style={{ opacity: 0.6 }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="#818cf8">
                            <path d="M3 5h2v14H3V5zm4 0h1v14H7V5zm3 0h3v14h-3V5zm4 0h1v14h-1V5zm3 0h2v14h-2V5zm3 0h1v14h-1V5z" />
                        </svg>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.5rem', color: '#818cf8', fontWeight: '900', letterSpacing: '0.1em', margin: 0 }}>OFFICIAL ACCESS CARD</p>
                        <p style={{ fontSize: '0.4rem', color: '#475569', margin: 0 }}>© SMART MEDIA 2025 ALL RIGHTS RESERVED</p>
                    </div>
                </div>
            </div>

            {/* Reflection / Glow on "ground" */}
            <div style={{
                width: '300px',
                height: '10px',
                background: 'rgba(79, 70, 229, 0.2)',
                filter: 'blur(15px)',
                borderRadius: '100%',
                margin: '1.5rem auto 0',
                opacity: 0.6
            }}></div>
        </div>
    );
}
