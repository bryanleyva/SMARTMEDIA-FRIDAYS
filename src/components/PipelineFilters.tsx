'use client';

import React from 'react';

interface FilterProps {
    role: string;
    onFilterChange: (filters: any) => void;
    onExport?: () => void;
    teamMembers?: { user: string, name: string }[];
}

export default function PipelineFilters({ role, onFilterChange, onExport, teamMembers = [] }: FilterProps) {
    const [localFilters, setLocalFilters] = React.useState({
        startDate: '',
        endDate: '',
        filterUser: 'ALL',
        search: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFilters = { ...localFilters, [name]: value };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const isSupervisorOrAdmin = role === 'SPECIAL' || role === 'ADMIN';

    return (
        <div className="px-6 py-4" style={{ backgroundColor: '#050505', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="filter-panel-sub">
                {/* Date Filters */}
                <div className="flex flex-col" style={{ gap: '0.5rem' }}>
                    <label style={{ fontSize: '9px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem' }}>Rango de Fecha</label>
                    <div className="flex items-center" style={{ gap: '0.75rem' }}>
                        <input
                            type="date"
                            name="startDate"
                            value={localFilters.startDate}
                            onChange={handleChange}
                            className="custom-input-premium"
                            style={{ width: '150px' }}
                        />
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: '900' }}>—</span>
                        <input
                            type="date"
                            name="endDate"
                            value={localFilters.endDate}
                            onChange={handleChange}
                            className="custom-input-premium"
                            style={{ width: '150px' }}
                        />
                    </div>
                </div>

                {/* Executive Filter - SPECIAL / ADMIN */}
                {isSupervisorOrAdmin && (
                    <div className="flex flex-col" style={{ gap: '0.5rem' }}>
                        <label style={{ fontSize: '9px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem' }}>Ejecutivo de Cuenta</label>
                        <div style={{ position: 'relative' }}>
                            <select
                                name="filterUser"
                                value={localFilters.filterUser}
                                onChange={handleChange}
                                className="custom-select-premium"
                                style={{ width: '450px', colorScheme: 'dark' }}
                            >
                                <option value="ALL" className="bg-zinc-950 text-white">TODOS LOS EJECUTIVOS</option>
                                {teamMembers.map((m, idx) => (
                                    <option key={idx} value={m.user} className="bg-zinc-950 text-white">{m.name || m.user}</option>
                                ))}
                            </select>
                            <div style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: '0.4', fontSize: '0.7rem' }}>
                                ▼
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Filter - SPECIAL / ADMIN */}
                {isSupervisorOrAdmin && (
                    <div className="flex flex-col" style={{ gap: '0.5rem', flex: 1, minWidth: '250px' }}>
                        <label style={{ fontSize: '9px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem' }}>Búsqueda de Empresa</label>
                        <input
                            type="text"
                            name="search"
                            placeholder="RUC o Razón Social..."
                            value={localFilters.search}
                            onChange={handleChange}
                            className="custom-input-premium"
                            style={{ width: '100%', maxWidth: '400px' }}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-end" style={{ gap: '1rem', height: '100%', paddingTop: '1.2rem' }}>
                    <button
                        onClick={() => {
                            const reset = { startDate: '', endDate: '', filterUser: 'ALL', search: '' };
                            setLocalFilters(reset);
                            onFilterChange(reset);
                        }}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '10px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            letterSpacing: '1px'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                        Limpiar Filtros
                    </button>

                    <button
                        onClick={() => onFilterChange(localFilters)}
                        className="refresh-btn-premium"
                        style={{ width: '3.5rem', height: '3rem', borderRadius: '1rem' }}
                    >
                        <span className="icon">↻</span>
                    </button>

                    {isSupervisorOrAdmin && onExport && (
                        <button
                            onClick={onExport}
                            style={{
                                backgroundColor: '#10b981',
                                border: 'none',
                                color: 'black',
                                fontSize: '10px',
                                fontWeight: 950,
                                textTransform: 'uppercase',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                letterSpacing: '1px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#34d399'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <span>📥</span> Exportar Excel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
