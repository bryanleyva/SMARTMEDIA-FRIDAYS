'use client';

import { useSession } from 'next-auth/react';
import UserFotocheck from '@/components/UserFotocheck';

export default function InicioPage() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const userData = session?.user ? {
        name: session.user.name || 'Usuario',
        role: (session.user as any).role || 'Personal',
        cargo: (session.user as any).cargo || '',
        dni: (session.user as any).dni || (session.user as any).id || '',
        supervisor: (session.user as any).supervisor || 'N/A',
        phone: (session.user as any).phone || '',
        photo: session.user.image || undefined
    } : null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1rem 1rem 4rem',
            position: 'relative',
            minHeight: '85vh',
            animation: 'fadeIn 0.5s ease-out forwards'
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .layout-wrapper-inicio {
                    display: flex;
                    flex-direction: row;
                    gap: 3.5rem;
                    align-items: flex-start;
                    justify-content: center;
                    width: 100%;
                    max-width: 1400px;
                    z-index: 10;
                    margin-top: 2rem;
                }
                .side-column {
                    flex-shrink: 0;
                }
                .main-column {
                    flex: 1;
                    display: flex;
                    flexDirection: column;
                    gap: 3rem;
                    max-width: 850px;
                }
                @media (max-width: 1100px) {
                    .layout-wrapper-inicio {
                        flex-direction: column;
                        align-items: center;
                        gap: 3rem;
                    }
                    .main-column {
                        max-width: 100%;
                    }
                }
            `}</style>

            {/* Ambient Background Glow */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '1200px',
                height: '800px',
                background: 'radial-gradient(circle, rgba(79, 70, 229, 0.05) 0%, transparent 70%)',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>

            <div className="layout-wrapper-inicio">
                {/* Side: Fotocheck */}
                {userData && (
                    <div className="side-column">
                        <UserFotocheck user={userData} />
                    </div>
                )}

                {/* Side: Welcome & Cards */}
                <div className="main-column" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    <div className="glass-panel" style={{
                        padding: '3.5rem',
                        textAlign: 'left',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            ¡Hola, {(userData?.name.split(' ')[0] || 'Bienvenido')}!
                        </h2>
                        <p style={{ color: '#9ca3af', fontSize: '1.25rem', lineHeight: 1.7, fontWeight: 300 }}>
                            Bienvenido a tu panel de control MK. Aquí puedes gestionar tus ventas,
                            revisar leads y monitorear tu desempeño en tiempo real. Selecciona una opción del menú para continuar.
                        </p>
                    </div>

                   
                </div>
            </div>
        </div>
    );
}
