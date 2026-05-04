'use client';

import { useState } from 'react';
import { updateProfile } from '@/app/actions/profile';
import { useRouter } from 'next/navigation';
import { AppSwal } from '@/lib/sweetalert';
import { useSession } from 'next-auth/react';

interface ProfileFormProps {
    user: {
        dni: string;
        name: string;
        user: string;
        role: string;
        phone: string;
        photo: string;
    };
}

export default function ProfileForm({ user }: ProfileFormProps) {
    const { update } = useSession();
    const [phone, setPhone] = useState(user.phone);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(user.photo);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const clientAction = async (formData: FormData) => {
        setLoading(true);
        try {
            console.log('--- clientAction Start ---');

            // Validate username and trim
            const currentUsername = (user.user || '').trim();
            if (!currentUsername) throw new Error('Nombre de usuario no definido o inválido');

            // Collect data safely
            const phoneVal = formData.get('phone') as string || '';
            const file = formData.get('photo') as File | null;

            console.log('Client Data:', { phone: phoneVal, hasFile: !!file && file.size > 0, username: currentUsername });

            // Ensure trimmed username is sent for the server action
            formData.set('username', currentUsername);

            const res = await updateProfile(currentUsername, formData);

            if (res.success) {
                // If it was a photo update, try to refresh the session locally
                if (res.photoUrl) {
                    try {
                        console.log('Updating session with new photo:', res.photoUrl);
                        await update({ image: res.photoUrl });
                    } catch (sessionErr) {
                        console.error('Session update failed but profile was saved:', sessionErr);
                    }
                }

                await AppSwal.fire({
                    title: '¡Operación Exitosa!',
                    text: 'Tu información ha sido sincronizada correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                    timer: 2000
                });
                router.refresh();
            } else {
                // The server action returned success: false, so it's a "known" error
                throw new Error(res.error || 'Fallo interno del servidor al procesar la solicitud');
            }
        } catch (error: any) {
            console.error('Profile Update Client Error:', error);

            let title = 'Error de Sincronización';
            let errorMsg = error.message || 'Error de comunicación con el servidor.';
            let footer = '<p style="color: #ef4444; font-size: 0.7rem;">Si el problema persiste, contacte a soporte técnico.</p>';

            // Manejo específico para el error genérico de Next.js Server Actions
            if (errorMsg.includes('An unexpected response was received')) {
                title = 'Bloqueo de Seguridad / Timeout';
                errorMsg = 'El servidor devolvió una respuesta inesperada. Esto ocurre comúnmente cuando <b>Cloudflare</b> o un sistema de seguridad bloquea la subida de archivos.';
                footer = `
                    <div style="text-align: left; font-size: 0.75rem; color: #9ca3af; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <b>Posibles causas:</b>
                        <ul style="margin-top: 5px; padding-left: 15px;">
                            <li>La cuenta de Google no tiene permisos en Cloudflare Access.</li>
                            <li>El archivo es demasiado grande o sospechoso para el WAF.</li>
                            <li>La conexión es inestable (Time-out).</li>
                        </ul>
                        <p style="margin-top: 8px;">Pruebe usando una ventana normal (no incógnito) o verifique su conexión a Cloudflare.</p>
                    </div>
                `;
            }

            AppSwal.fire({
                title: title,
                html: `<div style="color: #e5e7eb; line-height: 1.5;">${errorMsg}</div>`,
                icon: 'error',
                footer: footer,
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form action={clientAction} style={{
            background: 'rgba(10, 10, 11, 0.4)',
            backdropFilter: 'blur(20px)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
            {/* Header Hero Section */}
            <div style={{
                height: '140px',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center'
            }}>
                <div style={{
                    position: 'absolute',
                    bottom: '-60px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '4px solid #0a0a0b',
                    background: '#18181b',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} className="group relative">
                    {preview ? (
                        <img src={preview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.2)' }}>
                            {user.name.charAt(0)}
                        </div>
                    )}

                    <label style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        cursor: 'pointer'
                    }} className="hover-opacity-100 group-hover:opacity-100">
                        <span style={{ fontSize: '1.5rem' }}>📷</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '0.05em' }}>Cambiar</span>
                        <input name="photo" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                </div>
            </div>

            <div style={{ padding: '80px 2rem 2.5rem' }} className="flex flex-col gap-8">
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '0.25rem' }}>{user.name}</h3>
                    <p style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {user.role} {(user as any).cargo ? `| ${(user as any).cargo}` : ''}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <label className="label-premium">Información de Usuario</label>
                        <div className="space-y-4 mt-4">
                            <div>
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>DNI</span>
                                <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '500', padding: '0.5rem 0' }}>{user.dni}</div>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Usuario</span>
                                <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '500', padding: '0.5rem 0' }}>{user.user}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <label className="label-premium">Estructura</label>
                        <div className="space-y-4 mt-4">
                            <div>
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cargo Actual</span>
                                <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '500', padding: '0.5rem 0' }}>{(user as any).cargo || 'EJECUTIVO DE VENTAS'}</div>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Supervisor Asignado</span>
                                <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '500', padding: '0.5rem 0' }}>{(user as any).supervisor || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2" style={{ background: 'rgba(79, 70, 229, 0.03)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
                        <label className="label-premium" style={{ color: 'var(--primary)' }}>Datos Editables</label>
                        <div className="mt-4">
                            <label className="label-premium" style={{ fontSize: '0.6rem', opacity: 0.8 }}>Teléfono / Celular</label>
                            <input
                                name="phone"
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="input-premium"
                                style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(79, 70, 229, 0.3)', marginTop: '0.5rem' }}
                                placeholder="Ingrese su número"
                            />
                            <p className="text-xs mt-2" style={{ color: 'var(--primary)', opacity: 0.7 }}>
                                * Actualiza tu número para recibir notificaciones importantes.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ minWidth: '200px', borderRadius: '1rem' }}
                    >
                        {loading ? 'Sincronizando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </form>
    );
}
