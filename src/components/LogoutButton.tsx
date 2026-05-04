'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
    return (
        <button
            onClick={() => {
                sessionStorage.removeItem('hasSeenInterstitialAd');
                signOut({ callbackUrl: '/login' });
            }}
            style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                background: 'transparent',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}
        >
            <span>SALIR</span>
        </button>
    );
}
