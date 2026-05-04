'use client';

export default function GlobalLoading() {
    return (
        <div style={{
            height: 'calc(100vh - 150px)',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(16, 185, 129, 0.1)',
                borderTop: '3px solid #10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            <p style={{
                color: '#71717a',
                fontSize: '0.875rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
            }}>
                Cargando sistema...
            </p>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
