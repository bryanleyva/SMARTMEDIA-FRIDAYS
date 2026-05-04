'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface UserMenuProps {
    name?: string | null;
    role?: string | null;
    cargo?: string | null;
    photo?: string | null;
}

export default function UserMenu({ name, role, cargo, photo }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const getInitials = (n?: string | null) => {
        if (!n) return 'U';
        return n.substring(0, 2).toUpperCase();
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem'
                }}
            >
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }} className="hidden md:flex">
                    <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '500' }}>{name || 'Usuario'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {role} {cargo ? `| ${cargo}` : ''}
                    </span>
                </div>

                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: photo ? 'none' : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    border: '2px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
                    overflow: 'hidden'
                }}>
                    {photo ? (
                        <img src={photo} alt={name || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        getInitials(name)
                    )}
                </div>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 15px)',
                    right: 0,
                    width: '260px',
                    backgroundColor: 'rgba(18, 18, 20, 0.95)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '1.25rem',
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    padding: '0.75rem',
                    zIndex: 100,
                    overflow: 'hidden',
                    animation: 'menuAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {/* Header Info */}
                    <div style={{
                        padding: '1rem',
                        marginBottom: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '1rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <p style={{
                            color: '#10b981',
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            marginBottom: '0.5rem',
                            opacity: 0.8
                        }}>Conectado como</p>
                        <p style={{
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            lineHeight: '1.2',
                            wordBreak: 'break-word'
                        }}>{name}</p>
                        {cargo && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{cargo}</p>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <Link href="/profile" style={{ textDecoration: 'none' }}>
                            <div className="profile-menu-item" style={{
                                padding: '0.75rem 1rem',
                                fontSize: '0.9rem',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                borderRadius: '0.75rem',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}>
                                <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>👤</span>
                                <span style={{ fontWeight: '500' }}>Mi Perfil</span>
                            </div>
                        </Link>

                        <Link href="/settings" style={{ textDecoration: 'none' }}>
                            <div className="profile-menu-item" style={{
                                padding: '0.75rem 1rem',
                                fontSize: '0.9rem',
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                borderRadius: '0.75rem',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}>
                                <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>⚙️</span>
                                <span style={{ fontWeight: '500' }}>Configuración</span>
                            </div>
                        </Link>

                        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)', margin: '0.5rem 0.25rem' }}></div>

                        <button
                            onClick={() => {
                                sessionStorage.removeItem('hasSeenInterstitialAd');
                                signOut({ callbackUrl: '/login' });
                            }}
                            className="profile-menu-item-danger"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                fontSize: '0.9rem',
                                color: '#f87171',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '0.75rem',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>🚪</span>
                            <span style={{ fontWeight: '600' }}>Cerrar Sesión</span>
                        </button>
                    </div>

                    <style jsx>{`
                        .profile-menu-item:hover {
                            background: rgba(255, 255, 255, 0.05);
                            transform: translateX(4px);
                            color: #fff;
                        }
                        .profile-menu-item-danger:hover {
                            background: rgba(239, 68, 68, 0.1);
                            transform: translateX(4px);
                        }
                        @keyframes menuAppear {
                            from {
                                opacity: 0;
                                transform: translateY(10px) scale(0.95);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0) scale(1);
                            }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
