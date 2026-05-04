'use client';

import { useState, useMemo } from 'react';
import { PostVentaRecord } from '@/app/actions/postventa';

interface Props {
    data: PostVentaRecord[];
    prevMonth: string; // e.g. "MARZO 2026"
}

const SEGMENTO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'SOHO':      { bg: '#6366f111', text: '#818cf8', border: '#6366f133' },
    'LOW PYME':  { bg: '#0ea5e911', text: '#38bdf8', border: '#0ea5e933' },
    'HIGH PYME': { bg: '#8b5cf611', text: '#a78bfa', border: '#8b5cf633' },
    'GRANDES':   { bg: '#f59e0b11', text: '#fbbf24', border: '#f59e0b33' },
    'CORPOS':    { bg: '#10b98111', text: '#34d399', border: '#10b98133' },
};

const getSegColor = (seg: string) =>
    SEGMENTO_COLORS[seg?.toUpperCase()] || { bg: '#ffffff0a', text: '#94a3b8', border: '#ffffff22' };

export default function PostVentaPipeline({ data, prevMonth }: Props) {
    const [search, setSearch] = useState('');
    const [segFilter, setSegFilter] = useState('ALL');
    const [rucTypeFilter, setRucTypeFilter] = useState<'ALL' | 'RUC10' | 'RUC20'>('ALL');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const segments = useMemo(() => {
        const s = new Set(data.map(r => r.segmento?.toUpperCase()).filter(Boolean));
        return ['ALL', ...Array.from(s)];
    }, [data]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return data.filter(r => {
            const matchSearch = !q ||
                r.ruc.toLowerCase().includes(q) ||
                r.razonSocial.toLowerCase().includes(q) ||
                r.ejecutivo.toLowerCase().includes(q);

            const matchSeg = segFilter === 'ALL' || (r.segmento?.toUpperCase() === segFilter);

            const matchRuc =
                rucTypeFilter === 'ALL' ||
                (rucTypeFilter === 'RUC10' && r.isRuc10) ||
                (rucTypeFilter === 'RUC20' && !r.isRuc10);

            return matchSearch && matchSeg && matchRuc;
        });
    }, [data, search, segFilter, rucTypeFilter]);

    const ruc10Count = data.filter(r => r.isRuc10).length;
    const ruc20Count = data.filter(r => !r.isRuc10).length;
    const totalLineas = data.reduce((sum, r) => sum + (parseInt(r.lineas) || 0), 0);

    return (
        <div style={{ color: 'white', fontFamily: 'inherit' }}>
            <style>{`
                .pv-header {
                    text-align: center;
                    margin-bottom: 2.5rem;
                }
                .pv-tag {
                    display: inline-block;
                    background: rgba(16, 185, 129, 0.12);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    color: #34d399;
                    font-size: 0.7rem;
                    font-weight: 900;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    padding: 5px 14px;
                    border-radius: 999px;
                    margin-bottom: 1rem;
                }
                .pv-title {
                    font-size: clamp(2rem, 4vw, 3rem);
                    font-weight: 950;
                    color: white;
                    margin: 0.25rem 0;
                    letter-spacing: -0.02em;
                }
                .pv-subtitle {
                    color: #64748b;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .pv-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                @media (max-width: 768px) { .pv-stats { grid-template-columns: repeat(2, 1fr); } }
                .pv-stat-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 1rem;
                    padding: 1.25rem 1.5rem;
                    position: relative;
                    overflow: hidden;
                    transition: border-color 0.3s;
                }
                .pv-stat-card:hover { border-color: rgba(255,255,255,0.15); }
                .pv-stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: var(--accent);
                }
                .pv-stat-label {
                    font-size: 0.65rem;
                    font-weight: 900;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: #64748b;
                    margin-bottom: 0.5rem;
                }
                .pv-stat-value {
                    font-size: 2rem;
                    font-weight: 950;
                    color: white;
                }
                .pv-stat-sub {
                    font-size: 0.7rem;
                    color: #475569;
                    margin-top: 0.25rem;
                }
                .pv-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    align-items: center;
                }
                .pv-search {
                    flex: 1;
                    min-width: 220px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 0.75rem;
                    padding: 0.65rem 1rem;
                    color: white;
                    font-size: 0.85rem;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .pv-search:focus { border-color: #10b981; }
                .pv-search::placeholder { color: #475569; }
                .pv-pill-group {
                    display: flex;
                    gap: 0.4rem;
                    flex-wrap: wrap;
                }
                .pv-pill {
                    padding: 6px 14px;
                    border-radius: 999px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    cursor: pointer;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.03);
                    color: #94a3b8;
                    transition: all 0.2s;
                }
                .pv-pill:hover { border-color: rgba(255,255,255,0.2); color: white; }
                .pv-pill.active {
                    background: rgba(16,185,129,0.15);
                    border-color: rgba(16,185,129,0.4);
                    color: #34d399;
                }
                .pv-pill.ruc10.active {
                    background: rgba(99,102,241,0.15);
                    border-color: rgba(99,102,241,0.4);
                    color: #818cf8;
                }
                .pv-pill.ruc20.active {
                    background: rgba(245,158,11,0.15);
                    border-color: rgba(245,158,11,0.4);
                    color: #fbbf24;
                }
                .pv-count-info {
                    font-size: 0.8rem;
                    color: #475569;
                    margin-left: auto;
                }
                .pv-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 1rem;
                }
                @media (max-width: 640px) { .pv-grid { grid-template-columns: 1fr; } }
                .pv-card {
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 1.25rem;
                    overflow: hidden;
                    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
                    cursor: pointer;
                }
                .pv-card:hover {
                    border-color: rgba(16,185,129,0.25);
                    background: rgba(16,185,129,0.03);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                .pv-card.expanded {
                    border-color: rgba(16,185,129,0.4);
                    background: rgba(16,185,129,0.04);
                }
                .pv-card-header {
                    padding: 1.25rem 1.5rem 1rem;
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                }
                .pv-card-icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                    flex-shrink: 0;
                }
                .pv-card-meta {
                    flex: 1;
                    min-width: 0;
                }
                .pv-card-ruc {
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 0.1em;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .pv-ruc-badge {
                    font-size: 0.6rem;
                    font-weight: 900;
                    padding: 2px 8px;
                    border-radius: 999px;
                }
                .pv-ruc-badge.ruc10 {
                    background: rgba(99,102,241,0.2);
                    color: #818cf8;
                    border: 1px solid rgba(99,102,241,0.3);
                }
                .pv-ruc-badge.ruc20 {
                    background: rgba(245,158,11,0.15);
                    color: #fbbf24;
                    border: 1px solid rgba(245,158,11,0.25);
                }
                .pv-card-name {
                    font-size: 1rem;
                    font-weight: 800;
                    color: white;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-top: 2px;
                }
                .pv-card-seg {
                    display: inline-block;
                    font-size: 0.62rem;
                    font-weight: 900;
                    padding: 2px 10px;
                    border-radius: 999px;
                    margin-top: 5px;
                    letter-spacing: 0.05em;
                }
                .pv-card-chips {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    padding: 0 1.5rem 1rem;
                }
                .pv-chip {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 0.5rem;
                    padding: 4px 10px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .pv-chip span { color: white; }
                .pv-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 0 1.5rem; }
                .pv-card-details {
                    padding: 1rem 1.5rem;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                    animation: slideDown 0.2s ease forwards;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .pv-detail-row {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .pv-detail-row.full { grid-column: 1 / -1; }
                .pv-detail-label {
                    font-size: 0.6rem;
                    font-weight: 900;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }
                .pv-detail-value {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: #e2e8f0;
                    word-break: break-word;
                }
                .pv-activado-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(16,185,129,0.1);
                    border: 1px solid rgba(16,185,129,0.25);
                    border-radius: 0.5rem;
                    padding: 4px 12px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: #34d399;
                    width: fit-content;
                }
                .pv-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: pulse-dot 2s infinite; }
                @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                .pv-empty {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 5rem 2rem;
                    color: #475569;
                }
                .pv-empty-icon { font-size: 3rem; margin-bottom: 1rem; }
                .pv-empty-title { font-size: 1.2rem; font-weight: 700; color: #64748b; }
                .pv-expand-btn {
                    padding: 0.75rem 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    transition: color 0.2s;
                }
                .pv-card:hover .pv-expand-btn { color: #64748b; }
                .pv-expand-chevron {
                    transition: transform 0.25s ease;
                }
                .pv-card.expanded .pv-expand-chevron {
                    transform: rotate(180deg);
                }
            `}</style>

            {/* Header */}
            <div className="pv-header">
                <div className="pv-tag">📋 Módulo Post Venta</div>
                <h1 className="pv-title">Pipeline de Cuentas Activadas</h1>
                <p className="pv-subtitle">Ventas con estado <strong style={{ color: '#34d399' }}>ACTIVADO</strong> — Período: <strong style={{ color: 'white' }}>{prevMonth}</strong></p>
            </div>

            {/* Stats */}
            <div className="pv-stats">
                <div className="pv-stat-card" style={{ '--accent': '#10b981' } as any}>
                    <div className="pv-stat-label">Total Cuentas</div>
                    <div className="pv-stat-value">{data.length}</div>
                    <div className="pv-stat-sub">Activadas el mes anterior</div>
                </div>
                <div className="pv-stat-card" style={{ '--accent': '#6366f1' } as any}>
                    <div className="pv-stat-label">RUC 10</div>
                    <div className="pv-stat-value" style={{ color: '#818cf8' }}>{ruc10Count}</div>
                    <div className="pv-stat-sub">Personas naturales</div>
                </div>
                <div className="pv-stat-card" style={{ '--accent': '#f59e0b' } as any}>
                    <div className="pv-stat-label">RUC 20</div>
                    <div className="pv-stat-value" style={{ color: '#fbbf24' }}>{ruc20Count}</div>
                    <div className="pv-stat-sub">Personas jurídicas</div>
                </div>
                <div className="pv-stat-card" style={{ '--accent': '#0ea5e9' } as any}>
                    <div className="pv-stat-label">Total Líneas</div>
                    <div className="pv-stat-value" style={{ color: '#38bdf8' }}>{totalLineas.toLocaleString()}</div>
                    <div className="pv-stat-sub">Líneas activadas</div>
                </div>
            </div>

            {/* Controls */}
            <div className="pv-controls">
                <input
                    className="pv-search"
                    type="text"
                    placeholder="🔍  Buscar por RUC, razón social o ejecutivo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                {/* RUC type filter */}
                <div className="pv-pill-group">
                    <button className={`pv-pill ${rucTypeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setRucTypeFilter('ALL')}>Todos</button>
                    <button className={`pv-pill ruc10 ${rucTypeFilter === 'RUC10' ? 'active' : ''}`} onClick={() => setRucTypeFilter('RUC10')}>RUC 10</button>
                    <button className={`pv-pill ruc20 ${rucTypeFilter === 'RUC20' ? 'active' : ''}`} onClick={() => setRucTypeFilter('RUC20')}>RUC 20</button>
                </div>

                {/* Segment filter */}
                <div className="pv-pill-group">
                    {segments.map(seg => (
                        <button
                            key={seg}
                            className={`pv-pill ${segFilter === seg ? 'active' : ''}`}
                            onClick={() => setSegFilter(seg)}
                        >
                            {seg === 'ALL' ? 'Todos los segmentos' : seg}
                        </button>
                    ))}
                </div>

                <span className="pv-count-info">{filtered.length} registros</span>
            </div>

            {/* Pipeline Grid */}
            <div className="pv-grid">
                {filtered.length === 0 ? (
                    <div className="pv-empty">
                        <div className="pv-empty-icon">📭</div>
                        <div className="pv-empty-title">No hay registros que coincidan</div>
                    </div>
                ) : filtered.map(record => {
                    const segColor = getSegColor(record.segmento);
                    const isExp = expandedId === record.id;

                    return (
                        <div
                            key={record.id}
                            className={`pv-card ${isExp ? 'expanded' : ''}`}
                            onClick={() => setExpandedId(isExp ? null : record.id)}
                        >
                            {/* Card Header */}
                            <div className="pv-card-header">
                                <div className="pv-card-icon" style={{ background: segColor.bg, border: `1px solid ${segColor.border}` }}>
                                    {record.isRuc10 ? '👤' : '🏢'}
                                </div>
                                <div className="pv-card-meta">
                                    <div className="pv-card-ruc">
                                        {record.ruc}
                                        <span className={`pv-ruc-badge ${record.isRuc10 ? 'ruc10' : 'ruc20'}`}>
                                            {record.isRuc10 ? 'RUC 10' : 'RUC 20'}
                                        </span>
                                    </div>
                                    <div className="pv-card-name" title={record.razonSocial}>{record.razonSocial}</div>
                                    {record.segmento && (
                                        <span
                                            className="pv-card-seg"
                                            style={{ background: segColor.bg, color: segColor.text, border: `1px solid ${segColor.border}` }}
                                        >
                                            {record.segmento}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick chips */}
                            <div className="pv-card-chips">
                                <div className="pv-chip">📞 <span>{record.telefono || '—'}</span></div>
                                <div className="pv-chip">📶 <span>{record.lineas || '—'} líneas</span></div>
                                <div className="pv-chip">💰 <span>S/ {record.cargoFijo || '—'}</span></div>
                            </div>

                            {/* Expand hint */}
                            <div className="pv-expand-btn">
                                <span>{isExp ? 'Ver menos' : 'Ver detalle completo'}</span>
                                <svg className="pv-expand-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Expanded details */}
                            {isExp && (
                                <>
                                    <div className="pv-divider" />
                                    <div className="pv-card-details">
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">Estado</span>
                                            <div className="pv-activado-badge">
                                                <div className="pv-dot" />
                                                ACTIVADO
                                            </div>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">Ejecutivo</span>
                                            <span className="pv-detail-value">{record.ejecutivo || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">Supervisor</span>
                                            <span className="pv-detail-value">{record.supervisor || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">DNI Representante</span>
                                            <span className="pv-detail-value">{record.dni || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row full">
                                            <span className="pv-detail-label">Representante Legal</span>
                                            <span className="pv-detail-value">{record.contacto || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row full">
                                            <span className="pv-detail-label">Correo</span>
                                            <span className="pv-detail-value">{record.correo || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row full">
                                            <span className="pv-detail-label">Dirección</span>
                                            <span className="pv-detail-value">
                                                {[record.direccion, record.distrito, record.provincia, record.departamento].filter(Boolean).join(', ') || '—'}
                                            </span>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">Proceso</span>
                                            <span className="pv-detail-value">{record.proceso || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">Detalle</span>
                                            <span className="pv-detail-value">{record.detalle || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">SR Ingreso</span>
                                            <span className="pv-detail-value">{record.srIngreso || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">N° Orden</span>
                                            <span className="pv-detail-value">{record.numOrden || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">Fecha Activación</span>
                                            <span className="pv-detail-value">{record.fechaActivacion || '—'}</span>
                                        </div>
                                        <div className="pv-detail-row">
                                            <span className="pv-detail-label">Período</span>
                                            <span className="pv-detail-value">{record.fechaPeriodo || '—'}</span>
                                        </div>
                                        {record.observacion && (
                                            <div className="pv-detail-row full">
                                                <span className="pv-detail-label">Observación Mesa</span>
                                                <span className="pv-detail-value">{record.observacion}</span>
                                            </div>
                                        )}
                                        {record.observacionEjecutivo && (
                                            <div className="pv-detail-row full">
                                                <span className="pv-detail-label">Obs. Ejecutivo</span>
                                                <span className="pv-detail-value">{record.observacionEjecutivo}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}