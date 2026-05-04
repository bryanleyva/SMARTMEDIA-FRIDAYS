'use client';

import { useState, useTransition } from 'react';
import { getIngresadosR10, updateEstadoIngresadoR10 } from '@/app/actions/leads-r10';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    user: string;
    userRole: string;
    initialData: any[];
}

const ESTADOS_TAB = ['TODOS', 'PENDIENTE', 'ACTIVO', 'RECHAZADO'] as const;

export default function MesaControlR10Client({ user, userRole, initialData }: Props) {
    const [data, setData] = useState(initialData);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [estadoTab, setEstadoTab] = useState<typeof ESTADOS_TAB[number]>('PENDIENTE');
    const [isPending, startTransition] = useTransition();
    const [selected, setSelected] = useState<any | null>(null);

    const reload = (estado?: string) => {
        startTransition(async () => {
            const fresh = await getIngresadosR10(user, userRole, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                search: search || undefined,
                scope: 'all',
            });
            setData(fresh);
        });
    };

    const clearFilters = () => {
        setStartDate(''); setEndDate(''); setSearch('');
        startTransition(async () => {
            const fresh = await getIngresadosR10(user, userRole, { scope: 'all' });
            setData(fresh);
        });
    };

    // Filtro client-side por tab y búsqueda
    const filtered = data.filter(d => {
        if (estadoTab !== 'TODOS' && (d.estado || '').toUpperCase() !== estadoTab) return false;
        if (search.trim()) {
            const s = search.toLowerCase().trim();
            const ruc = (d.rucDni || '').toLowerCase();
            const nombre = (d.nombresApellidos || '').toLowerCase();
            if (!ruc.includes(s) && !nombre.includes(s)) return false;
        }
        return true;
    });

    // Contadores por estado
    const counts = {
        TODOS: data.length,
        PENDIENTE: data.filter(d => (d.estado || '').toUpperCase() === 'PENDIENTE').length,
        ACTIVO: data.filter(d => (d.estado || '').toUpperCase() === 'ACTIVO').length,
        RECHAZADO: data.filter(d => (d.estado || '').toUpperCase() === 'RECHAZADO').length,
    };

    const panelStyle: React.CSSProperties = {
        background: 'rgba(24,24,27,0.4)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem',
    };

    const estadoColor = (estado: string) => {
        const e = (estado || '').toUpperCase();
        if (e === 'PENDIENTE') return { bg: 'rgba(251,191,36,0.15)', fg: '#fbbf24' };
        if (e === 'ACTIVO') return { bg: 'rgba(16,185,129,0.15)', fg: '#10b981' };
        if (e === 'RECHAZADO') return { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' };
        return { bg: 'rgba(156,163,175,0.15)', fg: '#9ca3af' };
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '6px', height: '40px', background: '#8b5cf6', borderRadius: '3px', boxShadow: '0 0 20px #8b5cf6' }} />
                    <div>
                        <h2 style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                            Mesa de Control R10
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                            Gestión de ventas · {counts.PENDIENTE} pendiente{counts.PENDIENTE !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs de estados */}
            <div style={{ ...panelStyle, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {ESTADOS_TAB.map(tab => {
                    const isActive = estadoTab === tab;
                    const c = tab === 'TODOS' ? { bg: 'rgba(99,102,241,0.2)', fg: '#a5b4fc' } : estadoColor(tab);
                    return (
                        <button
                            key={tab}
                            onClick={() => setEstadoTab(tab)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: isActive ? c.bg : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isActive ? c.fg : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '8px',
                                color: isActive ? c.fg : '#9ca3af',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                display: 'flex', gap: '0.5rem', alignItems: 'center',
                            }}
                        >
                            <span>{tab}</span>
                            <span style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem' }}>
                                {counts[tab]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filtros */}
            <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="🔍 Buscar por RUC/DNI o nombre..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: '220px', padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.9rem' }}
                />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Desde:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }} />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Hasta:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }} />
                <button onClick={() => reload()} disabled={isPending} style={{ padding: '0.5rem 1rem', background: '#8b5cf6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                    {isPending ? 'Cargando...' : 'Recargar'}
                </button>
                <button onClick={clearFilters} disabled={isPending} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>Limpiar</button>
            </div>

            {/* Tabla */}
            <div style={{ ...panelStyle, flex: 1, overflow: 'auto' }}>
                {filtered.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
                        No hay ventas en esta vista.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['ID', 'Estado', 'Fecha cierre', 'Cliente', 'RUC/DNI', 'Canal', 'Líneas', 'Ejecutivo', 'Acciones'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(v => {
                                    const c = estadoColor(v.estado);
                                    return (
                                        <tr key={v.ventaId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#8b5cf6', fontWeight: 700, fontFamily: 'monospace' }}>#{v.ventaId}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <span style={{ background: c.bg, color: c.fg, padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                                                    {v.estado}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#d1d5db', whiteSpace: 'nowrap' }}>{v.fechaCierre?.split(',')[0]}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: 'white', fontWeight: 500 }}>{v.nombresApellidos}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#9ca3af', fontFamily: 'monospace' }}>{v.rucDni}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#d1d5db' }}>{v.canalVenta}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#8b5cf6', fontWeight: 700 }}>{v.cantidadLineas}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#9ca3af', fontSize: '0.8rem' }}>{v.ejecutivo}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <button onClick={() => setSelected(v)} style={{ padding: '0.35rem 0.85rem', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '6px', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    Gestionar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && (
                <GestionarVentaModal
                    venta={selected}
                    onClose={() => setSelected(null)}
                    onSaved={() => { setSelected(null); reload(); }}
                    backofficeUser={user}
                />
            )}
        </div>
    );
}

function GestionarVentaModal({ venta, onClose, onSaved, backofficeUser }: { venta: any; onClose: () => void; onSaved: () => void; backofficeUser: string }) {
    const [nuevoEstado, setNuevoEstado] = useState<'PENDIENTE' | 'ACTIVO' | 'RECHAZADO'>(venta.estado || 'PENDIENTE');
    const [observacion, setObservacion] = useState(venta.observacionBo || '');
    const [motivoRechazo, setMotivoRechazo] = useState(venta.motivoRechazo || '');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (nuevoEstado === 'RECHAZADO' && !motivoRechazo.trim()) {
            AppSwal.fire({ icon: 'warning', title: 'El motivo de rechazo es obligatorio' });
            return;
        }
        setSaving(true);
        try {
            const res = await updateEstadoIngresadoR10(
                venta.ventaId,
                nuevoEstado,
                backofficeUser,
                observacion.trim(),
                motivoRechazo.trim() || undefined
            );
            if (res.success) {
                await AppSwal.fire({ icon: 'success', title: 'Estado actualizado', timer: 1500, showConfirmButton: false });
                onSaved();
            } else {
                AppSwal.fire({ icon: 'error', title: 'Error', text: res.error });
            }
        } finally {
            setSaving(false);
        }
    };

    const input: React.CSSProperties = {
        width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.95rem',
    };

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(6px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#0a0a0b', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px',
                width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 700 }}>#{venta.ventaId}</span>
                            <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0 0' }}>{venta.nombresApellidos}</h2>
                            <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{venta.rucDni} · {venta.canalVenta}</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                    </div>
                </div>

                <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Cambiar estado</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                            {(['PENDIENTE', 'ACTIVO', 'RECHAZADO'] as const).map(e => {
                                const activo = nuevoEstado === e;
                                const colors = e === 'PENDIENTE' ? { bg: 'rgba(251,191,36,0.15)', border: '#fbbf24' }
                                    : e === 'ACTIVO' ? { bg: 'rgba(16,185,129,0.15)', border: '#10b981' }
                                    : { bg: 'rgba(239,68,68,0.15)', border: '#ef4444' };
                                return (
                                    <button key={e} onClick={() => setNuevoEstado(e)} style={{
                                        padding: '0.75rem', background: activo ? colors.bg : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${activo ? colors.border : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                    }}>{e}</button>
                                );
                            })}
                        </div>
                    </div>

                    {nuevoEstado === 'RECHAZADO' && (
                        <div>
                            <label style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Motivo de rechazo *</label>
                            <input type="text" value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} style={input} placeholder="Ej: datos incompletos, cliente no confirma..." />
                        </div>
                    )}

                    <div>
                        <label style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Observación (opcional)</label>
                        <textarea value={observacion} onChange={e => setObservacion(e.target.value)} style={{ ...input, minHeight: '80px', resize: 'vertical' }} placeholder="Comentarios del back office..." />
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', color: '#9ca3af' }}>
                        <strong style={{ color: 'white' }}>Resumen:</strong> {venta.cantidadLineas} línea{venta.cantidadLineas > 1 ? 's' : ''} · Entrega: {venta.tipoEntrega === 'RETIRO_EN_TIENDA' ? 'Tienda' : venta.tipoEntrega} · Ejecutivo: {venta.ejecutivo}
                    </div>
                </div>

                <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <button onClick={onClose} disabled={saving} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ padding: '0.75rem 1.75rem', background: saving ? '#6b7280' : '#8b5cf6', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700 }}>
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}