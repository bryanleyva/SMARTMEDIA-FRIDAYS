'use client';

import React, { useState, useMemo } from 'react';

interface DroppedProspect {
    id: string;
    ruc: string;
    razonSocial: string;
    contacto: string;
    telefono: string;
    lineas: string;
    cargoFijo: string;
    ejecutivo: string;
    motivo: string;
    estadoFinal: string;
    fechaCaida: string;
}

interface Props {
    data: DroppedProspect[];
    userRole?: string;
}

function downloadCSV(rows: DroppedProspect[]) {
    const escape = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`;
    const headers = ['RUC', 'Razón Social', 'Ejecutivo', 'Fecha Caída', 'Motivo', 'Estado Final', 'Contacto', 'Teléfono', 'Líneas', 'Cargo Fijo'];
    const body = rows.map(r =>
        [r.ruc, r.razonSocial, r.ejecutivo, r.fechaCaida, r.motivo, r.estadoFinal, r.contacto, r.telefono, r.lineas, r.cargoFijo]
            .map(escape).join(',')
    );
    const csv = [headers.map(escape).join(','), ...body].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuentas_caidas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function DroppedProspectsTable({ data, userRole }: Props) {
    const [filterEstado, setFilterEstado] = useState<'all' | 'VENTA CAIDA'>('all');
    const [filterEjecutivo, setFilterEjecutivo] = useState('');
    const [searchText, setSearchText] = useState('');

    const isAdminOrSpecial = userRole === 'ADMIN' || userRole === 'SPECIAL';

    const ejecutivos = useMemo(() => {
        const set = new Set<string>();
        data.forEach(d => { if (d.ejecutivo) set.add(d.ejecutivo); });
        return Array.from(set).sort();
    }, [data]);

    const filtered = useMemo(() => {
        return data.filter(item => {
            if (filterEstado === 'VENTA CAIDA' && (item.estadoFinal || '').toUpperCase() !== 'VENTA CAIDA') return false;
            if (filterEjecutivo && item.ejecutivo !== filterEjecutivo) return false;
            if (searchText.trim()) {
                const s = searchText.toLowerCase();
                return (item.ruc || '').includes(s) ||
                    (item.razonSocial || '').toLowerCase().includes(s) ||
                    (item.ejecutivo || '').toLowerCase().includes(s);
            }
            return true;
        });
    }, [data, filterEstado, filterEjecutivo, searchText]);

    return (
        <div className="w-full h-full overflow-hidden flex flex-col px-6 pb-6 gap-4">
            {/* Toolbar */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '12px 16px'
            }}>
                {/* Search */}
                <input
                    type="text"
                    placeholder="🔍 Buscar RUC, empresa, ejecutivo..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    style={{
                        flex: '1', minWidth: '200px', background: '#000', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '12px', outline: 'none'
                    }}
                />

                {/* Filter by estado */}
                <select
                    value={filterEstado}
                    onChange={e => setFilterEstado(e.target.value as any)}
                    style={{
                        background: '#000', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
                        padding: '8px 12px', color: filterEstado === 'VENTA CAIDA' ? '#ef4444' : '#71717a',
                        fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', outline: 'none', cursor: 'pointer'
                    }}
                >
                    <option value="all">Todos los estados</option>
                    <option value="VENTA CAIDA">Solo Venta Caída</option>
                </select>

                {/* Filter by ejecutivo (ADMIN/SPECIAL only) */}
                {isAdminOrSpecial && (
                    <select
                        value={filterEjecutivo}
                        onChange={e => setFilterEjecutivo(e.target.value)}
                        style={{
                            background: '#000', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px',
                            padding: '8px 12px', color: filterEjecutivo ? '#10b981' : '#71717a',
                            fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', outline: 'none', cursor: 'pointer'
                        }}
                    >
                        <option value="">Todos los ejecutivos</option>
                        {ejecutivos.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                )}

                {/* Result count */}
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#71717a', whiteSpace: 'nowrap' }}>
                    {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                </span>

                {/* Download button */}
                <button
                    onClick={() => downloadCSV(filtered)}
                    disabled={filtered.length === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
                        background: filtered.length === 0 ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, #10b981, #059669)',
                        color: filtered.length === 0 ? '#444' : '#fff',
                        fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
                        transition: 'all 0.2s', whiteSpace: 'nowrap'
                    }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Descargar CSV
                </button>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <div className="text-5xl mb-4 opacity-20">🕳️</div>
                    <h3 className="text-xl font-bold text-white/40 uppercase tracking-widest">Sin resultados</h3>
                </div>
            ) : (
                <div className="flex-1 overflow-auto custom-scrollbar rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-zinc-950/80 backdrop-blur-md">
                                <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">RUC</th>
                                <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Razón Social</th>
                                <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Ejecutivo</th>
                                <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Fecha Caída</th>
                                <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Motivo</th>
                                <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Estado Final</th>
                                <th className="px-6 py-4 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Contacto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono font-bold text-white/50 group-hover:text-white transition-colors">{item.ruc}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white uppercase tracking-tight">{item.razonSocial}</span>
                                            <span className="text-[9px] text-white/30 font-bold uppercase">{item.lineas} Líneas • S/ {item.cargoFijo}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold text-emerald-500/80 uppercase">{item.ejecutivo}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-medium text-white/40">{item.fechaCaida}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-[200px] truncate">
                                            <span className="text-[10px] text-white/60 italic">"{item.motivo}"</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-wider border border-red-500/20">
                                            {item.estadoFinal}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-white/70">{item.contacto}</span>
                                            <span className="text-[10px] font-mono text-white/30">{item.telefono}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
}
