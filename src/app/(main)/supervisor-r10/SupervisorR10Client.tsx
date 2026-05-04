'use client';

import { useState, useTransition, useMemo } from 'react';
import { getIngresadosR10, getInteresadosR10 } from '@/app/actions/leads-r10';

interface Props {
    user: string;
    userRole: string;
    ingresados: any[];
    interesados: any[];
}

export default function SupervisorR10Client({ user, userRole, ingresados: initIng, interesados: initInt }: Props) {
    const [ingresados, setIngresados] = useState(initIng);
    const [interesados, setInteresados] = useState(initInt);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [filterExec, setFilterExec] = useState('TODOS');
    const [isPending, startTransition] = useTransition();
    const [selected, setSelected] = useState<any | null>(null);

    const reload = () => {
        startTransition(async () => {
            const scope = userRole === 'ADMIN' ? 'all' : 'team';
            const [ing, inte] = await Promise.all([
                getIngresadosR10(user, userRole, {
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    search: search || undefined,
                    scope,
                }),
                getInteresadosR10(user, userRole, {
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                }),
            ]);
            setIngresados(ing);
            setInteresados(inte);
        });
    };

    const clearFilters = () => {
        setStartDate(''); setEndDate(''); setSearch(''); setFilterExec('TODOS');
        reload();
    };

    // Lista de ejecutivos del equipo (para el filtro)
    const ejecutivos = useMemo(() => {
        const set = new Set<string>();
        [...ingresados, ...interesados].forEach(v => {
            if (v.ejecutivo) set.add(v.ejecutivo);
        });
        return Array.from(set).sort();
    }, [ingresados, interesados]);

    // Filtro por ejecutivo (client-side)
    const ingFiltered = ingresados.filter(v =>
        filterExec === 'TODOS' || v.ejecutivo === filterExec
    );
    const intFiltered = interesados.filter(v =>
        filterExec === 'TODOS' || v.ejecutivo === filterExec
    );

    // KPIs
    const kpi = {
        totalInteresados: intFiltered.length,
        totalIngresados: ingFiltered.length,
        pendientes: ingFiltered.filter(v => (v.estado || '').toUpperCase() === 'PENDIENTE').length,
        activas: ingFiltered.filter(v => (v.estado || '').toUpperCase() === 'ACTIVO').length,
        rechazadas: ingFiltered.filter(v => (v.estado || '').toUpperCase() === 'RECHAZADO').length,
        totalLineas: ingFiltered.reduce((s, v) => s + (v.cantidadLineas || 0), 0),
    };

    // Stats por ejecutivo
    const statsPorEjecutivo = useMemo(() => {
        const map: Record<string, { interesados: number; activas: number; pendientes: number; rechazadas: number; lineas: number }> = {};
        intFiltered.forEach(v => {
            if (!v.ejecutivo) return;
            if (!map[v.ejecutivo]) map[v.ejecutivo] = { interesados: 0, activas: 0, pendientes: 0, rechazadas: 0, lineas: 0 };
            map[v.ejecutivo].interesados++;
        });
        ingFiltered.forEach(v => {
            if (!v.ejecutivo) return;
            if (!map[v.ejecutivo]) map[v.ejecutivo] = { interesados: 0, activas: 0, pendientes: 0, rechazadas: 0, lineas: 0 };
            const e = (v.estado || '').toUpperCase();
            if (e === 'ACTIVO') map[v.ejecutivo].activas++;
            else if (e === 'PENDIENTE') map[v.ejecutivo].pendientes++;
            else if (e === 'RECHAZADO') map[v.ejecutivo].rechazadas++;
            map[v.ejecutivo].lineas += (v.cantidadLineas || 0);
        });
        return Object.entries(map)
            .map(([nombre, s]) => ({ nombre, ...s }))
            .sort((a, b) => b.activas - a.activas);
    }, [ingFiltered, intFiltered]);

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
                    <div style={{ width: '6px', height: '40px', background: '#3b82f6', borderRadius: '3px', boxShadow: '0 0 20px #3b82f6' }} />
                    <div>
                        <h2 style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                            Supervisor R10
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                            Vista de equipo · {ejecutivos.length} ejecutivo{ejecutivos.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <KpiCard label="Interesados" value={kpi.totalInteresados} color="#fbbf24" />
                <KpiCard label="Pendientes" value={kpi.pendientes} color="#f59e0b" />
                <KpiCard label="Activas" value={kpi.activas} color="#10b981" highlight />
                <KpiCard label="Rechazadas" value={kpi.rechazadas} color="#ef4444" />
                <KpiCard label="Total Líneas" value={kpi.totalLineas} color="#8b5cf6" />
            </div>

            {/* Filtros */}
            <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <select
                    value={filterExec}
                    onChange={e => setFilterExec(e.target.value)}
                    style={{ padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark', minWidth: '200px' }}
                >
                    <option value="TODOS" style={{ background: '#0a0a0b', color: 'white' }}>Todos los ejecutivos</option>
                    {ejecutivos.map(e => (
                        <option key={e} value={e} style={{ background: '#0a0a0b', color: 'white' }}>{e}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && reload()}
                    style={{ flex: 1, minWidth: '180px', padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.9rem' }}
                />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Desde:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }} />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Hasta:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }} />
                <button onClick={reload} disabled={isPending} style={{ padding: '0.5rem 1rem', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                    {isPending ? 'Cargando...' : 'Aplicar'}
                </button>
                <button onClick={clearFilters} disabled={isPending} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>Limpiar</button>
            </div>

            {/* Ranking del equipo */}
            <div style={{ ...panelStyle }}>
                <h3 style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    Ranking del Equipo
                </h3>
                {statsPorEjecutivo.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.85rem' }}>Sin data del equipo</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['#', 'Ejecutivo', 'Interesados', 'Pendientes', 'Activas', 'Rechazadas', 'Líneas'].map(h => (
                                        <th key={h} style={{ padding: '0.6rem 0.5rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {statsPorEjecutivo.map((e, idx) => (
                                    <tr key={e.nombre} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <td style={{ padding: '0.6rem 0.5rem' }}>
                                            <span style={{
                                                background: idx === 0 ? 'rgba(251,191,36,0.2)' : idx === 1 ? 'rgba(156,163,175,0.2)' : idx === 2 ? 'rgba(217,119,6,0.2)' : 'rgba(255,255,255,0.05)',
                                                color: idx === 0 ? '#fbbf24' : idx === 1 ? '#d1d5db' : idx === 2 ? '#f59e0b' : '#9ca3af',
                                                padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.75rem',
                                            }}>{idx + 1}</span>
                                        </td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: 'white', fontWeight: 500 }}>{e.nombre}</td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#fbbf24', fontWeight: 700 }}>{e.interesados}</td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#f59e0b', fontWeight: 700 }}>{e.pendientes}</td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#10b981', fontWeight: 800 }}>{e.activas}</td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#ef4444', fontWeight: 700 }}>{e.rechazadas}</td>
                                        <td style={{ padding: '0.6rem 0.5rem', color: '#8b5cf6', fontWeight: 700 }}>{e.lineas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Tabla de ingresados (solo lectura) */}
            <div style={{ ...panelStyle, flex: 1, overflow: 'auto' }}>
                <h3 style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    Ingresos del Equipo ({ingFiltered.length})
                </h3>
                {ingFiltered.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
                        Sin ingresos con estos filtros.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['ID', 'Estado', 'Fecha cierre', 'Cliente', 'RUC/DNI', 'Ejecutivo', 'Líneas'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ingFiltered.map(v => {
                                    const c = estadoColor(v.estado);
                                    return (
                                        <tr key={v.ventaId} onClick={() => setSelected(v)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#3b82f6', fontWeight: 700, fontFamily: 'monospace' }}>#{v.ventaId}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <span style={{ background: c.bg, color: c.fg, padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>{v.estado}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#d1d5db', whiteSpace: 'nowrap' }}>{v.fechaCierre?.split(',')[0]}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: 'white', fontWeight: 500 }}>{v.nombresApellidos}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#9ca3af', fontFamily: 'monospace' }}>{v.rucDni}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#d1d5db', fontSize: '0.8rem' }}>{v.ejecutivo}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', color: '#10b981', fontWeight: 700 }}>{v.cantidadLineas}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && <DetailModal venta={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}

function KpiCard({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
    return (
        <div style={{
            background: highlight ? `linear-gradient(145deg, ${color}15, ${color}05)` : 'rgba(24,24,27,0.4)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${highlight ? color + '40' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '12px', padding: '1rem 1.25rem',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: color }} />
            <div style={{ color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                {label}
            </div>
            <div style={{ color, fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
        </div>
    );
}

function DetailModal({ venta, onClose }: { venta: any; onClose: () => void }) {
    const infoRow = (label: string, value: any) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
        </div>
    );

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(6px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#0a0a0b', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '20px',
                width: '100%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700 }}>#{venta.ventaId}</span>
                        <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0 0' }}>{venta.nombresApellidos}</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
                    {infoRow('Estado', venta.estado)}
                    {infoRow('RUC/DNI', venta.rucDni)}
                    {infoRow('Canal', venta.canalVenta)}
                    {infoRow('Ejecutivo', venta.ejecutivo)}
                    {infoRow('Supervisor', venta.supervisor)}
                    {infoRow('Fecha cierre', venta.fechaCierre)}
                    {venta.fechaActivacion && infoRow('Fecha activación', venta.fechaActivacion)}
                    {venta.motivoRechazo && infoRow('Motivo rechazo', venta.motivoRechazo)}
                    {venta.observacionBo && infoRow('Obs. Mesa Control', venta.observacionBo)}
                    {infoRow('Cantidad de líneas', venta.cantidadLineas)}
                </div>
            </div>
        </div>
    );
}