'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { validateSession } from '@/app/actions/session';

export default function SessionGuardian() {
    useEffect(() => {
        const interval = setInterval(async () => {
            const result = await validateSession();
            if (!result.valid) {
                // Force logout if session is invalid (another user logged in)
                await signOut({ redirect: true, callbackUrl: '/login?error=SessionExpired' });
            }
        }, 30000); // Check every 30 seconds for performance

        return () => clearInterval(interval);
    }, []);

    return null; // This component renders nothing
}
