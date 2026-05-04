'use client';

import { useState, useTransition } from 'react';
import { getIngresadosR10 } from '@/app/actions/leads-r10';

interface Props {
    ejecutivo: string;
    userRole: string;
    initialData: any[];
}

export default function IngresosR10Client({ ejecutivo, userRole, initialData }: Props) {
    const [data, setData] = useState(initialData);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [isPending, startTransition] = useTransition();
    const [selected, setSelected] = useState<any | null>(null);

    const reload = () => {
        startTransition(async () => {
            const fresh = await getIngresadosR10(ejecutivo, userRole, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                search: search || undefined,
            });
            setData(fresh);
        });
    };

    const clearFilters = () => {
        setStartDate(''); setEndDate(''); setSearch('');
        startTransition(async () => {
            const fresh = await getIngresadosR10(ejecutivo, userRole);
            setData(fresh);
        });
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

    const totalLineas = data.reduce((sum, i) => sum + (i.cantidadLineas || 0), 0);
    const pendientes = data.filter(d => (d.estado || '').toUpperCase() === 'PENDIENTE').length;
    const activas = data.filter(d => (d.estado || '').toUpperCase() === 'ACTIVO').length;

    return (
        <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '6px', height: '40px', background: '#10b981', borderRadius: '3px', boxShadow: '0 0 20px #10b981' }} />
                    <div>
                        <h2 style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                            Ingresos R10
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                            Total: {data.length} · {pendientes} pendiente{pendientes !== 1 ? 's' : ''} · {activas} activa{activas !== 1 ? 's' : ''} · {totalLineas} líneas
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Buscar por RUC/DNI o nombre..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && reload()}
                    style={{ flex: 1, minWidth: '220px', padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.9rem' }}
                />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Desde:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }} />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Hasta:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }} />
                <button onClick={reload} disabled={isPending} style={{ padding: '0.5rem 1rem', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                    {isPending ? 'Cargando...' : 'Filtrar'}
                </button>
                <button onClick={clearFilters} disabled={isPending} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>Limpiar</button>
            </div>

            <div style={{ ...panelStyle, flex: 1, overflow: 'auto' }}>
                {data.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
                        No hay ventas cerradas con estos filtros.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['ID', 'Estado', 'Fecha cierre', 'Cliente', 'RUC/DNI', 'Canal', 'Entrega', 'Líneas', 'Ejecutivo'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(v => {
                                    const c = estadoColor(v.estado);
                                    return (
                                        <tr key={v.ventaId} onClick={() => setSelected(v)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.05)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>#{v.ventaId}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <span style={{ background: c.bg, color: c.fg, padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                                                    {v.estado || '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#d1d5db', whiteSpace: 'nowrap' }}>{v.fechaCierre?.split(',')[0]}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: 'white', fontWeight: 500 }}>{v.nombresApellidos}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#9ca3af', fontFamily: 'monospace' }}>{v.rucDni}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#d1d5db' }}>{v.canalVenta}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <span style={{ background: v.tipoEntrega === 'DELIVERY' ? 'rgba(99,102,241,0.15)' : 'rgba(251,191,36,0.15)', color: v.tipoEntrega === 'DELIVERY' ? '#a5b4fc' : '#fbbf24', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                                                    {v.tipoEntrega === 'RETIRO_EN_TIENDA' ? 'TIENDA' : v.tipoEntrega}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#10b981', fontWeight: 700 }}>{v.cantidadLineas}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#9ca3af', fontSize: '0.8rem' }}>{v.ejecutivo}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && <IngresoDetailModal venta={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}

function IngresoDetailModal({ venta, onClose }: { venta: any; onClose: () => void }) {
    const infoRow = (label: string, value: any) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
        </div>
    );

    const c = (() => {
        const e = (venta.estado || '').toUpperCase();
        if (e === 'PENDIENTE') return { bg: 'rgba(251,191,36,0.15)', fg: '#fbbf24' };
        if (e === 'ACTIVO') return { bg: 'rgba(16,185,129,0.15)', fg: '#10b981' };
        if (e === 'RECHAZADO') return { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' };
        return { bg: 'rgba(156,163,175,0.15)', fg: '#9ca3af' };
    })();

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(6px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#0a0a0b', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px',
                width: '100%', maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>#{venta.ventaId}</span>
                            <span style={{ background: c.bg, color: c.fg, padding: '0.1rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>{venta.estado}</span>
                        </div>
                        <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{venta.nombresApellidos}</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
                    {venta.estado === 'RECHAZADO' && venta.motivoRechazo && (
                        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>MOTIVO DE RECHAZO</div>
                            <div style={{ color: 'white', fontSize: '0.9rem' }}>{venta.motivoRechazo}</div>
                        </div>
                    )}

                    {venta.observacionBo && (
                        <div style={{ padding: '1rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <div style={{ color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>OBSERVACIÓN DEL BACK OFFICE</div>
                            <div style={{ color: 'white', fontSize: '0.9rem' }}>{venta.observacionBo}</div>
                        </div>
                    )}

                    <h3 style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Cliente</h3>
                    <div style={{ marginBottom: '1.5rem' }}>
                        {infoRow('RUC / DNI', venta.rucDni)}
                        {infoRow('Tipo ingreso', venta.tipoIngreso)}
                        {infoRow('Canal', venta.canalVenta)}
                        {infoRow('Correo', venta.correo)}
                        {infoRow('Ejecutivo', venta.ejecutivo)}
                        {infoRow('Fecha ingreso', venta.fechaIngreso)}
                        {infoRow('Fecha cierre', venta.fechaCierre)}
                        {venta.fechaActivacion && infoRow('Fecha activación', venta.fechaActivacion)}
                        {venta.mesaControlAsignado && infoRow('Gestionado por', venta.mesaControlAsignado)}
                    </div>

                    <h3 style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Entrega</h3>
                    <div style={{ marginBottom: '1.5rem' }}>
                        {infoRow('Tipo de entrega', venta.tipoEntrega === 'RETIRO_EN_TIENDA' ? 'RETIRO EN TIENDA' : venta.tipoEntrega)}
                        {venta.tipoEntrega === 'DELIVERY' ? (
                            <>
                                {infoRow('Número contacto', venta.numeroContacto)}
                                {infoRow('Dirección', venta.direccionEntrega)}
                                {infoRow('Referencia', venta.referenciaEntrega)}
                                {infoRow('Coordenadas', venta.coordenadas)}
                                {infoRow('Tipo envío', venta.tipoEnvio)}
                                {infoRow('Fecha envío', venta.fechaEnvio)}
                                {infoRow('Rango envío', venta.rangoEnvio)}
                            </>
                        ) : (
                            infoRow('PDV - Tienda', venta.pdvTienda)
                        )}
                    </div>

                    <h3 style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                        Líneas ({venta.cantidadLineas})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {venta.lineas.map((l: any, idx: number) => (
                            <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>LÍNEA {l.lineaNum}</span>
                                    <span style={{ background: l.tipoVenta === 'PORTABILIDAD' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)', color: l.tipoVenta === 'PORTABILIDAD' ? '#a5b4fc' : '#6ee7b7', padding: '0.1rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>{l.tipoVenta}</span>
                                </div>
                                {infoRow('Plan', l.plan)}
                                {l.tipoVenta === 'PORTABILIDAD' && (
                                    <>
                                        {infoRow('Nº a portar', l.numeroPortar)}
                                        {infoRow('Operador actual', l.operadorActual)}
                                        {infoRow('Modalidad', l.modalidadOperador)}
                                    </>
                                )}
                                {infoRow('Promoción', l.promocionBrindada)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}