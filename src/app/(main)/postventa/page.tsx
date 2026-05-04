import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPostVentaData } from "@/app/actions/postventa";
import PostVentaGestion from "@/components/PostVentaGestion";

function isPostVentaAuthorized(role: string, cargo: string): boolean {
    if (role === 'ADMIN') return true;
    if (role === 'ANDREA') return true;
    return (cargo || '').trim().toUpperCase().includes('POSTVENTA');
}

function getPrevMonthLabel(): string {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthName = prev.toLocaleString('es-PE', { month: 'long' }).toUpperCase();
    return `${monthName} ${prev.getFullYear()}`;
}

export default async function PostVentaPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) redirect('/login');

    const user = session.user as any;
    const role = (user.role || 'STANDAR') as string;
    const cargo = (user.cargo || '') as string;
    const userName = (user.name || user.email || '') as string;

    if (!isPostVentaAuthorized(role, cargo)) {
        return (
            <div style={{
                minHeight: '60vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'white', textAlign: 'center', gap: '1rem'
            }}>
                <div style={{ fontSize: '4rem' }}>🔒</div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>Acceso Restringido</h1>
                <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '420px', margin: 0 }}>
                    Este módulo es exclusivo para el equipo de{' '}
                    <strong style={{ color: '#f59e0b' }}>Post Venta</strong>.
                </p>
            </div>
        );
    }

    const prevMonth = getPrevMonthLabel();
    const result = await getPostVentaData();
    const data = result.success ? (result.data ?? []) : [];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* HEADER DE PÁGINA */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{
                    display: 'inline-block',
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#34d399',
                    fontSize: '0.7rem', fontWeight: 900,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    padding: '5px 14px', borderRadius: '999px', marginBottom: '1rem'
                }}>
                    📋 Post Venta
                </div>
                <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 950, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                    Gestión de Cuentas Activadas
                </h1>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                    Período: <strong style={{ color: '#94a3b8' }}>{prevMonth}</strong>
                    {' · '}{data.length} cuentas para gestionar
                </p>
            </div>

            {result.success === false && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '0.75rem', padding: '1rem 1.5rem',
                    color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1.5rem'
                }}>
                    ⚠️ {result.error ?? 'Error al cargar los datos.'}
                </div>
            )}

            <PostVentaGestion
                cuentas={data}
                usuario={userName}
                prevMonth={prevMonth}
            />
        </div>
    );
}