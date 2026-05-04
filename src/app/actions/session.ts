'use server';

import { checkSessionToken } from '@/lib/google-sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function validateSession() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
        return { valid: false };
    }

    const token = (session.user as any).sessionToken;
    const username = session.user.email;

    if (!token) return { valid: false };

    try {
        const isValid = await checkSessionToken(username, token);
        return { valid: isValid };
    } catch (e) {
        console.error('Session validation error:', e);
        return { valid: true }; // Fail-open on truly unexpected errors
    }
}
