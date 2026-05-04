'use client';

import { useState } from 'react';
import { distributeLeads } from '@/app/actions';

export default function PedirBaseButton({ user }: { user: string }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleClick = async () => {
        setLoading(true);
        setMessage('');
        try {
            const result = await distributeLeads(user);
            if (result.success) {
                setMessage(`¡Éxito! Se te han asignado ${result.count} registros.`);
            } else {
                setMessage('No hay registros disponibles o hubo un error.');
            }
        } catch (e) {
            setMessage('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <button
                onClick={handleClick}
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Procesando...' : 'PEDIR BASE'}
            </button>
            {message && (
                <p className={`mt-4 text-sm ${message.includes('Éxito') ? 'text-success' : 'text-error'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}
