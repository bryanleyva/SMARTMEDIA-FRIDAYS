'use client';

import React, { useState, useEffect } from 'react';
import { getTouchedLeads } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    currentUserRole?: string;
    currentUserName?: string;
}

export default function AdminTracking({ currentUserRole, currentUserName }: Props) {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedExecs, setExpandedExecs] = useState<Set<string>>(new Set());
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Date Filter State
    // Default to today's date in YYYY-MM-DD format (local time)
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [filterDate, setFilterDate] = useState<string>(getTodayString());
    const [useDateFilter, setUseDateFilter] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterExecutive, setFilterExecutive] = useState('');

    const loadData = async () => {
        setLoading(true);
        const res = await getTouchedLeads();
        if (res.success && res.data) {
            setLeads(res.data);
        } else {
            AppSwal.fire({ title: 'Error', text: 'Error al cargar datos', icon: 'error', confirmButtonColor: '#ef4444' });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Derived lists for Dropdowns (based on permission)
    const availableExecutives = Array.from(new Set(leads.map(l => {
        // Permission check for list population
        if (currentUserRole === 'SPECIAL') {
            const supervisorName = (l.ejecutivoSupervisor || '').trim().toUpperCase();
            const currentName = (currentUserName || '').trim().toUpperCase();
            if (supervisorName !== currentName) return null;
        }
        return l.ejecutivo;
    }).filter(Boolean))).sort();

    // Filter Logic
    const filteredLeads = leads.filter(l => {
        // PERMISSION CHECK: If SPECIAL (Supervisor), only see their team
        if (currentUserRole === 'SPECIAL') {
            const supervisorName = (l.ejecutivoSupervisor || '').trim().toUpperCase();
            const currentName = (currentUserName || '').trim().toUpperCase();
            if (supervisorName !== currentName) return false;
        }

        // 1. Executive Filter
        if (filterExecutive && l.ejecutivo !== filterExecutive) return false;

        // 2. Status Filter
        if (filterStatus) {
            const currentStatus = l.estado || '';
            if (filterStatus === 'NO INTERESADO') {
                if (!currentStatus.startsWith('NO INTERESADO')) return false;
            } else {
                if (currentStatus !== filterStatus) return false;
            }
        }

        // 3. Date Filter: Prioritize fechaFin (last touch) over fechaInicio (assignment)
        if (!useDateFilter) return true;

        const trackingDate = l.fechaFin || l.fechaInicio;
        if (!trackingDate) return false;

        const normalizeDate = (str: string) => {
            try {
                const datePart = str.split(',')[0].trim();
                const parts = datePart.split(/[/.-]/).map(p => p.trim());
                if (parts.length < 3) return null;

                let d, m, y;
                // Identify Year (4 digits)
                if (parts[2].length === 4) { [d, m, y] = parts; }
                else if (parts[0].length === 4) { [y, m, d] = parts; }
                else return null;

                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            } catch (e) { return null; }
        };

        const leadIsoDate = normalizeDate(trackingDate);
        return leadIsoDate === filterDate;
    });

    // Group by Executive (from filtered results)
    const executives = Array.from(new Set(filteredLeads.map(l => l.ejecutivo).filter(Boolean))).sort();

    // Calculate stats per executive
    const stats = executives.map(exec => {
        const execLeads = filteredLeads.filter(l => l.ejecutivo === exec);

        // Calculate Times
        const getFullDate = (lead: any) => lead.fechaFin || lead.fechaInicio;

        const parseDate = (str: string) => {
            if (!str) return new Date(0);
            try {
                const [dPart, tPart] = str.split(', ');
                const [day, month, year] = dPart.split('/').map(p => p.trim());
                // Handle 12h formats if any, or just ensure HH:mm:ss
                // For now assuming the standard format from our actions
                return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${tPart}`);
            } catch (e) { return new Date(0); }
        };

        const sorted = [...execLeads].sort((a, b) => {
            return parseDate(getFullDate(b)).getTime() - parseDate(getFullDate(a)).getTime();
        });

        const lastActive = sorted.length > 0 ? getFullDate(sorted[0]).split(',')[1]?.trim() : 'N/A';
        const firstActive = sorted.length > 0 ? getFullDate(sorted[sorted.length - 1]).split(',')[1]?.trim() : 'N/A';

        // Status counts
        const statusCounts: Record<string, number> = {};
        execLeads.forEach(l => {
            let s = l.estado || 'PENDIENTE';
            // GROUPING: Treat all "NO INTERESADO - ..." as just "NO INTERESADO"
            if (s.startsWith('NO INTERESADO')) {
                s = 'NO INTERESADO';
            }
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        return {
            name: exec as string,
            total: execLeads.length,
            closed: execLeads.filter(l => l.estado === 'VENTA CERRADA').length,
            leads: execLeads,
            lastActive,
            firstActive,
            statusCounts
        };
    });

    const toggleExec = (name: string) => { // ... existing toggleExec code
        const newSet = new Set(expandedExecs);
        if (newSet.has(name)) newSet.delete(name);
        else newSet.add(name);
        setExpandedExecs(newSet);
    };

    const toggleRow = (ruc: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(ruc)) newSet.delete(ruc);
        else newSet.add(ruc);
        setExpandedRows(newSet);
    };

    const handleExport = async () => {
        if (!filteredLeads || filteredLeads.length === 0) {
            AppSwal.fire({
                title: 'Sin datos',
                text: 'No hay registros en la lista actual para exportar.',
                icon: 'warning'
            });
            return;
        }

        try {
            // Loading indicator
            AppSwal.fire({
                title: 'Generando Excel...',
                text: 'Por favor espere un momento.',
                allowOutsideClick: false,
                didOpen: () => {
                    (AppSwal as any).showLoading();
                }
            });

            // Dynamic import for Browser compatibility with Next.js
            // @ts-ignore
            const ExcelJS = await import('exceljs/dist/exceljs.min.js');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Seguimiento');

            // Headers
            const headerNames = [
                "RUC", "RAZON SOCIAL", "OPERADOR ACTUAL", "REPRESENTANTE", "DNI", "TELEFONO",
                "CORREO", "LINEAS", "SEGMENTO", "DISTRITO", "PROVINCIA",
                "DIRECCION", "ESTADO", "ULTIMA ATENCION", "EJECUTIVO", "OBSERVACIONES"
            ];
            worksheet.addRow(headerNames);

            // Style Headers
            const headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell: any) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });

            // Add Data
            filteredLeads.forEach(l => {
                const row = worksheet.addRow([
                    l.ruc || "",
                    l.razonSocial || "",
                    l.operadorActual || "",
                    l.contacto || "",
                    l.dni || "",
                    l.telefono || "",
                    l.correo || "",
                    l.lineas || "0",
                    l.segmento || "",
                    l.distrito || "",
                    l.provincia || "",
                    l.direccion || "",
                    l.estado || "PENDIENTE",
                    l.fechaInicio || "",
                    l.ejecutivo || "",
                    l.observacion || ""
                ]);

                row.eachCell({ includeEmpty: true }, (cell: any) => {
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                });
            });

            // Auto-width
            worksheet.columns.forEach((column: any) => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell: any) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) maxLength = columnLength;
                });
                column.width = Math.min(Math.max(12, maxLength + 2), 50);
            });

            // --- EXECUTIVE PROGRESS SHEET ---
            const progressSheet = workbook.addWorksheet('Reporte Avance Ejecutivos');

            // 1. Get all unique statuses in the current view to create dynamic columns
            const allStates = Array.from(new Set(filteredLeads.map(l => {
                let s = l.estado || "PENDIENTE";
                if (s.startsWith('NO INTERESADO')) return 'NO INTERESADO';
                return s;
            }))).sort();

            // 2. Define Headers
            const progHeaders = ["EJECUTIVO", "INICIO ACTIVIDAD", "ULTIMA ATENCION", "TOTAL GESTIONES", ...allStates];
            progressSheet.addRow(progHeaders);

            // Style Progress Headers
            const progHeaderRow = progressSheet.getRow(1);
            progHeaderRow.eachCell((cell: any) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            // 3. Add Data from 'stats' variable
            stats.forEach(s => {
                const rowData = [
                    s.name,
                    s.firstActive,
                    s.lastActive,
                    s.total
                ];

                // Add counts for each state
                allStates.forEach(state => {
                    rowData.push(s.statusCounts[state] || 0);
                });

                const row = progressSheet.addRow(rowData);
                row.eachCell((cell: any) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { horizontal: 'center' };
                });
                // Left align the name
                row.getCell(1).alignment = { horizontal: 'left' };
            });

            // Auto-width for progress sheet
            progressSheet.columns.forEach((column: any) => {
                column.width = 20;
            });
            progressSheet.getColumn(1).width = 35;

            // --- SUMMARY SHEET (Existing) ---
            const summarySheet = workbook.addWorksheet('Resumen General');

            // 📊 1. Summary by Status
            summarySheet.addRow(["REPORTE DE ESTADOS", "CANTIDAD"]);
            const statusCounts: Record<string, number> = {};
            filteredLeads.forEach(l => {
                const s = l.estado || "PENDIENTE";
                statusCounts[s] = (statusCounts[s] || 0) + 1;
            });

            const headerS1 = summarySheet.getRow(1);
            headerS1.eachCell((c: any) => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
                c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            Object.entries(statusCounts).forEach(([st, count]) => {
                const r = summarySheet.addRow([st, count]);
                r.eachCell((c: any) => {
                    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            summarySheet.addRow([]); // Gap

            // 👤 2. Summary by Executive
            summarySheet.addRow(["EJECUTIVO", "TOTAL GESTIONES"]);
            const execCounts: Record<string, number> = {};
            filteredLeads.forEach(l => {
                const e = l.ejecutivo || "SIN EJECUTIVO";
                execCounts[e] = (execCounts[e] || 0) + 1;
            });

            const headerS2 = summarySheet.getRow(summarySheet.rowCount);
            headerS2.eachCell((c: any) => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Blue-500
                c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            Object.entries(execCounts).forEach(([ex, count]) => {
                const r = summarySheet.addRow([ex, count]);
                r.eachCell((c: any) => {
                    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            summarySheet.getColumn(1).width = 35;
            summarySheet.getColumn(2).width = 20;

            // EXPORT
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Seguimiento_Ryders_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            AppSwal.close();

        } catch (error) {
            console.error('Export error:', error);
            AppSwal.fire({ title: 'Error', text: 'No se pudo generar el Excel', icon: 'error' });
        }
    };

    if (loading) return <div className="text-white text-center p-10 animate-fade-in">Cargando reporte...</div>;

    return (
        <div className="w-full space-y-8 animate-in fade-in" style={{ paddingBottom: '80px' }}>

            {/* HEADER SECTION */}
            <div className="flex flex-col gap-10" style={{ marginBottom: '5rem' }}>
                {/* ROW 1: TITLE */}
                <div className="border-b border-zinc-800 pb-6">
                    <h2 className="text-4xl font-extrabold text-emerald-400 flex items-center gap-4">
                        <span style={{ fontSize: '2.5rem' }}>📊</span> SEGUIMIENTO DE EQUIPO
                    </h2>
                    <p className="text-gray-400 text-base mt-2 ml-14">Monitoreo de gestión y control de calidad en tiempo real</p>
                </div>

                {/* ROW 2: STATS & FILTERS */}
                <div className="flex flex-wrap items-end justify-between" style={{ gap: '3rem' }}>
                    {/* Overall Stats - Large Gap & Shadows */}
                    {stats.length > 0 && (
                        <div className="flex" style={{ gap: '4rem' }}>
                            <div className="card-stat-premium" style={{ padding: '2.5rem 3rem', minWidth: '240px', boxShadow: '0 15px 35px -5px rgba(0,0,0,0.4)' }}>
                                <span className="text-emerald-500/60" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.25em', marginBottom: '0.75rem', display: 'block' }}>Total Gestiones</span>
                                <div className="stat-value-huge text-white" style={{ fontSize: '4.8rem', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.5))' }}>{filteredLeads.length}</div>
                            </div>
                            <div className="card-stat-premium" style={{ padding: '2.5rem 3rem', minWidth: '240px', boxShadow: '0 15px 35px -5px rgba(0,0,0,0.4)' }}>
                                <span className="text-emerald-500/60" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.25em', marginBottom: '0.75rem', display: 'block' }}>Ejecutivos Activos</span>
                                <div className="stat-value-huge text-emerald-400" style={{ fontSize: '4.8rem', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.5))' }}>{stats.length}</div>
                            </div>
                        </div>
                    )}

                    {/* Filters Box - Using Native CSS Premium Classes */}
                    <div className="filter-panel-premium">
                        {/* Status Filter */}
                        <div className="flex flex-col" style={{ gap: '0.75rem' }}>
                            <label className="text-emerald-500/80" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem' }}>Estado de Gestión</label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="custom-select-premium"
                                    style={{ width: '280px', colorScheme: 'dark' }}
                                >
                                    <option value="" className="bg-zinc-900 text-white">TODOS LOS ESTADOS</option>
                                    <option value="ENVIADO A PROSPECTOS" className="bg-zinc-900 text-white">ENVIADO A DEALS</option>
                                    <option value="VOLVER A LLAMAR" className="bg-zinc-900 text-white">VOLVER A LLAMAR</option>
                                    <option value="NO INTERESADO" className="bg-zinc-900 text-white">NO INTERESADO</option>
                                    <option value="TELEFONO EQUIVOCADO" className="bg-zinc-900 text-white">TELEFONO EQUIVOCADO</option>
                                    <option value="NO CONTESTA" className="bg-zinc-900 text-white">NO CONTESTA</option>
                                    <option value="RUC DADO DE BAJA" className="bg-zinc-900 text-white">RUC DADO DE BAJA</option>
                                    <option value="NO CALIFICA" className="bg-zinc-900 text-white">NO CALIFICA</option>
                                    <option value="POSIBLE FRAUDE" className="bg-zinc-900 text-white">POSIBLE FRAUDE</option>
                                </select>
                                <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: '0.4', fontSize: '0.75rem' }}>
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* Executive Filter */}
                        <div className="flex flex-col" style={{ gap: '0.75rem' }}>
                            <label className="text-emerald-500/80" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem' }}>Ejecutivo de Cuenta</label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={filterExecutive}
                                    onChange={(e) => setFilterExecutive(e.target.value)}
                                    className="custom-select-premium"
                                    style={{ width: '280px', colorScheme: 'dark' }}
                                >
                                    <option value="" className="bg-zinc-900 text-white">TODOS LOS EJECUTIVOS</option>
                                    {availableExecutives.map((exec, i) => (
                                        <option key={i} value={exec as string} className="bg-zinc-900 text-white">{exec}</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: '0.4', fontSize: '0.75rem' }}>
                                    ▼
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '4rem', width: '1px', backgroundColor: 'rgba(63, 63, 70, 0.8)', margin: '0 0.5rem' }}></div>

                        {/* Date Filter */}
                        <div className="flex flex-col" style={{ gap: '0.75rem' }}>
                            <label className="text-emerald-500/80" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem' }}>Fecha de Gestión</label>
                            <div className="flex items-center" style={{ gap: '1.25rem' }}>
                                <label className="switch-premium">
                                    <input
                                        type="checkbox"
                                        id="useFilter"
                                        checked={useDateFilter}
                                        onChange={(e) => setUseDateFilter(e.target.checked)}
                                    />
                                    <span className="slider-premium"></span>
                                </label>

                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        disabled={!useDateFilter}
                                        className="custom-select-premium"
                                        style={{
                                            width: 'auto',
                                            paddingRight: '1rem',
                                            opacity: !useDateFilter ? '0.2' : '1',
                                            cursor: !useDateFilter ? 'not-allowed' : 'pointer'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ height: '4rem', width: '1px', backgroundColor: 'rgba(63, 63, 70, 0.8)', margin: '0 0.5rem' }}></div>

                        {/* Export Button */}
                        <div className="flex flex-col" style={{ gap: '0.75rem' }}>
                            <label className="text-emerald-500/80" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem' }}>Exportar</label>
                            <button
                                onClick={handleExport}
                                className="refresh-btn-premium"
                                style={{
                                    width: '180px',
                                    fontSize: '0.9rem',
                                    gap: '0.8rem',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    border: 'none',
                                    color: 'white'
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>📊</span> EXPORTAR EXCEL
                            </button>
                        </div>

                        {/* Refresh Button */}
                        <div className="flex flex-col" style={{ gap: '0.75rem' }}>
                            <label style={{ fontSize: '10px', color: 'transparent', textTransform: 'uppercase', userSelect: 'none' }}>Spacer</label>
                            <button
                                onClick={loadData}
                                className="refresh-btn-premium"
                                title="Actualizar datos"
                            >
                                <span className="icon">↻</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* EXECUTIVES LIST */}
            <div className="executives-list">
                {stats.map((exec, i) => (
                    <div key={exec.name} className="card-executive" style={{ animationDelay: `${i * 100}ms` }}>
                        {/* LEVEL 1: EXECUTIVE HEADER */}
                        <div
                            onClick={() => toggleExec(exec.name)}
                            className={`card-header-premium ${expandedExecs.has(exec.name) ? 'border-b border-zinc-800 bg-zinc-800/50' : ''}`}
                            style={{ padding: '1.5rem 2rem' }}
                        >
                            <div className="flex items-center" style={{ gap: '1.5rem' }}>
                                <div className={`executive-avatar ${expandedExecs.has(exec.name) ? 'bg-emerald-900 text-emerald-400 border border-emerald-700' : 'bg-black text-gray-500 border border-zinc-800'}`}>
                                    {exec.name.charAt(0)}
                                </div>
                                <div style={{ gap: '0.8rem', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: 'white', fontWeight: '900', fontSize: '1.8rem', display: 'block', letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{exec.name}</span>
                                    <div className="flex flex-col" style={{ gap: '1.2rem' }}>
                                        <div className="flex items-center" style={{ gap: '1rem' }}>
                                            <span className="bg-zinc-900/80 px-4 py-1.5 rounded-lg text-zinc-400 border border-zinc-800 text-[11px] font-black tracking-[0.15em] uppercase shadow-inner">
                                                {exec.leads[0]?.ejecutivoCargo || 'EJECUTIVO DE VENTAS'}
                                            </span>
                                            <div className="flex items-center" style={{ gap: '0.6rem' }}>
                                                <div className="activity-pilot shadow-lg" style={{ background: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.4rem 1.2rem', borderRadius: '12px' }}>
                                                    <span style={{ color: 'rgba(113, 113, 122, 0.8)', fontSize: '10px', fontWeight: '800', marginRight: '0.5rem' }}>LOG IN:</span>
                                                    <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '900', letterSpacing: '0.02em' }}>{exec.firstActive}</span>
                                                </div>
                                                <div className="activity-pilot shadow-lg" style={{ background: 'rgba(79, 70, 229, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.4rem 1.2rem', borderRadius: '12px' }}>
                                                    <span style={{ color: 'rgba(113, 113, 122, 0.8)', fontSize: '10px', fontWeight: '800', marginRight: '0.5rem' }}>LAST HIT:</span>
                                                    <span style={{ color: '#6366f1', fontSize: '14px', fontWeight: '900', letterSpacing: '0.02em' }}>{exec.lastActive}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* STATUS GRID PREMIUM */}
                                        <div className="flex flex-wrap" style={{ gap: '0.5rem' }}>
                                            {Object.entries(exec.statusCounts).map(([status, count]) => {
                                                const isVenta = status === 'VENTA CERRADA';
                                                const isNo = status === 'NO INTERESADO' || status === 'RUC DADO DE BAJA' || status === 'NO CALIFICA' || status === 'TELEFONO EQUIVOCADO';
                                                const isWarning = status === 'VOLVER A LLAMAR' || status === 'ENVIADO A PROSPECTOS';

                                                let bgColor = 'rgba(39, 39, 42, 0.5)';
                                                let borderColor = 'rgba(63, 63, 70, 0.3)';
                                                let textColor = '#a1a1aa';
                                                let accentColor = '#3f3f46';

                                                if (isVenta) {
                                                    bgColor = 'rgba(6, 78, 59, 0.2)';
                                                    borderColor = 'rgba(16, 185, 129, 0.3)';
                                                    textColor = '#10b981';
                                                    accentColor = '#10b981';
                                                } else if (isNo) {
                                                    bgColor = 'rgba(127, 29, 29, 0.2)';
                                                    borderColor = 'rgba(239, 68, 68, 0.3)';
                                                    textColor = '#ef4444';
                                                    accentColor = '#ef4444';
                                                } else if (isWarning) {
                                                    bgColor = 'rgba(120, 53, 15, 0.2)';
                                                    borderColor = 'rgba(245, 158, 11, 0.3)';
                                                    textColor = '#f59e0b';
                                                    accentColor = '#f59e0b';
                                                }

                                                return (
                                                    <div
                                                        key={status}
                                                        className="status-chip-premium group transition-all"
                                                        style={{
                                                            background: bgColor,
                                                            border: `1px solid ${borderColor}`,
                                                            padding: '0.6rem 1.2rem',
                                                            borderRadius: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '1rem',
                                                            minWidth: '180px',
                                                            justifyContent: 'space-between'
                                                        }}
                                                    >
                                                        <span style={{ color: textColor, fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{status}</span>
                                                        <span style={{
                                                            background: accentColor,
                                                            color: 'white',
                                                            padding: '0.2rem 0.6rem',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                            fontWeight: '950',
                                                            boxShadow: '0 4px 10px -2px rgba(0,0,0,0.5)'
                                                        }}>
                                                            {count}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center" style={{ gap: '2.5rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ display: 'block', fontSize: '3.6rem', fontWeight: '950', color: 'white', letterSpacing: '-0.05em', lineHeight: '1', filter: 'drop-shadow(0 0 15px rgba(16,185,129,0.3))' }}>{exec.total}</span>
                                    <span style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: '900', marginTop: '0.2rem', display: 'block' }}>Gestiones</span>
                                </div>
                                <div className={`w-14 h-14 flex items-center justify-center rounded-full border border-zinc-700 text-gray-400 transition-all duration-300 ${expandedExecs.has(exec.name) ? 'transform rotate-180 bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border-emerald-400' : 'bg-zinc-900 hover:border-gray-500 hover:text-white hover:bg-zinc-800'}`}>
                                    ▼
                                </div>
                            </div>
                        </div>

                        {/* LEVEL 2: LEAD LIST */}
                        {expandedExecs.has(exec.name) && (
                            <div className="bg-zinc-950" style={{ padding: '2rem' }}>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="text-gray-500 text-xs uppercase border-b border-zinc-800">
                                            <tr>
                                                <th className="px-6 py-4 font-medium tracking-wider">Empresa / RUC</th>
                                                <th className="px-6 py-4 font-medium tracking-wider">Estado</th>
                                                <th className="px-6 py-4 font-medium tracking-wider text-right">Fecha/Gestión</th>
                                                <th className="px-6 py-4 text-right font-medium tracking-wider">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800">
                                            {exec.leads.map(lead => (
                                                <React.Fragment key={lead.ruc}>
                                                    <tr className="hover-bg-zinc-800 transition-all group">
                                                        <td className="px-6 py-4 font-medium text-gray-300 group-hover:text-white transition-colors">
                                                            <div className="text-base">{lead.razonSocial}</div>
                                                            <div className="text-xs text-gray-500 font-mono mt-1 opacity-70 group-hover:opacity-100">{lead.ruc}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${lead.estado === 'VENTA CERRADA' ? 'bg-green-900/40 text-green-400 border-green-900' :
                                                                lead.estado === 'NO INTERESADO' ? 'bg-red-900/40 text-red-400 border-red-900' :
                                                                    'bg-blue-900/40 text-blue-400 border-blue-900'
                                                                }`}>
                                                                {lead.estado || 'PENDIENTE'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-gray-500 font-mono text-xs">
                                                            {lead.fechaFin || lead.fechaInicio || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleRow(lead.ruc); }}
                                                                className={`text-[10px] px-3 py-1.5 rounded-md border transition-all ${expandedRows.has(lead.ruc)
                                                                    ? 'bg-emerald-900 text-emerald-100 border-emerald-500 shadow-lg shadow-emerald-900/20'
                                                                    : 'bg-zinc-900 text-gray-400 border-zinc-700 hover:border-gray-500 hover:text-white hover:bg-zinc-800'
                                                                    }`}
                                                            >
                                                                {expandedRows.has(lead.ruc) ? 'Cerrar' : 'Ver Ficha'}
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* LEVEL 3: LEAD DETAIL */}
                                                    {expandedRows.has(lead.ruc) && (
                                                        <tr className="bg-zinc-900 animate-slide-down">
                                                            <td colSpan={4} className="p-0">
                                                                <div className="relative overflow-hidden m-4 rounded-xl border border-zinc-800 bg-black/40">
                                                                    {/* Decorative Side Bar */}
                                                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'linear-gradient(to bottom, #10b981, #064e3b)' }}></div>

                                                                    <div className="p-6 pl-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', fontSize: '14px' }}>

                                                                        {/* Col 1: Observations (Priority) */}
                                                                        <div className="md:col-span-3 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
                                                                            <span className="block text-xs font-bold text-emerald-500 mb-2 uppercase tracking-widest">Observación del Ejecutivo</span>
                                                                            <p className="text-white text-lg italic leading-relaxed">"{lead.observacion || 'Sin observaciones registradas'}"</p>

                                                                            <div className="mt-4 flex gap-6 text-xs text-gray-500 pt-4 border-t border-zinc-800">
                                                                                <div>
                                                                                    <span className="uppercase tracking-wider font-bold mr-2">¿Desea Info?</span>
                                                                                    <span className={`font-bold ${lead.deseaInfo === 'SI' ? 'text-emerald-400' : 'text-red-400'}`}>{lead.deseaInfo}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="uppercase tracking-wider font-bold mr-2">Agendado:</span>
                                                                                    <span className="text-yellow-400">{lead.agendamiento || 'No'}</span>
                                                                                </div>
                                                                                <div style={{ marginLeft: '1.5rem' }}>
                                                                                    <span className="uppercase tracking-wider font-bold mr-2 text-yellow-500">Operador:</span>
                                                                                    <span className="text-white font-bold">{lead.operadorActual || '-'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Col 2: Company Data */}
                                                                        <div>
                                                                            <h4 className="text-gray-500 text-xs uppercase font-bold mb-4 tracking-widest border-b border-zinc-800 pb-2">Datos Empresa</h4>
                                                                            <div className="space-y-3">
                                                                                <div>
                                                                                    <span className="block text-xs text-gray-500">Dirección</span>
                                                                                    <div className="text-gray-300">{lead.direccion || '-'}</div>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    <div>
                                                                                        <span className="block text-xs text-gray-500">Distrito</span>
                                                                                        <div className="text-gray-300">{lead.distrito || '-'}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="block text-xs text-gray-500">Provincia</span>
                                                                                        <div className="text-gray-300">{lead.provincia || '-'}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block text-xs text-gray-500">Segmento / Líneas</span>
                                                                                    <div className="text-gray-300">{lead.segmento || '-'} <span className="text-zinc-600">|</span> {lead.lineas || '0'} líneas</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Col 3: Contact Data */}
                                                                        <div>
                                                                            <h4 className="text-gray-500 text-xs uppercase font-bold mb-4 tracking-widest border-b border-zinc-800 pb-2">Datos Contacto</h4>
                                                                            <div className="space-y-3">
                                                                                <div>
                                                                                    <span className="block text-xs text-gray-500">Representante</span>
                                                                                    <div className="text-gray-300 font-medium">{lead.contacto || '-'}</div>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block text-xs text-gray-500">DNI</span>
                                                                                    <div className="text-gray-300">{lead.dni || '-'}</div>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block text-xs text-gray-500">Teléfonos</span>
                                                                                    <div className="text-emerald-400 font-mono tracking-wide">{lead.telefono || '-'}</div>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block text-xs text-gray-500">Correo</span>
                                                                                    <div className="text-gray-300 break-all">{lead.correo || '-'}</div>
                                                                                </div>
                                                                            </div>
                                                                        </div>


                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {
                executives.length === 0 && (
                    <div className="text-center py-20 text-gray-500 italic border border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
                        <div className="text-4xl mb-4 opacity-20">📅</div>
                        No hay gestiones registradas para la fecha seleccionada.
                    </div>
                )
            }
        </div>
    );
}
