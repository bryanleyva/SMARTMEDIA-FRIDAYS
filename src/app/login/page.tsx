'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function LoginContent() {
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam === 'SessionExpired') {
            setError('Tu sesión ha expirado por seguridad (inicio en otro dispositivo). Por favor ingresa de nuevo.');
        } else if (errorParam === 'CredentialsSignin') {
            setError('Credenciales incorrectas');
        }

        const timeout = setTimeout(() => {
            if (window.location.search) {
                window.history.replaceState({}, '', window.location.pathname);
            }
        }, 2000);

        return () => clearTimeout(timeout);
    }, [searchParams]);

    useEffect(() => {
        sessionStorage.removeItem('hasSeenInterstitialAd');
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                username: user.trim(),
                password: password.trim(),
                redirect: false,
            });

            if (result?.error) {
                if (result.error === 'CredentialsSignin') {
                    setError('Usuario o contraseña incorrectos');
                } else if (result.error.includes('Connection') || result.error.includes('fetch')) {
                    setError('Error de conexión con el servidor. Por favor, reintenta.');
                } else {
                    setError('Ocurrió un error inesperado al iniciar sesión');
                }
                setLoading(false);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch (e) {
            console.error("Login crash:", e);
            setError('Error crítico de sistema. Contacte a soporte.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="card-professional p-10 animate-fade-in" style={{ borderTop: '4px solid var(--primary)', marginBottom: '20px' }}>

                {/* ===== LOGO CENTRADO ===== */}
                <div className="flex justify-center mb-6">
                    <Image
                        src="/icono.png"
                        alt="Logo"
                        width={130}
                        height={130}
                        priority
                        style={{
                            objectFit: 'contain'
                        }}
                    />
                </div>

                <div className="text-center mb-8">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
                        Portal de Acceso
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="label-premium">Usuario</label>
                        <input
                            type="text"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            className="input-premium"
                            placeholder="INGRESE SU USUARIO"
                            required
                        />
                    </div>

                    <div className="mb-8">
                        <label className="label-premium">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-premium"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded text-danger text-sm text-center font-bold"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary"
                    >
                        {loading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
                    </button>
                </form>

                <div className="mt-8 text-center"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                    <p className="text-xs text-gray-500 mb-1">
                        &copy; {new Date().getFullYear()} Backap. Todos los derechos reservados.
                    </p>
                </div>

            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Cargando...</div>}>
            <LoginContent />
        </Suspense>
    );
}