'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PipelineFilters from './PipelineFilters';
import ProspectTableView from './ProspectTableView';
import { AppSwal } from '@/lib/sweetalert';
import { updatePipelineStatus, getPipelineData, updatePipelineLead, getDroppedProspects } from '@/app/actions/leads';
import SubirVentaModal from './SubirVentaModal';
import DropProspectModal from './DropProspectModal';
import LeadDataModal from './LeadDataModal';
import DroppedProspectsTable from './DroppedProspectsTable';

interface Props {
    leads: any[];
    userRole: string;
    userName: string;
    teamMembers?: { user: string, name: string }[];
}

const COLUMNS = [
    {
        id: 'INTERESADO',
        label: 'Interesado',
        percent: '25%',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.05)',
        glow: 'rgba(245, 158, 11, 0.2)'
    },
    {
        id: 'PROPUESTA ENVIADA',
        label: 'Propuesta',
        percent: '50%',
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.05)',
        glow: 'rgba(59, 130, 246, 0.2)'
    },
    {
        id: 'NEGOCIACION PARA CIERRE',
        label: 'Negociación',
        percent: '75%',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.05)',
        glow: 'rgba(16, 185, 129, 0.2)'
    },
    {
        id: 'SI VERBAL',
        label: 'Si Verbal',
        percent: '90%',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.05)',
        glow: 'rgba(139, 92, 246, 0.2)'
    },
    {
        id: 'NUEVO INGRESO',
        label: 'Ingresado',
        percent: '100%',
        color: '#6366f1',
        bg: 'rgba(99, 102, 241, 0.05)',
        glow: 'rgba(99, 102, 241, 0.2)'
    },
];

export default function ProspectPipelineBoard({ leads: initialLeads, userRole, userName, teamMembers = [] }: Props) {
    const [leads, setLeads] = useState(initialLeads);
    const [expandedLead, setExpandedLead] = useState<string | null>(null);
    const [draggedLead, setDraggedLead] = useState<any | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentDragY, setCurrentDragY] = useState<number | null>(null);
    const [viewHeight, setViewHeight] = useState(0);
    const [viewMode, setViewMode] = useState<'board' | 'table' | 'dropped'>('board');
    const [currentFilters, setCurrentFilters] = useState<any>({});
    const [droppedLeads, setDroppedLeads] = useState<any[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setViewHeight(window.innerHeight);
            const handleResize = () => setViewHeight(window.innerHeight);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Global drag listener for 100% reliable tracking
    useEffect(() => {
        if (!draggedLead) return;
        const handleGlobalDrag = (e: DragEvent) => {
            setCurrentDragY(e.clientY);
        };
        window.addEventListener('dragover', handleGlobalDrag);
        return () => window.removeEventListener('dragover', handleGlobalDrag);
    }, [draggedLead]);

    // State for inline editing
    const [editData, setEditData] = useState<{ id: string, ruc: string, lineas: string, cargoFijo: string, observaciones: string } | null>(null);

    // State for Subir Venta Modal
    const [isSubirVentaOpen, setIsSubirVentaOpen] = useState(false);
    const [selectedLeadForSale, setSelectedLeadForSale] = useState<any>(null);

    // State for Drop Prospect Modal
    const [isDropModalOpen, setIsDropModalOpen] = useState(false);
    const [selectedLeadForDrop, setSelectedLeadForDrop] = useState<any>(null);

    // State for Table Edit Modal
    const [isTableEditOpen, setIsTableEditOpen] = useState(false);
    const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<any>(null);

    // State for Lead Data Modal
    const [isLeadDataModalOpen, setIsLeadDataModalOpen] = useState(false);
    const [currentLeadRuc, setCurrentLeadRuc] = useState('');

    // State for copy feedback
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = (text: string, fieldId: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    useEffect(() => {
        setLeads(initialLeads);
    }, [initialLeads]);

    const handleFilterChange = async (filters: any) => {
        setIsLoading(true);
        setCurrentFilters(filters);
        try {
            if (viewMode === 'dropped') {
                const freshDropped = await getDroppedProspects(userName, { role: userRole });
                setDroppedLeads(freshDropped);
            } else {
                const fresh = await getPipelineData(userName, {
                    role: userRole,
                    ...filters
                });
                setLeads(fresh);
            }
        } catch (e) {
            console.error("Error updating filters", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadDroppedData = async () => {
        setIsLoading(true);
        try {
            const data = await getDroppedProspects(userName, { role: userRole });
            setDroppedLeads(data);
        } catch (error) {
            console.error("Error loading dropped leads", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'dropped') {
            loadDroppedData();
        }
    }, [viewMode]);

    const handleExport = async () => {
        if (!leads || leads.length === 0) return;

        // Use the browser-specific bundle to avoid Turbopack crashing on Node.js dependencies (fs, stream, etc.)
        // @ts-ignore
        const ExcelJSModule = await import('exceljs/dist/exceljs.min.js');
        const ExcelJS = ExcelJSModule.default || ExcelJSModule;
        const workbook = new ExcelJS.Workbook();

        // --- SHEET 1: DEALS ---
        const worksheet = workbook.addWorksheet('Deals');

        // Headers
        const headerNames = ["ID", "RUC", "RAZON SOCIAL", "CONTACTO", "TELEFONO", "LINEAS", "CARGO FIJO", "ESTADO", "FECHA INGRESO", "EJECUTIVO", "SUPERVISOR", "OBSERVACIONES"];
        worksheet.addRow(headerNames);

        // Styling the header
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell: any) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF10B981' } // Emerald-500
            };
            cell.font = {
                color: { argb: 'FFFFFFFF' },
                bold: true
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Add Data Rows
        leads.forEach(l => {
            const rowValue = [
                l.id || l.ID || "",
                l.RUC || l.ruc || "",
                l['Razón Social'] || l.razonSocial || "",
                l['Representante Legal'] || l.representanteLegal || "",
                l['Teléfonos'] || l.TELEFONO || "",
                l['CANTIDAD LINEAS'] || l.lineas || "0",
                l['CARGO FIJO'] || l.cargoFijo || "0",
                l.ESTADO || l.estado || "",
                l['FECHA INICIO'] || "",
                l.EJECUTIVO || "",
                l.SUPERVISOR || "",
                l.OBSERVACIONES || ""
            ];

            const row = worksheet.addRow(rowValue);

            // Add borders to each cell in the row
            row.eachCell({ includeEmpty: true }, (cell: any) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Auto-filter and Column Widths
        worksheet.autoFilter = {
            from: 'A1',
            to: { row: 1, column: headerNames.length }
        };

        worksheet.columns.forEach((column: any) => {
            let maxLength = 0;
            if (column.eachCell) {
                column.eachCell({ includeEmpty: true }, (cell: any) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) maxLength = columnLength;
                });
            }
            column.width = Math.min(Math.max(10, maxLength + 2), 50);
        });

        // --- SHEET 2: SUMMARY ---
        const summarySheet = workbook.addWorksheet('Resumen de Pipeline');

        // Count registrations by status
        const statusCounts: Record<string, number> = {};
        leads.forEach(l => {
            const status = l.ESTADO || l.estado || "SIN ESTADO";
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        summarySheet.addRow(["REPORTE DE ESTADOS", "CANTIDAD"]);
        const sumHeader = summarySheet.getRow(1);
        sumHeader.eachCell({ includeEmpty: true }, (cell: any) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        Object.entries(statusCounts).forEach(([status, count]) => {
            const row = summarySheet.addRow([status, count]);
            row.eachCell({ includeEmpty: true }, (cell: any) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        summarySheet.getColumn(1).width = 30;
        summarySheet.getColumn(2).width = 15;

        // --- EXPORT AND DOWNLOAD ---
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Deals_Lishing_Advanced_${new Date().toISOString().split('T')[0]}.xlsx`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleVerDatos = (ruc: string) => {
        setCurrentLeadRuc(ruc);
        setIsLeadDataModalOpen(true);
    };

    const startEditing = (lead: any, cardId: string) => {
        if (viewMode === 'table') {
            setSelectedLeadForEdit(lead);
            setEditData({
                id: lead.id || lead.ID,
                ruc: lead.RUC || lead.ruc,
                lineas: lead['CANTIDAD LINEAS'] || '',
                cargoFijo: lead['CARGO FIJO'] || '',
                observaciones: lead.OBSERVACIONES || ''
            });
            setIsTableEditOpen(true);
        } else {
            setEditData({
                id: lead.id || lead.ID,
                ruc: lead.RUC || lead.ruc,
                lineas: lead['CANTIDAD LINEAS'] || '',
                cargoFijo: lead['CARGO FIJO'] || '',
                observaciones: lead.OBSERVACIONES || ''
            });
            setExpandedLead(cardId);
        }
    };

    const saveLeadDetails = async () => {
        if (!editData) return;
        setIsLoading(true);
        try {
            const res = await updatePipelineLead(editData.id, {
                lineas: editData.lineas,
                cargoFijo: editData.cargoFijo,
                observaciones: editData.observaciones
            });
            if (res.success) {
                // Update local state by ID
                setLeads(prev => prev.map(l => {
                    const lId = l.id || l.ID;
                    if (lId === editData.id) {
                        return {
                            ...l,
                            'CANTIDAD LINEAS': editData.lineas,
                            'CARGO FIJO': editData.cargoFijo,
                            'OBSERVACIONES': editData.observaciones
                        };
                    }
                    return l;
                }));
                setEditData(null);
                setExpandedLead(null);
                setIsTableEditOpen(false);
                setSelectedLeadForEdit(null);
            } else {
                AppSwal.fire({ title: 'Error', text: 'Error al actualizar: ' + res.error, icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } catch (e) {
            console.error("Error saving lead details", e);
            AppSwal.fire({ title: 'Error', text: 'Error al guardar los detalles del prospecto.', icon: 'error', confirmButtonColor: '#ef4444' });
        } finally {
            setIsLoading(false);
        }
    };

    const getColumnLeads = (status: string) => {
        const target = status.trim().toUpperCase();
        return leads.filter(l => {
            const current = (l.ESTADO || l.estado || '').trim().toUpperCase();
            return current === target;
        });
    };

    const onDragStart = (lead: any, e: React.DragEvent) => {
        setDraggedLead(lead);
        setCurrentDragY(e.clientY);
        e.dataTransfer.setData('text/plain', String(lead.id || lead.ID));
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragEnd = () => {
        setDraggedLead(null);
        setDropTarget(null);
        setCurrentDragY(null);
    };

    const onDragOver = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        if (!draggedLead) return;

        if (status === 'VENTA_CAIDA') {
            setDropTarget('VENTA_CAIDA');
            e.dataTransfer.dropEffect = 'move';
            return;
        }

        const currentIndex = COLUMNS.findIndex(c => c.id === (draggedLead.ESTADO || draggedLead.estado));
        const targetIndex = COLUMNS.findIndex(c => c.id === status);
        if (targetIndex === currentIndex + 1) {
            setDropTarget(status);
            e.dataTransfer.dropEffect = 'move';
        } else {
            setDropTarget(null);
            e.dataTransfer.dropEffect = 'none';
        }
    };

    const onDragLeave = () => setDropTarget(null);

    const onDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const targetStatus = dropTarget;
        setDropTarget(null);
        if (!draggedLead || targetStatus !== status) return;

        if (status === 'VENTA_CAIDA') {
            setSelectedLeadForDrop(draggedLead);
            setIsDropModalOpen(true);
            setDraggedLead(null);
            return;
        }

        const leadId = String(draggedLead.id || draggedLead.ID);
        const updatedLeads = leads.map(l => {
            if (String(l.id || l.ID) === leadId) return { ...l, ESTADO: status, estado: status };
            return l;
        });
        setLeads(updatedLeads);
        const result = await updatePipelineStatus(leadId, status);
        if (result.success) {
            if ((result as any).updatedField && (result as any).updatedDate) {
                setLeads(prev => prev.map(l => {
                    if (String(l.id || l.ID) === leadId) {
                        return {
                            ...l,
                            ESTADO: status,
                            estado: status,
                            [(result as any).updatedField]: (result as any).updatedDate
                        };
                    }
                    return l;
                }));
            }
        } else {
            setLeads(initialLeads);
            AppSwal.fire({ title: 'Error', text: 'Error al actualizar: ' + result.error, icon: 'error', confirmButtonColor: '#ef4444' });
        }
        setDraggedLead(null);
    };

    // Venta Caída Appearance Logic (High Sensitivity)
    const yPercent = currentDragY !== null ? (currentDragY / (viewHeight || 800)) * 100 : 0;
    const appearanceStart = 50; // Starts appearing exactly at the middle (50%)
    const reachingEnd = 80; // Fully ready well into the bottom half (80%)

    const visibilityProgress = Math.min(1, Math.max(0, (yPercent - appearanceStart) / (reachingEnd - appearanceStart)));

    // zone is interactive as soon as it's 20% visible
    const showDropZone = currentDragY !== null && visibilityProgress > 0.1;
    const dropZoneOpacity = visibilityProgress;

    // Slide up: from 100% (hidden) to 0% (fully up)
    const dropZoneTranslateY = (1 - visibilityProgress) * 100;

    return (
        <div
            onDragOver={(e) => {
                if (draggedLead) {
                    setCurrentDragY(e.clientY);
                }
            }}
            style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#050505', position: 'relative' }}
        >
            <PipelineFilters
                role={userRole}
                onFilterChange={handleFilterChange}
                onExport={handleExport}
                teamMembers={teamMembers}
            />

            {/* View Mode Toggle */}
            <div style={{ padding: '0 24px 12px 24px', display: 'flex', justifyContent: 'flex-start' }}>
                <div className="view-toggle-container">
                    <button
                        className={`view-toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
                        onClick={() => setViewMode('board')}
                    >
                        <span className="icon">📋</span> PIPELINE
                    </button>
                    <button
                        className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => setViewMode('table')}
                    >
                        <span className="icon">📊</span> VISTA TABLA
                    </button>
                    {(userRole === 'ADMIN' || userRole === 'SPECIAL') && (
                        <button
                            className={`view-toggle-btn ${viewMode === 'dropped' ? 'active' : ''}`}
                            onClick={() => setViewMode('dropped')}
                        >
                            <span className="icon">📉</span> VENTAS CAIDAS
                        </button>
                    )}
                    <div className="toggle-slider" style={{
                        width: (userRole === 'ADMIN' || userRole === 'SPECIAL') ? 'calc(33.33% - 4px)' : 'calc(50% - 4px)',
                        transform: `translateX(${viewMode === 'board' ? '4px' : viewMode === 'table' ? 'calc(100% + 4px)' : 'calc(200% + 4px)'})`
                    }} />
                </div>
            </div>

            <style jsx global>{`
                .view-toggle-container {
                    background: rgba(255, 255, 255, 0.03);
                    padding: 4px;
                    border-radius: 12px;
                    display: flex;
                    position: relative;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    width: fit-content;
                }
                .view-toggle-btn {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 900;
                    color: rgba(255, 255, 255, 0.4);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    z-index: 2;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    letter-spacing: 1px;
                }
                .view-toggle-btn.active {
                    color: #fff;
                }
                .toggle-slider {
                    position: absolute;
                    top: 4px;
                    left: 0;
                    width: calc(33.33% - 4px);
                    height: calc(100% - 8px);
                    background: linear-gradient(135deg, #10b981, #059669);
                    border-radius: 8px;
                    z-index: 1;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }

                /* Loading State */
                .loading-overlay {
                    position: absolute;
                    top: 100px;
                    left: 0;
                    width: 100%;
                    height: calc(100% - 100px);
                    background-color: rgba(0,0,0,0.7);
                    backdrop-filter: blur(4px);
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .loading-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }
                .loading-spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid rgba(16, 185, 129, 0.2);
                    border-top: 4px solid #10b981;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .loading-text {
                    color: #10b981;
                    font-weight: bold;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    font-size: 12px;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Scrollbar Styles */
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }

                /* Animations */
                @keyframes pulse-premium {
                    0% { transform: scale(1); filter: drop-shadow(0 0 5px #ef4444); }
                    50% { transform: scale(1.2); filter: drop-shadow(0 0 20px #ef4444); }
                    100% { transform: scale(1); filter: drop-shadow(0 0 5px #ef4444); }
                }

                /* Empty State */
                .empty-state-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    padding: 20px;
                    text-align: center;
                }
                .empty-state-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                    opacity: 0.3;
                }
                .empty-state-text {
                    color: white;
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    text-align: center;
                    margin-top: 12px;
                    letter-spacing: 4px;
                }

                /* Lead Card */
                .lead-card {
                    border-radius: 1.2rem;
                    padding: 16px;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 12px;
                    cursor: grab;
                }
                .lead-card-expanded {
                    background-color: #111 !important;
                    cursor: default !important;
                }
                .lead-card-dragged {
                    opacity: 0.3;
                    transform: scale(0.95);
                }

                .lead-card-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    opacity: 0.6;
                    cursor: pointer;
                }
                .lead-card-id-text {
                    font-size: 9px;
                    font-weight: 800;
                    color: white;
                }
                .lead-card-ruc-text {
                    font-size: 10px;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .lead-card-copy-check {
                    font-size: 8px;
                }

                .lead-card-name {
                    font-size: 14px;
                    font-weight: 900;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    cursor: copy;
                }
                .lead-card-copy-message {
                    font-size: 9px;
                    margin-left: 6px;
                    text-transform: none;
                    font-weight: 500;
                }

                .lead-card-details-container {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .lead-card-detail-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    opacity: 0.8;
                    cursor: pointer;
                }
                .lead-card-detail-dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 2px;
                }
                .lead-card-detail-text {
                    font-size: 10px;
                    font-weight: 700;
                    color: white;
                    text-transform: uppercase;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .lead-card-detail-dot-secondary {
                    width: 4px;
                    height: 4px;
                    border-radius: 2px;
                    background-color: rgba(255,255,255,0.2);
                }
                .lead-card-detail-text-secondary {
                    font-size: 10px;
                    font-weight: 700;
                    color: rgba(255,255,255,0.6);
                    text-transform: uppercase;
                }

                .lead-card-executive {
                    margin-top: 8px;
                    opacity: 0.4;
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 1px;
                }

                .lead-card-footer {
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .lead-card-lines-cargo-container {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .lead-card-lines-count {
                    font-size: 11px;
                    font-weight: 900;
                    color: white;
                    background-color: rgba(255,255,255,0.05);
                    padding: 2px 8px;
                    border-radius: 4px;
                    width: fit-content;
                }
                .lead-card-cargo-fijo {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }
                .lead-card-dots-container {
                    display: flex;
                    gap: 2px;
                }
                .lead-card-dot {
                    width: 8px;
                    height: 3px;
                    border-radius: 1px;
                }

                .subir-venta-button {
                    background-color: #ec4899;
                    color: white;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 5px 15px rgba(236, 72, 153, 0.2);
                }

                .ver-datos-button {
                    background-color: rgba(255, 255, 255, 0.05);
                    color: white;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    cursor: pointer;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.2s;
                }
                .ver-datos-button:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    border-color: #10b981;
                }

                /* Expanded Edit Section */
                .lead-card-expanded-content {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .lead-card-edit-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .lead-card-edit-field {
                    background-color: #000;
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .lead-card-edit-label {
                    font-size: 8px;
                    font-weight: 900;
                    color: rgba(255,255,255,0.3);
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .lead-card-edit-input {
                    background-color: transparent;
                    border: none;
                    color: white;
                    width: 100%;
                    font-size: 13px;
                    font-weight: 700;
                    outline: none;
                }
                .lead-card-edit-textarea {
                    background-color: transparent;
                    border: none;
                    color: white;
                    width: 100%;
                    font-size: 11px;
                    outline: none;
                    resize: none;
                }

                .lead-card-edit-actions {
                    display: flex;
                    gap: 8px;
                }
                .lead-card-save-button {
                    flex: 1;
                    color: black;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    cursor: pointer;
                    border: none;
                }
                .lead-card-close-button {
                    flex: 1;
                    background-color: rgba(255,255,255,0.05);
                    color: white;
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    cursor: pointer;
                    border: none;
                }

                .lead-card-traceability-container {
                    background-color: rgba(0,0,0,0.4);
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .lead-card-traceability-title {
                    font-size: 8px;
                    font-weight: 900;
                    color: rgba(255,255,255,0.2);
                    text-transform: uppercase;
                    text-align: center;
                    margin-bottom: 12px;
                }
                .lead-card-traceability-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .lead-card-traceability-step {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9px;
                }
                .lead-card-traceability-label {
                    color: rgba(255,255,255,0.4);
                }
                .lead-card-traceability-date {
                    /* Style handled dynamically */
                }


                .drop-zone-container {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
                }

                .drop-zone-background {
                    position: absolute;
                    inset: 0;
                    backdrop-filter: blur(30px);
                    border-top: 1px solid rgba(239, 68, 68, 0.4);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }
                .drop-zone-background.default {
                    background: linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.5));
                    box-shadow: 0 -15px 40px rgba(0, 0, 0, 0.6);
                }
                .drop-zone-background.active {
                    background: linear-gradient(to top, rgba(153, 27, 27, 0.9), rgba(153, 27, 27, 0.5));
                    box-shadow: 0 -25px 50px rgba(239, 68, 68, 0.4);
                }

                .drop-zone-accent-line {
                    position: absolute;
                    top: 0;
                    left: 5%;
                    right: 5%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #ef4444, transparent);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }
                .drop-zone-accent-line.default {
                    opacity: 0.4;
                    filter: none;
                }
                .drop-zone-accent-line.active {
                    opacity: 1;
                    filter: blur(3px);
                }

                .drop-zone-content {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 30px;
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    pointer-events: none;
                }
                .drop-zone-content.active {
                    transform: scale(1.1);
                }

                .drop-zone-icon {
                    font-size: 36px;
                }
                .drop-zone-icon.active {
                    filter: drop-shadow(0 0 15px #ef4444);
                    animation: pulse-premium 1s infinite;
                }

                .drop-zone-text-container {
                    display: flex;
                    flex-direction: column;
                }

                .drop-zone-main-text {
                    color: #ef4444;
                    font-size: 16px;
                    font-weight: 900;
                    letter-spacing: 0.5em;
                    text-transform: uppercase;
                }
                .drop-zone-main-text.active {
                    text-shadow: 0 0 20px rgba(239, 68, 68, 0.7);
                }

                .drop-zone-sub-text {
                    color: rgba(255,255,255,0.5);
                    font-size: 10px;
                    font-weight: bold;
                    letter-spacing: 0.2em;
                    margin-top: 6px;
                }
            `}</style>

            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner" />
                        <span className="loading-text">Procesando...</span>
                    </div>
                </div>
            )}

            {/* Contenedor de Scroll Horizontal para mantener las 5 columnas en cualquier pantalla */}
            {viewMode === 'board' ? (
                <>
                    <div
                        className="custom-scrollbar"
                        style={{
                            flex: 1,
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            width: '100%',
                            paddingBottom: '8px' // Espacio para el scroll horizontal
                        }}
                    >
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                minWidth: '1200px', // Asegura que las columnas tengan un ancho mínimo legible
                                height: '100%',
                                gap: '12px',
                                padding: '12px'
                            }}
                        >
                            {COLUMNS.map((col, idx) => {
                                const colLeads = getColumnLeads(col.id);
                                const isTarget = dropTarget === col.id;

                                const safeParse = (val: any) => {
                                    if (typeof val === 'number') return val;
                                    if (val === undefined || val === null || val === '') return 0;

                                    const s = String(val).trim();
                                    // Remove anything that isn't a digit, comma, or dot
                                    let clean = s.replace(/[^0-9,.]/g, '');

                                    if (!clean) return 0;

                                    // Identify decimal vs thousand separators
                                    const lastComma = clean.lastIndexOf(',');
                                    const lastDot = clean.lastIndexOf('.');

                                    if (lastComma > lastDot) {
                                        // Spanish format: 1.234,56
                                        clean = clean.replace(/\./g, '').replace(',', '.');
                                    } else if (lastDot > lastComma) {
                                        // English format: 1,234.56
                                        clean = clean.replace(/,/g, '');
                                    } else if (lastComma !== -1) {
                                        // Only commas: 123,45
                                        clean = clean.replace(',', '.');
                                    }
                                    // If only dots or no separators, parseFloat handles it (assuming dots are decimals if only one)
                                    // BUT! In some systems "1.200" means 1200. 
                                    // Let's check for the three-digit pattern: if it's "x.xxx" it's likely thousands.
                                    if (clean.includes('.') && clean.split('.')[1].length === 3 && !clean.includes('00')) {
                                        // Risky, but if it has exactly 3 digits after the only dot, it might be thousands.
                                        // However, most telecom plans are S/ 15.90, S/ 20.00 etc (2 digits).
                                    }

                                    return parseFloat(clean) || 0;
                                };

                                const totalLines = colLeads.reduce((sum, l) => {
                                    const val = l['CANTIDAD LINEAS'] || l.lineas || '0';
                                    return sum + safeParse(val);
                                }, 0);

                                const totalCF = colLeads.reduce((sum, l) => {
                                    const val = l['CARGO FIJO'] || l.cargoFijo || '0';
                                    return sum + safeParse(val);
                                }, 0);
                                const totalNeto = totalCF / 1.18;

                                return (
                                    <div
                                        key={col.id}
                                        onDragOver={(e) => onDragOver(e, col.id)}
                                        onDragLeave={onDragLeave}
                                        onDrop={(e) => onDrop(e, col.id)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            height: '100%',
                                            backgroundColor: isTarget ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                                            borderRadius: '1.5rem',
                                            border: `1px solid ${isTarget ? col.color : 'rgba(255,255,255,0.05)'}`,
                                            overflow: 'hidden',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {/* Column Header */}
                                        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: col.color, boxShadow: `0 0 15px ${col.color}` }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start' }}>
                                                <span style={{ color: col.color, fontSize: '12px', fontWeight: 900 }}>{col.percent}</span>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, letterSpacing: '0.5px' }}>LINS</p>
                                                        <p style={{ margin: 0, fontSize: '12px', color: 'white', fontWeight: 900 }}>{totalLines}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, letterSpacing: '0.5px' }}>BRUTO</p>
                                                        <p style={{ margin: 0, fontSize: '11px', color: col.color, fontWeight: 900 }}>S/{totalCF.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontSize: '8px', color: 'rgba(16, 185, 129, 0.6)', fontWeight: 900, letterSpacing: '0.5px' }}>NETO</p>
                                                        <p style={{ margin: 0, fontSize: '11px', color: '#10b981', fontWeight: 900 }}>S/{totalNeto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>{col.label}</h3>
                                            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                <span style={{ color: 'white', fontSize: '2rem', fontWeight: 900 }}>{colLeads.length}</span>
                                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>Deals</span>
                                            </div>
                                        </div>

                                        {/* Column Body */}
                                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {isTarget && (
                                                <div style={{ border: `2px dashed ${col.color}`, borderRadius: '1rem', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: col.bg }}>
                                                    <span style={{ color: col.color, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>Suelte aquí</span>
                                                </div>
                                            )}

                                            {colLeads.length === 0 && !isTarget ? (
                                                <div className="empty-state-container" style={{ opacity: 0.1, pointerEvents: 'none' }}>
                                                    <div className="empty-state-icon">🌑</div>
                                                    <span className="empty-state-text">Vacío</span>
                                                </div>
                                            ) : (
                                                colLeads.map((lead, lIdx) => {
                                                    const cardId = `${col.id}-${lIdx}`;
                                                    const leadUniqueId = lead.id || lead.ID;
                                                    const isExpanded = expandedLead === cardId;
                                                    const isDragged = draggedLead && (draggedLead.id || draggedLead.ID) === leadUniqueId;

                                                    return (
                                                        <div
                                                            key={lIdx}
                                                            draggable
                                                            onDragStart={(e) => onDragStart(lead, e)}
                                                            onDragEnd={onDragEnd}
                                                            onClick={() => isExpanded ? null : startEditing(lead, cardId)}
                                                            className={`lead-card ${isExpanded ? 'lead-card-expanded' : ''} ${isDragged ? 'lead-card-dragged' : ''}`}
                                                            style={{
                                                                border: `1px solid ${isExpanded ? col.color : 'rgba(255,255,255,0.05)'}`,
                                                                boxShadow: isExpanded ? `0 10px 30px -5px ${col.color}40` : 'none',
                                                            }}
                                                        >
                                                            <div
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(lead.RUC || lead.ruc || '', `${cardId}-ruc`); }}
                                                                className="lead-card-header"
                                                            >
                                                                <span className="lead-card-id-text">ID: {lead.id || lead.ID || '-'}</span>
                                                                <span className="lead-card-ruc-text" style={{ color: copiedField === `${cardId}-ruc` ? col.color : 'white' }}>
                                                                    {lead.RUC || lead.ruc || ''}
                                                                    {copiedField === `${cardId}-ruc` && <span className="lead-card-copy-check">✓</span>}
                                                                </span>
                                                            </div>

                                                            <h4
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(lead['Razón Social'] || lead.razonSocial || lead.RAZON_SOCIAL || '', `${cardId}-name`); }}
                                                                className="lead-card-name"
                                                                style={{ color: isExpanded ? col.color : 'white' }}
                                                            >
                                                                {lead['Razón Social'] || lead.razonSocial || lead.RAZON_SOCIAL || 'SIN NOMBRE'}
                                                                {copiedField === `${cardId}-name` && <span className="lead-card-copy-message" style={{ color: col.color }}>Copiado!</span>}
                                                            </h4>

                                                            <div className="lead-card-details-container">
                                                                <div
                                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(lead['Representante Legal'] || lead.representanteLegal || lead.CONTACTO || '-', `${cardId}-rep`); }}
                                                                    className="lead-card-detail-item"
                                                                >
                                                                    <div className="lead-card-detail-dot" style={{ backgroundColor: col.color }} />
                                                                    <span className="lead-card-detail-text">
                                                                        {lead['Representante Legal'] || lead.representanteLegal || lead.CONTACTO || '-'}
                                                                        {copiedField === `${cardId}-rep` && <span className="lead-card-copy-check-small" style={{ color: col.color }}>✓</span>}
                                                                    </span>
                                                                </div>

                                                                <div
                                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(lead['Teléfonos'] || lead.TELEFONO || lead.telefono || '-', `${cardId}-tel`); }}
                                                                    className="lead-card-detail-item"
                                                                >
                                                                    <div className="lead-card-detail-dot-secondary" />
                                                                    <span className="lead-card-detail-text-secondary">
                                                                        📞 {lead['Teléfonos'] || lead.TELEFONO || lead.telefono || '-'}
                                                                        {copiedField === `${cardId}-tel` && <span className="lead-card-copy-check-small" style={{ color: col.color }}>✓</span>}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {(userRole === 'ADMIN' || userRole === 'SPECIAL') && (
                                                                <div className="lead-card-executive">
                                                                    EJ: {lead.EJECUTIVO || '---'}
                                                                </div>
                                                            )}

                                                            <div className="lead-card-footer">
                                                                <div className="lead-card-lines-cargo-container">
                                                                    <span className="lead-card-lines-count">
                                                                        {lead['CANTIDAD LINEAS'] || lead.lineas || '0'} L
                                                                    </span>
                                                                    {(lead['CARGO FIJO'] || lead.cargoFijo) && (
                                                                        <span className="lead-card-cargo-fijo" style={{ color: col.color }}>
                                                                            S/ {lead['CARGO FIJO'] || lead.cargoFijo}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="lead-card-dots-container">
                                                                    {[1, 2, 3, 4, 5].map(dot => (
                                                                        <div key={dot} className="lead-card-dot" style={{ backgroundColor: dot <= idx + 1 ? col.color : 'rgba(255,255,255,0.05)' }} />
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {col.id !== 'NUEVO INGRESO' && (
                                                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleVerDatos(lead.RUC || lead.ruc);
                                                                        }}
                                                                        className="ver-datos-button"
                                                                        style={{ flex: 1 }}
                                                                    >
                                                                        🔍 Datos
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {col.id === 'NUEVO INGRESO' && lead.ESTADO !== 'VENTA SUBIDA' && (
                                                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedLeadForSale(lead);
                                                                            setIsSubirVentaOpen(true);
                                                                        }}
                                                                        className="subir-venta-button"
                                                                        style={{ flex: 1 }}
                                                                    >
                                                                        🚀 Subir
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {isExpanded && editData && (
                                                                <div className="lead-card-expanded-content">
                                                                    <div className="lead-card-edit-grid">
                                                                        <div className="lead-card-edit-field">
                                                                            <p className="lead-card-edit-label">Líneas</p>
                                                                            <input
                                                                                type="number"
                                                                                value={editData.lineas}
                                                                                onChange={(e) => setEditData({ ...editData, lineas: e.target.value })}
                                                                                className="lead-card-edit-input"
                                                                            />
                                                                        </div>
                                                                        <div className="lead-card-edit-field">
                                                                            <p className="lead-card-edit-label">Cargo Fijo S/</p>
                                                                            <input
                                                                                type="text"
                                                                                value={editData.cargoFijo}
                                                                                onChange={(e) => setEditData({ ...editData, cargoFijo: e.target.value })}
                                                                                className="lead-card-edit-input"
                                                                                style={{ color: col.color }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="lead-card-edit-field">
                                                                        <p className="lead-card-edit-label">Observaciones</p>
                                                                        <textarea
                                                                            value={editData.observaciones}
                                                                            onChange={(e) => setEditData({ ...editData, observaciones: e.target.value })}
                                                                            rows={3}
                                                                            className="lead-card-edit-textarea"
                                                                        />
                                                                    </div>

                                                                    <div className="lead-card-edit-actions">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); saveLeadDetails(); }}
                                                                            className="lead-card-save-button"
                                                                            style={{ backgroundColor: col.color }}
                                                                        >
                                                                            Guardar Cambios
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setExpandedLead(null); setEditData(null); }}
                                                                            className="lead-card-close-button"
                                                                        >
                                                                            Cerrar
                                                                        </button>
                                                                    </div>

                                                                    <div className="lead-card-traceability-container">
                                                                        <p className="lead-card-traceability-title">Trazabilidad</p>
                                                                        <div className="lead-card-traceability-steps">
                                                                            {[
                                                                                { label: 'Propuesta', date: lead['FECHA PROPUESTA'] },
                                                                                { label: 'Interesado', date: lead['FECHA INTERESADO'] },
                                                                                { label: 'Negociación', date: lead['FECHA NEGOCIACION'] },
                                                                                { label: 'Si Verbal', date: lead['FECHA SI VERBAL'] },
                                                                                { label: 'NUEVO INGRESO', date: lead['FECHA CIERRE'] }
                                                                            ].map((step, sIdx) => (
                                                                                <div key={sIdx} className="lead-card-traceability-step">
                                                                                    <span className="lead-card-traceability-label">{step.label}</span>
                                                                                    <span className="lead-card-traceability-date" style={{ color: step.date ? 'white' : 'rgba(255,255,255,0.1)', fontWeight: step.date ? 700 : 400 }}>{step.date || '--/--/--'}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </>
            ) : viewMode === 'table' ? (
                <ProspectTableView
                    leads={leads.filter(l => (l.ESTADO || l.estado) !== 'VENTA SUBIDA' && (l.ESTADO || l.estado) !== 'VENTA CAIDA')}
                    columns={COLUMNS}
                    onUpdateStatus={async (id, status) => {
                        const leadId = String(id);
                        const updatedLeads = leads.map(l => {
                            if (String(l.id || l.ID) === leadId) return { ...l, ESTADO: status, estado: status };
                            return l;
                        });
                        setLeads(updatedLeads);
                        const result = await updatePipelineStatus(leadId, status);
                        if (result.success) {
                            if ((result as any).updatedField && (result as any).updatedDate) {
                                setLeads(prev => prev.map(l => {
                                    if (String(l.id || l.ID) === leadId) {
                                        return {
                                            ...l,
                                            ESTADO: status,
                                            estado: status,
                                            [(result as any).updatedField]: (result as any).updatedDate
                                        };
                                    }
                                    return l;
                                }));
                            }
                        } else {
                            // Revert on failure
                            const fresh = await getPipelineData(userName, { role: userRole });
                            setLeads(fresh);
                            AppSwal.fire({ title: 'Error', text: 'Error al actualizar: ' + result.error, icon: 'error', confirmButtonColor: '#ef4444' });
                        }
                    }}
                    onDropProspect={(lead) => {
                        setSelectedLeadForDrop(lead);
                        setIsDropModalOpen(true);
                    }}
                    onSubirVenta={(lead) => {
                        setSelectedLeadForSale(lead);
                        setIsSubirVentaOpen(true);
                    }}
                    onEditLead={startEditing}
                    onVerDatos={handleVerDatos}
                    userRole={userRole}
                />
            ) : (
                <DroppedProspectsTable data={droppedLeads} />
            )}

            <SubirVentaModal
                isOpen={isSubirVentaOpen}
                onClose={() => setIsSubirVentaOpen(false)}
                leadData={selectedLeadForSale}
                ejecutivo={userName}
                onSuccess={() => {
                    // Refrescar los datos después de subir la venta
                    handleFilterChange({});
                }}
            />

            <DropProspectModal
                isOpen={isDropModalOpen}
                onClose={() => setIsDropModalOpen(false)}
                leadData={selectedLeadForDrop}
                userName={userName}
                onSuccess={() => {
                    handleFilterChange({});
                }}
            />

            <LeadDataModal
                isOpen={isLeadDataModalOpen}
                onClose={() => setIsLeadDataModalOpen(false)}
                ruc={currentLeadRuc}
                currentUser={userName}
                onSuccess={() => handleFilterChange(currentFilters)}
            />

            {/* Modal for editing in table view */}
            {isTableEditOpen && editData && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 1000000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={() => { setIsTableEditOpen(false); setEditData(null); }}
                >
                    <div
                        style={{
                            width: '450px',
                            background: '#111',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase' }}>Editar Registro</h3>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>ID: {editData.id}</span>
                        </div>

                        <div className="lead-card-edit-grid">
                            <div className="lead-card-edit-field">
                                <p className="lead-card-edit-label">Líneas</p>
                                <input
                                    type="number"
                                    value={editData.lineas}
                                    onChange={(e) => setEditData({ ...editData, lineas: e.target.value })}
                                    className="lead-card-edit-input"
                                    autoFocus
                                />
                            </div>
                            <div className="lead-card-edit-field">
                                <p className="lead-card-edit-label">Cargo Fijo S/</p>
                                <input
                                    type="text"
                                    value={editData.cargoFijo}
                                    onChange={(e) => setEditData({ ...editData, cargoFijo: e.target.value })}
                                    className="lead-card-edit-input"
                                />
                            </div>
                        </div>

                        <div className="lead-card-edit-field">
                            <p className="lead-card-edit-label">Observaciones</p>
                            <textarea
                                value={editData.observaciones}
                                onChange={(e) => setEditData({ ...editData, observaciones: e.target.value })}
                                rows={4}
                                className="lead-card-edit-textarea"
                                placeholder="Ingrese observaciones aquí..."
                            />
                        </div>

                        <div className="lead-card-edit-actions">
                            <button
                                onClick={saveLeadDetails}
                                className="lead-card-save-button"
                                style={{ backgroundColor: '#10b981' }}
                            >
                                Guardar Cambios
                            </button>
                            <button
                                onClick={() => { setIsTableEditOpen(false); setEditData(null); }}
                                className="lead-card-close-button"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Drop Zone for Venta Caída - Portal Version (Anchored to Viewport) */}
            {
                draggedLead && typeof document !== 'undefined' && createPortal(
                    <div
                        onDragOver={(e) => onDragOver(e, 'VENTA_CAIDA')}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => onDrop(e, 'VENTA_CAIDA')}
                        className="drop-zone-container"
                        style={{
                            pointerEvents: showDropZone ? 'all' : 'none',
                            transform: `translateY(${dropZoneTranslateY}%)`,
                            opacity: dropZoneOpacity
                        }}
                    >
                        {/* Background Glass Layer */}
                        <div className={`drop-zone-background ${dropTarget === 'VENTA_CAIDA' ? 'active' : 'default'}`} />

                        {/* Glowing Accent Line */}
                        <div className={`drop-zone-accent-line ${dropTarget === 'VENTA_CAIDA' ? 'active' : 'default'}`} />

                        {/* Content Section */}
                        <div className={`drop-zone-content ${dropTarget === 'VENTA_CAIDA' ? 'active' : ''}`}>
                            <div className={`drop-zone-icon ${dropTarget === 'VENTA_CAIDA' ? 'active' : ''}`}>
                                🗑️
                            </div>
                            <div className="drop-zone-text-container">
                                <span className={`drop-zone-main-text ${dropTarget === 'VENTA_CAIDA' ? 'active' : ''}`}>
                                    {dropTarget === 'VENTA_CAIDA' ? 'SOLTAR PARA CANCELAR' : 'MOVER A VENTA CAÍDA'}
                                </span>
                                <span className="drop-zone-sub-text">
                                    ELIMINARÁ ESTE REGISTRO DEL PIPELINE ACTIVO
                                </span>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div >
    );
}
