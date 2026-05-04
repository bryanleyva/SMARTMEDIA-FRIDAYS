'use client';

import { useState, useMemo } from 'react';

interface Props {
    user: string;
    userRole: string;
    ingresados: any[];
    interesados: any[];
}

export default function ReporteR10Client({ user, userRole, ingresados, interesados }: Props) {
    // Peru time current month
    const now = new Date();
    const peruDate = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', year: 'numeric', month: 'numeric' }).formatToParts(now);
    const currentMonth = parseInt(peruDate.find(p => p.type === 'month')?.value || '1');
    const currentYear = parseInt(peruDate.find(p => p.type === 'year')?.value || String(now.getFullYear()));

    const [mes, setMes] = useState(currentMonth);
    const [anio, setAnio] = useState(currentYear);

    // Parsear fecha "DD/MM/YYYY, HH:mm:ss"
    const parseDate = (dateStr: string): { m: number; y: number } | null => {
        if (!dateStr) return null;
        const parts = dateStr.split(',')[0].split('/').map(Number);
        if (parts.length < 3) return null;
        return { m: parts[1], y: parts[2] };
    };

    // Filtrar por mes/año
    const ingPeriod = useMemo(() => ingresados.filter(v => {
        const d = parseDate(v.fechaCierre);
        return d && d.m === mes && d.y === anio;
    }), [ingresados, mes, anio]);

    const intPeriod = useMemo(() => interesados.filter(v => {
        const d = parseDate(v.fechaIngreso);
        return d && d.m === mes && d.y === anio;
    }), [interesados, mes, anio]);

    // KPIs
    const kpis = useMemo(() => {
        const pendientes = ingPeriod.filter(v => (v.estado || '').toUpperCase() === 'PENDIENTE');
        const activas = ingPeriod.filter(v => (v.estado || '').toUpperCase() === 'ACTIVO');
        const rechazadas = ingPeriod.filter(v => (v.estado || '').toUpperCase() === 'RECHAZADO');

        const totalLineas = activas.reduce((s, v) => s + (v.cantidadLineas || 0), 0);
        const totalCerradas = ingPeriod.length;
        const conversion = intPeriod.length > 0 ? ((totalCerradas / intPeriod.length) * 100).toFixed(1) : '0.0';
        const efectividad = totalCerradas > 0 ? ((activas.length / totalCerradas) * 100).toFixed(1) : '0.0';

        return {
            interesados: intPeriod.length,
            cerradas: totalCerradas,
            pendientes: pendientes.length,
            activas: activas.length,
            rechazadas: rechazadas.length,
            totalLineas,
            conversion,
            efectividad,
        };
    }, [ingPeriod, intPeriod]);

    // Ranking ejecutivos (por ACTIVAS)
    const ranking = useMemo(() => {
        const map: Record<string, { activas: number; pendientes: number; rechazadas: number; lineas: number; interesados: number }> = {};
        intPeriod.forEach(v => {
            if (!v.ejecutivo) return;
            if (!map[v.ejecutivo]) map[v.ejecutivo] = { activas: 0, pendientes: 0, rechazadas: 0, lineas: 0, interesados: 0 };
            map[v.ejecutivo].interesados++;
        });
        ingPeriod.forEach(v => {
            if (!v.ejecutivo) return;
            if (!map[v.ejecutivo]) map[v.ejecutivo] = { activas: 0, pendientes: 0, rechazadas: 0, lineas: 0, interesados: 0 };
            const e = (v.estado || '').toUpperCase();
            if (e === 'ACTIVO') { map[v.ejecutivo].activas++; map[v.ejecutivo].lineas += (v.cantidadLineas || 0); }
            else if (e === 'PENDIENTE') map[v.ejecutivo].pendientes++;
            else if (e === 'RECHAZADO') map[v.ejecutivo].rechazadas++;
        });
        return Object.entries(map)
            .map(([nombre, s]) => ({ nombre, ...s }))
            .sort((a, b) => b.activas - a.activas);
    }, [ingPeriod, intPeriod]);

    // Distribución por Plan (solo activas)
    const distribPlan = useMemo(() => {
        const map: Record<string, number> = {};
        ingPeriod
            .filter(v => (v.estado || '').toUpperCase() === 'ACTIVO')
            .forEach(v => {
                v.lineas?.forEach((l: any) => {
                    const plan = l.plan || '—';
                    map[plan] = (map[plan] || 0) + 1;
                });
            });
        return Object.entries(map).map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count);
    }, [ingPeriod]);

    // Distribución por Canal (todas)
    const distribCanal = useMemo(() => {
        const map: Record<string, number> = {};
        ingPeriod.forEach(v => {
            const c = v.canalVenta || '—';
            map[c] = (map[c] || 0) + 1;
        });
        return Object.entries(map).map(([canal, count]) => ({ canal, count })).sort((a, b) => b.count - a.count);
    }, [ingPeriod]);

    // Distribución por Tipo de venta
    const distribTipo = useMemo(() => {
        let portabilidad = 0, alta = 0;
        ingPeriod.forEach(v => {
            v.lineas?.forEach((l: any) => {
                if (l.tipoVenta === 'PORTABILIDAD') portabilidad++;
                else if (l.tipoVenta === 'ALTA') alta++;
            });
        });
        return { portabilidad, alta, total: portabilidad + alta };
    }, [ingPeriod]);

    const panelStyle: React.CSSProperties = {
        background: 'rgba(24,24,27,0.4)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem',
    };

    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return (
        <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '6px', height: '40px', background: '#10b981', borderRadius: '3px', boxShadow: '0 0 20px #10b981' }} />
                    <div>
                        <h2 style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', margin: 0, textTransform: 'uppercase' }}>
                            Reporte R10
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                            KPIs y métricas del período
                        </p>
                    </div>
                </div>

                {/* Selector de mes/año */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={{ padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }}>
                        {MESES.map((m, i) => (
                            <option key={i} value={i + 1} style={{ background: '#0a0a0b', color: 'white' }}>{m}</option>
                        ))}
                    </select>
                    <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ padding: '0.5rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }}>
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                            <option key={y} value={y} style={{ background: '#0a0a0b', color: 'white' }}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPIs principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <KpiCard label="Interesados" value={kpis.interesados} color="#fbbf24" />
                <KpiCard label="Ventas cerradas" value={kpis.cerradas} color="#6366f1" />
                <KpiCard label="Activas" value={kpis.activas} sub={`${kpis.totalLineas} líneas`} color="#10b981" highlight />
                <KpiCard label="Pendientes" value={kpis.pendientes} color="#f59e0b" />
                <KpiCard label="Rechazadas" value={kpis.rechazadas} color="#ef4444" />
            </div>

            {/* Tasas de conversión */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                <div style={{ ...panelStyle }}>
                    <div style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                        Tasa de conversión (Interesado → Cerrada)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ color: '#6366f1', fontSize: '2.5rem', fontWeight: 900 }}>{kpis.conversion}</span>
                        <span style={{ color: '#9ca3af', fontSize: '1rem' }}>%</span>
                    </div>
                    <ProgressBar percent={parseFloat(kpis.conversion)} color="#6366f1" />
                </div>
                <div style={{ ...panelStyle }}>
                    <div style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                        Efectividad (Activa / Cerrada)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ color: '#10b981', fontSize: '2.5rem', fontWeight: 900 }}>{kpis.efectividad}</span>
                        <span style={{ color: '#9ca3af', fontSize: '1rem' }}>%</span>
                    </div>
                    <ProgressBar percent={parseFloat(kpis.efectividad)} color="#10b981" />
                </div>
            </div>

            {/* Ranking ejecutivos */}
            <div style={{ ...panelStyle }}>
                <h3 style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                    🏆 Ranking de Ejecutivos
                </h3>
                {ranking.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.85rem' }}>Sin data en el período</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['#', 'Ejecutivo', 'Interesados', 'Activas', 'Pendientes', 'Rechazadas', 'Líneas', 'Efectividad'].map(h => (
                                        <th key={h} style={{ padding: '0.6rem 0.5rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ranking.map((e, idx) => {
                                    const totalCerradas = e.activas + e.pendientes + e.rechazadas;
                                    const efect = totalCerradas > 0 ? ((e.activas / totalCerradas) * 100).toFixed(0) : '0';
                                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                                    return (
                                        <tr key={e.nombre} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '0.7rem 0.5rem' }}>
                                                <span style={{
                                                    background: idx < 3 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                                                    color: idx < 3 ? '#fbbf24' : '#9ca3af',
                                                    padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.75rem',
                                                }}>{medal || idx + 1}</span>
                                            </td>
                                            <td style={{ padding: '0.7rem 0.5rem', color: 'white', fontWeight: 500 }}>{e.nombre}</td>
                                            <td style={{ padding: '0.7rem 0.5rem', color: '#fbbf24', fontWeight: 700 }}>{e.interesados}</td>
                                            <td style={{ padding: '0.7rem 0.5rem', color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>{e.activas}</td>
                                            <td style={{ padding: '0.7rem 0.5rem', color: '#f59e0b', fontWeight: 700 }}>{e.pendientes}</td>
                                            <td style={{ padding: '0.7rem 0.5rem', color: '#ef4444', fontWeight: 700 }}>{e.rechazadas}</td>
                                            <td style={{ padding: '0.7rem 0.5rem', color: '#8b5cf6', fontWeight: 700 }}>{e.lineas}</td>
                                            <td style={{ padding: '0.7rem 0.5rem', color: parseFloat(efect) >= 70 ? '#10b981' : parseFloat(efect) >= 40 ? '#fbbf24' : '#ef4444', fontWeight: 700 }}>{efect}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Distribuciones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.75rem' }}>
                {/* Por plan */}
                <div style={{ ...panelStyle }}>
                    <h3 style={{ color: '#8b5cf6', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        Distribución por Plan (Activas)
                    </h3>
                    <DistribList items={distribPlan.map(d => ({ label: d.plan, value: d.count }))} color="#8b5cf6" />
                </div>

                {/* Por canal */}
                <div style={{ ...panelStyle }}>
                    <h3 style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        Distribución por Canal
                    </h3>
                    <DistribList items={distribCanal.map(d => ({ label: d.canal, value: d.count }))} color="#6366f1" />
                </div>

                {/* Por tipo */}
                <div style={{ ...panelStyle }}>
                    <h3 style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        Tipo de Venta (líneas)
                    </h3>
                    {distribTipo.total === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>Sin data</p>
                    ) : (
                        <div>
                            <DistribList
                                items={[
                                    { label: 'PORTABILIDAD', value: distribTipo.portabilidad },
                                    { label: 'ALTA', value: distribTipo.alta },
                                ]}
                                color="#3b82f6"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, color, sub, highlight }: { label: string; value: number | string; color: string; sub?: string; highlight?: boolean }) {
    return (
        <div style={{
            background: highlight ? `linear-gradient(145deg, ${color}15, ${color}05)` : 'rgba(24,24,27,0.4)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${highlight ? color + '40' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '12px', padding: '1.1rem 1.25rem',
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: color }} />
            <div style={{ color: '#9ca3af', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>{label}</div>
            <div style={{ color, fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>{sub}</div>}
        </div>
    );
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
    const safe = Math.max(0, Math.min(100, percent));
    return (
        <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${safe}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.3s' }} />
        </div>
    );
}

function DistribList({ items, color }: { items: { label: string; value: number }[]; color: string }) {
    if (items.length === 0) {
        return <p style={{ color: '#6b7280', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>Sin data</p>;
    }
    const total = items.reduce((s, i) => s + i.value, 0);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map(it => {
                const percent = total > 0 ? (it.value / total) * 100 : 0;
                return (
                    <div key={it.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <span style={{ color: '#d1d5db', fontSize: '0.85rem', fontWeight: 500 }}>{it.label}</span>
                            <span style={{ color, fontSize: '0.85rem', fontWeight: 700 }}>
                                {it.value} <span style={{ color: '#6b7280', fontWeight: 400 }}>({percent.toFixed(0)}%)</span>
                            </span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '999px' }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}