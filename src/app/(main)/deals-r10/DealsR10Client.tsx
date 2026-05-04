'use client';

import { useState, useTransition } from 'react';
import SubirVentaModalR10 from '@/components/SubirVentaModalR10';
import DealDetailModalR10 from '@/components/DealDetailModalR10';
import CulminarVentaModalR10 from '@/components/CulminarVentaModalR10';
import DropDealModalR10 from '@/components/DropDealModalR10';
import { getInteresadosR10 } from '@/app/actions/leads-r10';

interface Props {
    ejecutivo: string;
    userRole: string;
    initialData: any[];
}

export default function DealsR10Client({ ejecutivo, userRole, initialData }: Props) {
    const [data, setData] = useState(initialData);
    const [modalOpen, setModalOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [isPending, startTransition] = useTransition();

    const [selectedVenta, setSelectedVenta] = useState<any | null>(null);
    const [culminarOpen, setCulminarOpen] = useState(false);
    const [dropOpen, setDropOpen] = useState(false);

    const reload = () => {
        startTransition(async () => {
            const fresh = await getInteresadosR10(ejecutivo, userRole, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
            setData(fresh);
        });
    };

    const clearFilters = () => {
        setStartDate(''); setEndDate(''); setSearch('');
        startTransition(async () => {
            const fresh = await getInteresadosR10(ejecutivo, userRole);
            setData(fresh);
        });
    };

    // Filtro client-side por búsqueda (instantáneo)
    const filtered = data
        .filter(d => d.estado === 'INTERESADO')
        .filter(d => {
            if (!search.trim()) return true;
            const s = search.toLowerCase().trim();
            return (d.rucDni || '').toLowerCase().includes(s) ||
                   (d.nombresApellidos || '').toLowerCase().includes(s);
        });

    // Stats
    const totalLineas = filtered.reduce((sum, i) => sum + (i.cantidadLineas || 0), 0);

    return (
        <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* HEADER */}
            <div style={{
                background: 'rgba(24,24,27,0.4)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem 1.25rem',
                display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '6px', height: '40px', background: '#10b981', borderRadius: '3px', boxShadow: '0 0 20px #10b981' }} />
                    <div>
                        <h2 style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                            Deals R10
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                            Pipeline de interesados · {filtered.length} {filtered.length === 1 ? 'venta' : 'ventas'} · {totalLineas} {totalLineas === 1 ? 'línea' : 'líneas'}
                        </p>
                    </div>
                </div>
                <button onClick={() => setModalOpen(true)} style={{
                    padding: '0.7rem 1.4rem', background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none', borderRadius: '10px', color: 'white', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.9rem',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                    <span style={{ fontSize: '1.1rem' }}>+</span> Ingresar Venta
                </button>
            </div>

            {/* FILTROS */}
            <div style={{
                background: 'rgba(24,24,27,0.4)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.85rem',
                display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
            }}>
                <input
                    type="text"
                    placeholder="🔍  Buscar por RUC/DNI o nombre..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: '220px', padding: '0.55rem 0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.9rem' }}
                />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Desde:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }} />
                <label style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Hasta:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem', colorScheme: 'dark' }} />
                <button onClick={reload} disabled={isPending} style={{ padding: '0.5rem 1rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Filtrar</button>
                <button onClick={clearFilters} disabled={isPending} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>Limpiar</button>
            </div>

            {/* COLUMNA INTERESADO REDISEÑADA */}
            <div style={{
                background: 'linear-gradient(180deg, rgba(251,191,36,0.04) 0%, rgba(24,24,27,0.4) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(251,191,36,0.15)',
                borderRadius: '16px', padding: '1.25rem',
                flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Header de la columna */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingBottom: '1rem', borderBottom: '1px solid rgba(251,191,36,0.15)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 12px #fbbf24' }} />
                        <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            Interesado
                        </span>
                        <span style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800 }}>
                            {filtered.length}
                        </span>
                    </div>
                    {search && (
                        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                            Filtrado por: <strong style={{ color: 'white' }}>"{search}"</strong>
                        </span>
                    )}
                </div>

                {/* Grid de cards */}
                {filtered.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem 1rem' }}>
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(251,191,36,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📋</div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'white', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                                {search ? 'Sin resultados' : 'No hay ventas interesadas'}
                            </p>
                            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
                                {search ? 'Intenta con otra búsqueda' : 'Haz clic en "Ingresar Venta" para registrar la primera'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '0.85rem',
                    }}>
                        {filtered.map(v => (
                            <DealCard key={v.ventaId} venta={v} onClick={() => setSelectedVenta(v)} />
                        ))}
                    </div>
                )}
            </div>

            <SubirVentaModalR10
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={reload}
                ejecutivo={ejecutivo}
            />
            <DealDetailModalR10
                isOpen={!!selectedVenta && !culminarOpen && !dropOpen}
                onClose={() => setSelectedVenta(null)}
                venta={selectedVenta}
                onCulminar={() => setCulminarOpen(true)}
                onDarDeBaja={() => setDropOpen(true)}
            />
            {selectedVenta && (
                <CulminarVentaModalR10
                    isOpen={culminarOpen}
                    onClose={() => setCulminarOpen(false)}
                    onSaved={() => { setSelectedVenta(null); setCulminarOpen(false); reload(); }}
                    ventaId={selectedVenta.ventaId}
                    nombreCliente={selectedVenta.nombresApellidos}
                />
            )}
            {selectedVenta && (
                <DropDealModalR10
                    isOpen={dropOpen}
                    onClose={() => setDropOpen(false)}
                    onSaved={() => { setSelectedVenta(null); setDropOpen(false); reload(); }}
                    ventaId={selectedVenta.ventaId}
                    nombreCliente={selectedVenta.nombresApellidos}
                />
            )}
        </div>
    );
}

function DealCard({ venta, onClick }: { venta: any; onClick: () => void }) {
    const tiposVenta = Array.from(new Set(venta.lineas.map((l: any) => l.tipoVenta))) as string[];
    const planes = venta.lineas.map((l: any) => l.plan).filter(Boolean);

    return (
        <div
            onClick={onClick}
            style={{
                padding: '1rem',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)';
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(16,185,129,0.12)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Barra lateral de color */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#fbbf24' }} />

            {/* Header: ID + fecha */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ color: '#fbbf24', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                    DEAL #{venta.ventaId}
                </span>
                <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                    {venta.fechaIngreso?.split(',')[0]}
                </span>
            </div>

            {/* Nombre cliente */}
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem', lineHeight: 1.3 }}>
                {venta.nombresApellidos}
            </div>

            {/* RUC/DNI */}
            <div style={{ color: '#9ca3af', fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: '0.85rem' }}>
                {venta.rucDni}
            </div>

            {/* Badges: canal y tipos de venta */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                    {venta.canalVenta}
                </span>
                {tiposVenta.map((t) => (
                    <span key={t} style={{
                        background: t === 'PORTABILIDAD' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                        color: t === 'PORTABILIDAD' ? '#c4b5fd' : '#6ee7b7',
                        padding: '0.15rem 0.6rem', borderRadius: '999px',
                        fontSize: '0.7rem', fontWeight: 700,
                    }}>{t}</span>
                ))}
            </div>

            {/* Footer: líneas y planes */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>{venta.cantidadLineas}</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                        {venta.cantidadLineas > 1 ? 'líneas' : 'línea'}
                    </span>
                </div>
                <div style={{ color: '#d1d5db', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {planes[0]}{planes.length > 1 && ` +${planes.length - 1}`}
                </div>
            </div>
        </div>
    );
}