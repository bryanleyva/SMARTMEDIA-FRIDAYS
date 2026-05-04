'use client';

import React, { useState, useEffect } from 'react';
import { getVentasData, updateVentaStatus, updateVentaData, getChatMessages, sendChatMessage } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';
import SubirVentaModal from './SubirVentaModal';
import { exportVentasToExcel } from '@/lib/excel-utils';

interface Sale {
    id: string;
    ejecutivo: string;
    supervisor: string;
    aprobacion: string;
    autorizacion: string;
    fecha: string;
    estado: string;
    observacion: string;
    mesaAsignada: string;
    ruc: string;
    razonSocial: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    correo: string;
    segmento: string;
    producto: string;
    proceso: string;
    detalle: string;
    lineas: string;
    cargoFijo: string;
    descuento: string;
    dni: string;
    contacto: string;
    telefono: string;
    tipoVenta: string;
    cantidad: string;
    observacionEjecutivo: string;
    fechaInicio: string;
    fechaFin: string;
    srIngreso: string;
    numOrden: string;
    operador: string;
    idSustentos: string;
    fechaActivacion: string;
    fechaPeriodo: string;
}

interface Props {
    currentUserRole: string;
    currentUserName: string;
    currentUserCargo: string;
}

const STATUS_COLORS: Record<string, string> = {
    'RECHAZADO': 'status-rose',
    'ERROR DE DATA': 'status-rose',
    'NUEVO INGRESO': 'status-indigo',
    'PENDIENTE APROBACION': 'status-indigo',
    'PENDIENTE': 'status-indigo',
    'NUEVO': 'status-indigo',
    'INGRESADO': 'status-violet',
    'DESPACHO': 'status-violet',
    'APROBADO': 'status-sky',
    'OBSERVADO POR ENTEL': 'status-orange',
    'OBSERVADO': 'status-amber',
    'PENDIENTE INGRESO': 'status-amber',
    'PROCESO DE ACTIVACION': 'status-blue',
    'EN PROCESO DE ACTIVACION': 'status-blue',
    'PENDIENTE ENVÍO': 'status-sky',
    'FLUXO': 'status-blue',
    'ACTIVADO': 'status-emerald',
};

const STATUS_OPTIONS = [
    'PENDIENTE INGRESO',
    'INGRESADO',
    'DESPACHO',
    'PENDIENTE ENVÍO',
    'OBSERVADO POR ENTEL',
    'PROCESO DE ACTIVACION',
    'ACTIVADO',
    'RECHAZADO'
];

const PERIOD_OPTIONS: Record<string, string> = (() => {
    const options: Record<string, string> = {};
    const now = new Date();
    // From 6 months ago to 12 months in the future
    for (let i = -6; i <= 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const y = d.getFullYear();
        const key = `${m}/${y}`;
        const label = `${d.toLocaleString('es-PE', { month: 'long' }).toUpperCase()} ${y}`;
        options[key] = label;
    }
    return options;
})();

const CURRENT_PERIOD = (() => {
    const now = new Date();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    return `${m}/${y}`;
})();

export default function SessionLinker({ currentUserRole, currentUserName, currentUserCargo }: Props) {
    const [ventas, setVentas] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [openedSaleId, setOpenedSaleId] = useState<string | null>(null);
    const [editModeData, setEditModeData] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const chatContainerRef = React.useRef<HTMLDivElement>(null);

    const [openFilesId, setOpenFilesId] = useState<string | null>(null);
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [correctionSaleData, setCorrectionSaleData] = useState<any>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.status-dropdown-container') && !target.closest('.files-dropdown-holder')) {
                setOpenStatusDropdownId(null);
                setOpenFilesId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filters
    const [filterRuc, setFilterRuc] = useState('');
    const [filterEjecutivo, setFilterEjecutivo] = useState('');
    const [filterSupervisor, setFilterSupervisor] = useState('');
    const [filterEstado, setFilterEstado] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const loadData = async () => {
        setLoading(true);
        const data = await getVentasData();
        setVentas(data);

        // REACIVITY FIX: If there's an open record, update its local state with fresh data
        if (openedSaleId) {
            const updatedSale = data.find(v => v.id === openedSaleId);
            if (updatedSale) {
                setEditModeData({
                    ...updatedSale,
                    fechaPeriodo: updatedSale.fechaPeriodo || CURRENT_PERIOD
                });
            }
        }

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadChat = async (ventaId: string, silent = false) => {
        if (!silent) setLoadingChat(true);
        const result = await getChatMessages(ventaId);
        if (result.success) {
            setChatMessages(result.data || []);
        }
        if (!silent) setLoadingChat(false);
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (openedSaleId) {
            loadChat(openedSaleId);
            // Polling every 4 seconds for real-time updates
            interval = setInterval(() => {
                loadChat(openedSaleId, true);
            }, 4000);
        } else {
            setChatMessages([]);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [openedSaleId]);

    useEffect(() => {
        // Auto-scroll to bottom of container when messages change
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !openedSaleId) return;

        const tempMsg = newMessage;
        setNewMessage('');

        const result = await sendChatMessage(openedSaleId, tempMsg, currentUserName, isAuthorizedToEdit ? 'STAFF' : 'EJECUTIVO');
        if (result.success) {
            loadChat(openedSaleId);
        } else {
            AppSwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo enviar el mensaje' });
        }
    };

    const isAuthorizedToEdit = (currentUserRole === 'ADMIN' || (currentUserRole === 'SPECIAL' && currentUserCargo === 'BACK OFFICE'));
    const isStandardEjecutivo = currentUserRole === 'STANDAR' && currentUserCargo === 'EJECUTIVO DE VENTAS';
    const isSupervisor = currentUserRole === 'ADMIN' || currentUserCargo?.trim().toUpperCase().includes('SUPERVISOR');

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const sale = ventas.find(v => v.id === id);
        if (!sale) return;

        // VALIDATION: ACTIVADO
        if (newStatus === 'ACTIVADO') {
            const missingFields = [];
            if (!sale.srIngreso) missingFields.push('SR de Ingreso');
            if (!sale.numOrden) missingFields.push('Número de Orden');
            if (!sale.fechaActivacion) missingFields.push('Fecha de Activación');
            if (!sale.observacion) missingFields.push('Observaciones Mesa');

            if (missingFields.length > 0) {
                AppSwal.fire({
                    title: 'Faltan Datos',
                    html: `Para activar, debe completar:<br><b>${missingFields.join(', ')}</b>`,
                    icon: 'warning'
                });
                return;
            }
        }

        // VALIDATION: RECHAZADO (Prompt for reason)
        if (newStatus === 'RECHAZADO') {
            const { value: text } = await AppSwal.fire({
                input: 'textarea',
                inputLabel: 'Motivo de Rechazo',
                inputPlaceholder: 'Indique por qué se rechaza la venta...',
                inputAttributes: {
                    'aria-label': 'Motivo de rechazo'
                },
                showCancelButton: true,
                confirmButtonText: 'Rechazar Venta',
                cancelButtonText: 'Cancelar',
                title: '¿Confirmar Rechazo?',
                icon: 'warning',
                inputValidator: (value) => {
                    if (!value) {
                        return '¡Debe escribir un motivo!'
                    }
                },
                customClass: {
                    popup: 'swal-popup-dark',
                    title: 'swal-title-dark',
                    htmlContainer: 'swal-text-dark',
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn',
                    input: 'swal-input-dark'
                }
            });

            if (!text) return; // User cancelled

            // Proceed with update using updateVentaData to save observation
            setUpdatingStatus(id);
            try {
                const result = await updateVentaData(id, {
                    estado: 'RECHAZADO',
                    observacion: text
                }, currentUserName);

                if (result.success) {
                    setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: 'RECHAZADO', observacion: text } : v));
                    AppSwal.fire({ icon: 'success', title: 'Venta Rechazada', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Error rejecting:', error);
                AppSwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo rechazar la venta' });
            } finally {
                setUpdatingStatus(null);
            }
            return;
        }


        // Confirmation for Supervisor actions (Original logic kept as fallback/pre-check)
        if (isSupervisor && (newStatus === 'NUEVO INGRESO')) {
            const confirmResult = await AppSwal.fire({
                title: '¿Deseas aprobar esta venta?',
                text: `Por favor, verifica bien el ingreso antes de aprobar.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, Aprobar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    popup: 'swal-popup-dark',
                    title: 'swal-title-dark',
                    htmlContainer: 'swal-text-dark',
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn'
                }
            });

            if (!confirmResult.isConfirmed) return;
        }

        // --- NEW LOGIC: FECHA PERIODO for ACTIVATION ---
        let updatedPeriod = sale.fechaPeriodo;
        if (newStatus === 'PROCESO DE ACTIVACION') {
            const defaultPeriod = sale.fechaPeriodo || CURRENT_PERIOD;

            const { value: period } = await AppSwal.fire({
                title: 'Confirmar Período de Reporte',
                text: 'Seleccione el mes y año para el reporte de esta venta:',
                input: 'select',
                inputOptions: PERIOD_OPTIONS,
                inputValue: defaultPeriod,
                showCancelButton: true,
                confirmButtonText: 'Confirmar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    popup: 'swal-popup-dark',
                    title: 'swal-title-dark',
                    htmlContainer: 'swal-text-dark',
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn',
                    input: 'swal-input-dark'
                }
            });

            if (!period) return; // User cancelled
            updatedPeriod = period;
        }

        setUpdatingStatus(id);
        try {
            // If we have a period update, we need to use updateVentaData instead of updateVentaStatus
            let result;
            if (newStatus === 'PROCESO DE ACTIVACION') {
                result = await updateVentaData(id, {
                    estado: newStatus,
                    fechaPeriodo: updatedPeriod
                }, currentUserName);
            } else {
                result = await updateVentaStatus(id, newStatus, currentUserName);
            }

            if (result.success) {
                setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: newStatus, ...(newStatus === 'PROCESO DE ACTIVACION' ? { fechaPeriodo: updatedPeriod } : {}) } : v));
                AppSwal.fire({
                    icon: 'success',
                    title: 'Estado actualizado',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            AppSwal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar el estado'
            });
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleDetailedUpdate = async () => {
        if (!editModeData || !openedSaleId) return;

        // VALIDATION: ACTIVADO
        if (editModeData.estado === 'ACTIVADO') {
            const missingFields = [];
            if (!editModeData.srIngreso) missingFields.push('SR de Ingreso');
            if (!editModeData.numOrden) missingFields.push('Número de Orden');
            if (!editModeData.fechaActivacion) missingFields.push('Fecha de Activación');
            if (!editModeData.observacion) missingFields.push('Observaciones Mesa');

            if (missingFields.length > 0) {
                AppSwal.fire({
                    title: 'Faltan Datos',
                    html: `Para activar, debe completar:<br><b>${missingFields.join(', ')}</b>`,
                    icon: 'warning'
                });
                return;
            }
        }

        // VALIDATION: RECHAZADO
        if (editModeData.estado === 'RECHAZADO') {
            if (!editModeData.observacion || editModeData.observacion.trim() === '') {
                AppSwal.fire({
                    title: 'Falta Motivo',
                    text: 'Para rechazar, debe indicar el motivo en "Observaciones Mesa".',
                    icon: 'warning'
                });
                return;
            }
        }

        setUpdatingStatus(openedSaleId);
        try {
            const result = await updateVentaData(openedSaleId, {
                estado: editModeData.estado,
                srIngreso: editModeData.srIngreso,
                numOrden: editModeData.numOrden,
                observacion: editModeData.observacion,
                fechaActivacion: editModeData.fechaActivacion,
                fechaPeriodo: editModeData.fechaPeriodo
            }, currentUserName);

            if (result.success) {
                AppSwal.fire({
                    icon: 'success',
                    title: 'Registro Actualizado',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                loadData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error updating details:', error);
            AppSwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el registro' });
        } finally {
            setUpdatingStatus(null);
        }
    };

    const filteredVentas = (ventas || []).filter(v => {
        const isAdmin = currentUserRole === 'ADMIN';
        const isBackOffice = currentUserCargo?.trim().toUpperCase() === 'BACK OFFICE';
        const isSupervisorUser = currentUserCargo?.trim().toUpperCase().includes('SUPERVISOR');

        // VISIBILITY RULES
        // 1. Admin & Back Office: See ALL
        if (isAdmin || isBackOffice) {
            if (isBackOffice && v.estado === 'PENDIENTE APROBACION') return false;
        }
        // 2. Supervisor: See created by them OR assigned to their team
        else if (isSupervisorUser) {
            const isMySale = v.ejecutivo === currentUserName;
            const isMyTeam = v.supervisor === currentUserName;
            if (!isMySale && !isMyTeam) return false;
        }
        // 3. Standard / Others: See ONLY their own
        else {
            if (v.ejecutivo !== currentUserName) return false;
        }

        // 4. HR Role: See ONLY ACTIVADO (Global if no other restrictions, but restricted by status)
        if (currentUserCargo?.trim().toUpperCase() === 'RECURSOS HUMANOS') {
            if (v.estado?.trim().toUpperCase() !== 'ACTIVADO') return false;
        }

        const matchesRuc = v.ruc?.toLowerCase().includes(filterRuc.toLowerCase()) ||
            v.razonSocial?.toLowerCase().includes(filterRuc.toLowerCase());
        const matchesEjecutivo = !filterEjecutivo || v.ejecutivo === filterEjecutivo;
        const matchesSupervisor = !filterSupervisor || v.supervisor === filterSupervisor;
        const matchesEstado = !filterEstado || v.estado === filterEstado;

        // --- Date Logic ---
        // --- Date Logic ---
        const finalStatuses = ['ACTIVADO', 'RECHAZADO', 'ERROR DE DATA', 'VENTA CAIDA', 'ANULADO'];
        const estadoUpper = (v.estado || '').trim().toUpperCase();

        // Determinar qué fecha usar para el filtro
        let dateStr = v.fechaInicio || v.fecha;

        // PRIORITY: FECHA PERIODO > FECHA FIN > FECHA ACTIVACION > FECHA INICIO
        if (v.fechaPeriodo) {
            // Format: MM/YYYY
            dateStr = `01/${v.fechaPeriodo}`; // Fake a full date for the existing parser below
        } else if (finalStatuses.includes(estadoUpper)) {
            // Para ventas cerradas, usar fecha de cierre/activación si existe
            dateStr = v.fechaFin || v.fechaActivacion || dateStr;
        }

        let isTimeMatch = false;

        if (dateStr) {
            const datePart = dateStr.split(',')[0].trim(); // DD/MM/YYYY
            const parts = datePart.split('/');
            if (parts.length >= 3) {
                const m = parseInt(parts[1]);
                const y = parseInt(parts[2]);

                // Determine target month/year based on Role
                // Admin/Special can filter. Standard/Others are locked to current.
                const canFilterDate = isAdmin || isBackOffice || isSupervisorUser;
                const targetMonth = canFilterDate ? selectedMonth : (new Date().getMonth() + 1);
                const targetYear = canFilterDate ? selectedYear : (new Date().getFullYear());

                const realTargetMonth = new Date().getMonth() + 1;
                const realTargetYear = new Date().getFullYear();
                const isViewingCurrentMonth = targetMonth === realTargetMonth && targetYear === realTargetYear;

                if (finalStatuses.includes(estadoUpper)) {
                    // Closed deals: Strict filter (only in the month they were closed)
                    isTimeMatch = (m === targetMonth && y === targetYear);
                } else {
                    // Open deals: ONLY show in the current real month
                    // If viewing history (past months), hide them.
                    if (isViewingCurrentMonth) {
                        if (y < targetYear) isTimeMatch = true;
                        else if (y === targetYear && m <= targetMonth) isTimeMatch = true;
                    } else {
                        isTimeMatch = false;
                    }
                }
            }
        }

        return matchesRuc && matchesEjecutivo && matchesSupervisor && matchesEstado && isTimeMatch;
    }).sort((a, b) => {
        const statusMap: Record<string, number> = {
            'PENDIENTE APROBACION': 1,
            'NUEVO INGRESO': 2,
            'PENDIENTE': 3,
            'INGRESADO': 5,
            'ACTIVADO': 6
        };

        const getWeight = (status: string) => {
            const s = (status || '').trim().toUpperCase();
            return statusMap[s] || 4; // Default weight is 4 for any other status
        };

        return getWeight(a.estado) - getWeight(b.estado);
    });

    const handleExportExcel = async () => {
        await exportVentasToExcel(filteredVentas, selectedMonth, selectedYear);
    };

    const uniqueEjecutivos = Array.from(new Set(ventas.map(v => v.ejecutivo).filter(Boolean))).sort();
    const uniqueSupervisores = Array.from(new Set(ventas.map(v => v.supervisor).filter(Boolean))).sort();

    const isCurrentMonthView = selectedMonth === (new Date().getMonth() + 1) && selectedYear === new Date().getFullYear();

    const stats = {
        total: filteredVentas.filter(v => {
            if (!isCurrentMonthView) return v.estado === 'ACTIVADO';
            const today = new Date().toLocaleDateString('es-PE');
            return v.estado === 'ACTIVADO' && (v.fechaFin?.includes(today) || v.fecha?.includes(today));
        }).length,
        totalCF: filteredVentas.filter(v => {
            if (!isCurrentMonthView) return v.estado === 'ACTIVADO';
            const today = new Date().toLocaleDateString('es-PE');
            return v.estado === 'ACTIVADO' && (v.fechaFin?.includes(today) || v.fecha?.includes(today));
        }).reduce((acc, v) => acc + ((parseFloat(v.cargoFijo?.toString().replace(/,/g, '') || '0') || 0) / 1.18), 0),
        totalLineas: filteredVentas.filter(v => {
            if (!isCurrentMonthView) return v.estado === 'ACTIVADO';
            const today = new Date().toLocaleDateString('es-PE');
            return v.estado === 'ACTIVADO' && (v.fechaFin?.includes(today) || v.fecha?.includes(today));
        }).reduce((acc, v) => acc + (parseInt(v.lineas) || 0), 0)
    };

    if (loading) return (
        <div className="linker-loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Cargando Linker...</div>
        </div>
    );

    if (openedSaleId && editModeData) {
        return (
            <div className="linker-root animate-in">
                <style jsx>{`
                    .dv-container {
                        background: rgba(10, 10, 11, 0.4);
                        backdrop-filter: blur(40px);
                        -webkit-backdrop-filter: blur(40px);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 3rem;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        min-height: 80vh;
                        box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
                    }

                    .dv-header {
                        padding: 2rem 3rem;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        background: rgba(255, 255, 255, 0.01);
                    }

                    .dv-header-actions {
                        display: flex;
                        gap: 1.5rem;
                        align-items: center;
                    }

                    .dv-header-left {
                        display: flex;
                        align-items: center;
                        gap: 2.5rem;
                    }

                    .dv-btn-back {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        padding: 0.8rem 1.5rem;
                        background: rgba(255, 255, 255, 0.05);
                        color: #9ca3af;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 1.25rem;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        font-weight: 950;
                        font-size: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }

                    .dv-btn-back:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: #fff;
                        transform: translateX(-3px);
                    }

                    .dv-btn-back svg {
                        width: 14px;
                        height: 14px;
                        stroke-width: 3;
                    }

                    .dv-title-group h2 {
                        font-size: 1.5rem;
                        font-weight: 950;
                        color: #fff;
                        text-transform: uppercase;
                        letter-spacing: -0.03em;
                        margin: 0;
                    }

                    .dv-title-group p {
                        font-size: 10px;
                        color: #10b981;
                        font-weight: 900;
                text-transform: uppercase;
                        letter-spacing: 0.3em;
                        margin-top: 0.25rem;
                    }

                    .dv-btn-action {
                        padding: 0.8rem 1.8rem;
                        border: none;
                        border-radius: 1.1rem;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        font-weight: 950;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                    }

                    .dv-btn-action.emerald {
                        background: #10b981;
                        color: #000;
                        box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3);
                    }

                    .dv-btn-action.emerald:hover:not(:disabled) {
                        background: #34d399;
                        transform: translateY(-2px);
                        box-shadow: 0 15px 30px -5px rgba(16, 185, 129, 0.4);
                    }

                    .dv-btn-action.pink {
                        background: rgba(236, 72, 153, 0.1);
                        color: #ec4899;
                        border: 1px solid rgba(236, 72, 153, 0.3);
                    }

                    .dv-btn-action.pink:hover:not(:disabled) {
                        background: #ec4899;
                        color: #fff;
                        transform: translateY(-2px);
                        box-shadow: 0 15px 30px -5px rgba(236, 72, 153, 0.4);
                    }

                    .dv-btn-action:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .dv-btn-save:active:not(:disabled) {
                        transform: translateY(0) scale(0.98);
                    }

                    .dv-btn-save:disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                        filter: grayscale(1);
                    }

                    .dv-body {
                        flex: 1;
                        overflow-y: auto;
                        padding: 3.5rem;
                    }

                    .dv-grid {
                        max-width: 1300px;
                        margin: 0 auto;
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 3.5rem;
                    }

                    @media (min-width: 1024px) {
                        .dv-grid {
                            grid-template-columns: ${isAuthorizedToEdit ? '400px 1fr' : '1fr'};
                        }
                    }

                    .dv-card {
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 2.5rem;
                        padding: 2.5rem;
                        transition: border-color 0.3s;
                    }

                    .dv-card:hover {
                        border-color: rgba(255, 255, 255, 0.15);
                    }

                    .dv-card-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 2rem;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        padding-bottom: 1.25rem;
                    }

                    .dv-card-title {
                        font-size: 11px;
                        font-weight: 950;
                        text-transform: uppercase;
                        letter-spacing: 0.3em;
                    }

                    .dv-card-title.indigo { color: #818cf8; }
                    .dv-card-title.emerald { color: #10b981; }
                    .dv-card-title.pink { color: #f472b6; }
                    .dv-card-title.amber { color: #fbbf24; }

                    .dv-form-stack {
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                    }

                    .dv-field-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.75rem;
                    }

                    .dv-label {
                        font-size: 11px;
                        font-weight: 900;
                        color: #52525b;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        margin-left: 0.5rem;
                    }

                    .dv-input, .dv-select, .dv-textarea {
                        width: 100%;
                        background: rgba(0, 0, 0, 0.4);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 1.25rem;
                        padding: 1.1rem;
                        color: #fff;
                        font-weight: 700;
                        font-size: 14px;
                        outline: none;
                        transition: all 0.3s;
                    }

                    .dv-input:focus, .dv-select:focus, .dv-textarea:focus {
                        border-color: #10b981;
                        background: rgba(0, 0, 0, 0.6);
                        box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
                    }

                    .dv-select option {
                        background-color: #0a0a0b;
                        color: #fff;
                        padding: 10px;
                    }

                    .dv-textarea {
                        resize: none;
                        line-height: 1.6;
                    }

                    /* Chat Styles */
                    .chat-panel {
                        display: flex;
                        flex-direction: column;
                        height: 600px;
                        background: rgba(0, 0, 0, 0.4);
                        border-radius: 2rem;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        overflow: hidden;
                    }

                    .chat-header {
                        padding: 1.5rem;
                        background: rgba(255, 255, 255, 0.02);
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                    }

                    .chat-title {
                        font-size: 11px;
                        font-weight: 950;
                        text-transform: uppercase;
                        letter-spacing: 0.2em;
                        color: #10b981;
                    }

                    .chat-messages {
                        flex: 1;
                        padding: 1.5rem;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 1.5rem;
                    }

                    .chat-bubble {
                        max-width: 80%;
                        padding: 1rem 1.25rem;
                        border-radius: 1.25rem;
                        position: relative;
                        animation: message-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
                    }

                    .chat-bubble.sent {
                        align-self: flex-end;
                        background: rgba(16, 185, 129, 0.15);
                        border: 1px solid rgba(16, 185, 129, 0.2);
                        border-bottom-right-radius: 0.25rem;
                    }

                    .chat-bubble.received {
                        align-self: flex-start;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-bottom-left-radius: 0.25rem;
                    }

                    .msg-user {
                        font-size: 10px;
                        font-weight: 950;
                        text-transform: uppercase;
                        margin-bottom: 0.35rem;
                        display: block;
                    }

                    .sent .msg-user { color: #10b981; }
                    .received .msg-user { color: #818cf8; }

                    .msg-text {
                        font-size: 14px;
                        color: #e4e4e7;
                        line-height: 1.5;
                        word-break: break-word;
                    }

                    .msg-date {
                        font-size: 9px;
                        color: rgba(255, 255, 255, 0.2);
                        margin-top: 0.5rem;
                        display: block;
                        text-align: right;
                    }

                    .chat-input-area {
                        padding: 1.25rem;
                        background: rgba(0, 0, 0, 0.4);
                        border-top: 1px solid rgba(255, 255, 255, 0.05);
                        display: flex;
                        gap: 0.75rem;
                    }

                    .chat-input {
                        flex: 1;
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 1rem;
                        padding: 0.85rem 1.25rem;
                        color: #fff;
                        font-size: 14px;
                        outline: none;
                        transition: all 0.3s;
                    }

                    .chat-input:focus {
                        border-color: #10b981;
                        background: rgba(255, 255, 255, 0.05);
                    }

                    .btn-send {
                        width: 45px;
                        height: 45px;
                        background: #10b981;
                        color: #000;
                        border: none;
                        border-radius: 1rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .btn-send:hover { transform: scale(1.05); background: #34d399; }
                    .btn-send:active { transform: scale(0.95); }

                    @keyframes message-in {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .dv-info-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 2.5rem;
                    }

                    @media (min-width: 768px) {
                        .dv-info-grid-2cols {
                            grid-template-columns: 1fr 1fr;
                        }
                        .dv-info-grid-4cols {
                            grid-template-columns: repeat(4, 1fr);
                        }
                    }

                    .dv-display-field {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .dv-display-label {
                        font-size: 10px;
                        font-weight: 950;
                        color: #52525b;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }

                    .dv-display-value {
                        font-size: 1rem;
                        font-weight: 900;
                        color: #fff;
                        text-transform: uppercase;
                        line-height: 1.2;
                    }

                    .dv-display-value.mono {
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                        color: #71717a;
                        font-size: 0.9rem;
                    }

                    .dv-display-value.xl {
                        font-size: 1.5rem;
                        letter-spacing: -0.05em;
                    }

                    .dv-highlight-pink { color: #ec4899; }
                    .dv-highlight-emerald { color: #10b981; }
                    .dv-highlight-indigo { color: #818cf8; }

                    .dv-meta-card {
                        background: rgba(79, 70, 229, 0.05);
                        border-color: rgba(79, 70, 229, 0.1);
                    }

                    .dv-meta-label { color: rgba(129, 140, 248, 0.5); }
                    .dv-meta-value { color: #c7d2fe; font-size: 12px; }

                    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                `}</style>

                <div className="dv-container">
                    <div className="dv-header">
                        <div className="dv-header-left">
                            <button onClick={() => setOpenedSaleId(null)} className="dv-btn-back">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                Volver al Listado
                            </button>
                            <div className="dv-title-group">
                                <h2>Expediente #{openedSaleId}</h2>
                                <p>Sincronización en Tiempo Real</p>
                            </div>
                        </div>
                        <div className="dv-header-actions">
                            {isAuthorizedToEdit && (
                                <>
                                    <button
                                        onClick={() => {
                                            setCorrectionSaleData(editModeData);
                                            setIsCorrectionModalOpen(true);
                                        }}
                                        className="dv-btn-action pink"
                                    >
                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-.5-4.5l7-7 7 7" /></svg>
                                        ACTUALIZAR DATOS
                                    </button>
                                    <button
                                        onClick={handleDetailedUpdate}
                                        disabled={!!updatingStatus}
                                        className="dv-btn-action emerald"
                                    >
                                        {updatingStatus ? 'Procesando...' : 'Guardar Estado'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="dv-body custom-scrollbar">
                        <div className="dv-grid">
                            {/* Control Part */}
                            <div className="dv-form-stack">
                                {isAuthorizedToEdit && (
                                    <div className="dv-card">
                                        <div className="dv-card-header">
                                            <h3 className="dv-card-title indigo">Gestión de Control</h3>
                                            <svg width="20" height="20" style={{ opacity: 0.2 }} fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                                        </div>
                                        <div className="dv-form-stack">
                                            <div className="dv-field-group">
                                                <span className="dv-label">Estado del Proceso</span>
                                                <select
                                                    className="dv-select"
                                                    value={editModeData.estado}
                                                    onChange={e => setEditModeData({ ...editModeData, estado: e.target.value })}
                                                    disabled={!isAuthorizedToEdit}
                                                >
                                                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <div className="dv-field-group">
                                                <span className="dv-label">SR de Ingreso</span>
                                                <input
                                                    type="text"
                                                    className="dv-input"
                                                    value={editModeData.srIngreso}
                                                    onChange={e => setEditModeData({ ...editModeData, srIngreso: e.target.value })}
                                                    placeholder="SR-000000"
                                                    disabled={!isAuthorizedToEdit}
                                                />
                                            </div>
                                            <div className="dv-field-group">
                                                <span className="dv-label">Número de Orden</span>
                                                <input
                                                    type="text"
                                                    className="dv-input"
                                                    value={editModeData.numOrden}
                                                    onChange={e => setEditModeData({ ...editModeData, numOrden: e.target.value })}
                                                    placeholder="70000000"
                                                    disabled={!isAuthorizedToEdit}
                                                />
                                            </div>
                                            <div className="dv-field-group">
                                                <span className="dv-label">Fecha de Activación</span>
                                                <input
                                                    type="date"
                                                    className="dv-input"
                                                    value={editModeData.fechaActivacion}
                                                    onChange={e => setEditModeData({ ...editModeData, fechaActivacion: e.target.value })}
                                                    disabled={!isAuthorizedToEdit}
                                                />
                                            </div>
                                            <div className="dv-field-group">
                                                <span className="dv-label">Período de Reporte</span>
                                                <select
                                                    className="dv-select"
                                                    value={editModeData.fechaPeriodo}
                                                    onChange={e => setEditModeData({ ...editModeData, fechaPeriodo: e.target.value })}
                                                    disabled={!isAuthorizedToEdit}
                                                >
                                                    {Object.entries(PERIOD_OPTIONS).map(([val, label]) => (
                                                        <option key={val} value={val}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="dv-field-group">
                                                <span className="dv-label">Observaciones Mesa</span>
                                                <textarea
                                                    className="dv-textarea"
                                                    value={editModeData.observacion}
                                                    onChange={e => setEditModeData({ ...editModeData, observacion: e.target.value })}
                                                    rows={5}
                                                    placeholder="Detalles técnicos..."
                                                    disabled={!isAuthorizedToEdit}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Data Part */}
                            <div className="dv-form-stack">
                                {/* Chat Section moved here or beside info */}
                                <div className="chat-panel">
                                    <div className="chat-header">
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
                                        <h3 className="chat-title">Mensajería del Expediente</h3>
                                        {loadingChat && <span style={{ fontSize: '10px', color: '#71717a' }}>Sincronizando...</span>}
                                    </div>
                                    <div className="chat-messages custom-scrollbar" ref={chatContainerRef}>
                                        {chatMessages.length === 0 ? (
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.3 }}>
                                                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                <p style={{ marginTop: '1rem', fontSize: '12px', fontWeight: 'bold' }}>Sin mensajes aún</p>
                                            </div>
                                        ) : (
                                            chatMessages.map((msg, i) => (
                                                <div key={i} className={`chat-bubble ${msg.usuario === currentUserName ? 'sent' : 'received'}`}>
                                                    <span className="msg-user">{msg.usuario} {msg.tipo === 'STAFF' ? '• STAFF' : ''}</span>
                                                    <p className="msg-text">{msg.mensaje}</p>
                                                    <span className="msg-date">{msg.fecha}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="chat-input-area">
                                        <input
                                            type="text"
                                            className="chat-input"
                                            placeholder="Escribe un mensaje..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        />
                                        <button className="btn-send" onClick={handleSendMessage}>
                                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="dv-info-grid dv-info-grid-2cols">
                                    <div className="dv-card">
                                        <h3 className="dv-card-title emerald">Cliente</h3>
                                        <div className="dv-info-grid" style={{ marginTop: '2rem' }}>
                                            <div className="dv-display-field">
                                                <span className="dv-display-label">Razón Social</span>
                                                <span className="dv-display-value">{editModeData.razonSocial}</span>
                                            </div>
                                            <div className="dv-info-grid dv-info-grid-2cols">
                                                <div className="dv-display-field">
                                                    <span className="dv-display-label">RUC</span>
                                                    <span className="dv-display-value mono">{editModeData.ruc}</span>
                                                </div>
                                                <div className="dv-display-field">
                                                    <span className="dv-display-label">Segmento</span>
                                                    <span className="dv-display-value dv-highlight-emerald">{editModeData.segmento}</span>
                                                </div>
                                            </div>
                                            <div className="dv-display-field" style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <span className="dv-display-label">Contacto / Teléfono</span>
                                                <span className="dv-display-value" style={{ fontSize: '14px' }}>{editModeData.contacto}</span>
                                                <span className="dv-display-value mono" style={{ marginTop: '0.25rem' }}>{editModeData.telefono}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dv-card">
                                        <h3 className="dv-card-title pink">Comercial</h3>
                                        <div className="dv-info-grid" style={{ marginTop: '2rem' }}>
                                            <div className="dv-display-field" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <span className="dv-display-label">Oferta</span>
                                                <span className="dv-display-value xl">S/.{((parseFloat(editModeData.cargoFijo?.toString().replace(/,/g, '') || '0') || 0) / 1.18).toFixed(2)} <span style={{ color: '#52525b', fontSize: '1rem' }}>x</span> {editModeData.lineas} LÍN.</span>
                                                {editModeData.descuento && <span className="dv-display-value dv-highlight-pink" style={{ fontSize: '10px', marginTop: '0.5rem' }}>{editModeData.descuento}% DESC. APLICADO</span>}
                                            </div>
                                            <div className="dv-info-grid dv-info-grid-2cols">
                                                <div className="dv-display-field"><span className="dv-display-label">Proceso</span><span className="dv-display-value" style={{ fontSize: '12px' }}>{editModeData.proceso}</span></div>
                                                <div className="dv-display-field"><span className="dv-display-label">Detalle</span><span className="dv-display-value" style={{ fontSize: '12px' }}>{editModeData.detalle}</span></div>
                                                <div className="dv-display-field"><span className="dv-display-label">Mesa</span><span className="dv-display-value dv-highlight-indigo" style={{ fontSize: '12px' }}>{editModeData.mesaAsignada || 'PEND.'}</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dv-card" style={{ gridColumn: 'span 2' }}>
                                        <h3 className="dv-card-title amber">Logística</h3>
                                        <div className="dv-info-grid dv-info-grid-4cols" style={{ marginTop: '2rem' }}>
                                            <div className="dv-display-field"><span className="dv-display-label">Departamento</span><span className="dv-display-value" style={{ fontSize: '12px' }}>{editModeData.departamento}</span></div>
                                            <div className="dv-display-field"><span className="dv-display-label">Provincia</span><span className="dv-display-value" style={{ fontSize: '12px' }}>{editModeData.provincia}</span></div>
                                            <div className="dv-display-field" style={{ gridColumn: 'span 2' }}><span className="dv-display-label">Dirección</span><span className="dv-display-value" style={{ fontSize: '12px', fontStyle: 'italic' }}>{editModeData.direccion}</span></div>
                                        </div>
                                    </div>

                                    <div className="dv-card dv-meta-card" style={{ gridColumn: 'span 2' }}>
                                        <div className="dv-info-grid dv-info-grid-5cols">
                                            <div className="dv-display-field"><span className="dv-display-label dv-meta-label">Ejecutivo</span><span className="dv-display-value dv-meta-value">{editModeData.ejecutivo}</span></div>
                                            <div className="dv-display-field"><span className="dv-display-label dv-meta-label">Supervisor</span><span className="dv-display-value dv-meta-value">{editModeData.supervisor}</span></div>
                                            <div className="dv-display-field"><span className="dv-display-label dv-meta-label">Inicio</span><span className="dv-display-value dv-meta-value">{editModeData.fechaInicio}</span></div>
                                            <div className="dv-display-field">
                                                <span className="dv-display-label dv-meta-label">ARCHIVOS</span>
                                                {editModeData.idSustentos ? (
                                                    <div className="relative files-dropdown-holder">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenFilesId(openFilesId === 'detailed' ? null : 'detailed');
                                                            }}
                                                            className={`btn-file-main ${openFilesId === 'detailed' ? 'active' : ''}`}
                                                            style={{ marginTop: '0.5rem', width: 'fit-content' }}
                                                        >
                                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                            VER ARCHIVOS
                                                        </button>

                                                        {openFilesId === 'detailed' && (
                                                            <div className="files-dropdown-menu" onClick={(e) => e.stopPropagation()} style={{ left: 0, right: 'auto', top: 'calc(100% + 8px)', transformOrigin: 'top left' }}>
                                                                {editModeData.idSustentos.split(' - ').map((id: string, idx: number) => (
                                                                    <div key={idx} className="file-item-mini">
                                                                        <div className="file-info-mini">
                                                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.6 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                            <span className="file-name-mini">Sustento {idx + 1}</span>
                                                                            <span className="file-id-mini">ID: {id.trim().substring(0, 10)}...</span>
                                                                        </div>
                                                                        <div className="flex gap-3">
                                                                            <a
                                                                                href={`https://drive.google.com/file/d/${id.trim()}/view`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="file-action-icon"
                                                                            >
                                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                            </a>
                                                                            <a
                                                                                href={`https://drive.google.com/uc?export=download&id=${id.trim()}`}
                                                                                target="_blank"
                                                                                className="file-action-icon blue"
                                                                            >
                                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="dv-display-value dv-meta-value">---</span>
                                                )}
                                            </div>
                                            <div className="dv-display-field"><span className="dv-display-label dv-meta-label">Aprobación</span><span className="dv-display-value dv-meta-value">{editModeData.aprobacion || 'PEND.'}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <SubirVentaModal
                    isOpen={isCorrectionModalOpen}
                    onClose={() => setIsCorrectionModalOpen(false)}
                    leadData={null}
                    ejecutivo={correctionSaleData?.ejecutivo || ''}
                    onSuccess={loadData}
                    editSaleData={correctionSaleData}
                />
            </div>
        );
    }

    return (
        <div className="linker-root animate-in">
            <div className="linker-header">
                {/* Title and Stats Row */}
                <div className="header-top">
                    <div className="title-wrapper">
                        <h1 className="linker-title">GESTIÓN DE VENTAS</h1>
                        <div className="title-accent"></div>
                    </div>
                    <div className="stats-container">
                        <div className="stat-item emerald">
                            <span className="stat-label">Ventas Activadas {isCurrentMonthView ? 'Hoy' : 'Mes'}</span>
                            <span className="stat-value">{stats.total}</span>
                        </div>
                        <div className="stat-item indigo">
                            <span className="stat-label">Producción Neta {isCurrentMonthView ? 'Hoy' : 'Mes'}</span>
                            <span className="stat-value">S/ {stats.totalCF.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="stat-item pink">
                            <span className="stat-label">Líneas Activadas {isCurrentMonthView ? 'Hoy' : 'Mes'}</span>
                            <span className="stat-value">{stats.totalLineas}</span>
                        </div>
                        <div className="stat-item emerald-soft">
                            <span className="stat-label">Estado Sistema</span>
                            <span className="stat-value pulse">CONECTADO</span>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="header-bottom">
                    <div className="filter-group search">
                        <span className="filter-label">Buscar Empresa / RUC</span>
                        <div className="filter-input-wrapper">
                            <input
                                type="text"
                                value={filterRuc}
                                onChange={e => setFilterRuc(e.target.value)}
                                placeholder="20123456789..."
                                className="linker-input"
                            />
                            {filterRuc && (
                                <button onClick={() => setFilterRuc('')} className="clear-btn">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {(currentUserRole === 'ADMIN' || currentUserRole === 'SPECIAL' || currentUserCargo?.includes('SUPERVISOR')) && (
                        <>
                            <div className="filter-group">
                                <span className="filter-label">Ejecutivo</span>
                                <select
                                    value={filterEjecutivo}
                                    onChange={e => setFilterEjecutivo(e.target.value)}
                                    className="linker-select"
                                >
                                    <option value="">TODOS</option>
                                    {uniqueEjecutivos.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>

                            <div className="filter-group">
                                <span className="filter-label">Supervisor</span>
                                <select
                                    value={filterSupervisor}
                                    onChange={e => setFilterSupervisor(e.target.value)}
                                    className="linker-select"
                                >
                                    <option value="">TODOS</option>
                                    {uniqueSupervisores.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Month/Year Filters */}
                            <div className="filter-group-row" style={{ flex: 1.2 }}>
                                <div className="filter-group">
                                    <span className="filter-label">Mes</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(Number(e.target.value))}
                                        className="linker-select"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>
                                                {new Date(2000, m - 1).toLocaleString('es-PE', { month: 'long' }).toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <span className="filter-label">Año</span>
                                    <select
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(Number(e.target.value))}
                                        className="linker-select"
                                    >
                                        <option value={2024}>2024</option>
                                        <option value={2025}>2025</option>
                                        <option value={2026}>2026</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="filter-group">
                        <span className="filter-label">Estado</span>
                        <select
                            value={filterEstado}
                            onChange={e => setFilterEstado(e.target.value)}
                            className="linker-select"
                        >
                            <option value="">TODOS</option>
                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="header-actions">
                        {isAuthorizedToEdit && (
                            <button
                                onClick={handleExportExcel}
                                className="btn-export"
                                style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '1rem',
                                    fontSize: '11px',
                                    fontWeight: '950',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Exportar Excel
                            </button>
                        )}
                        <button onClick={() => { setFilterRuc(''); setFilterEjecutivo(''); setFilterSupervisor(''); setFilterEstado(''); }} className="btn-text">
                            Limpiar
                        </button>
                        <button onClick={loadData} disabled={loading} className="btn-refresh">
                            <span className={loading ? 'spinning' : ''}>↻</span>
                        </button>
                    </div>
                </div>
            </div>


            <div className="table-container">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="linker-table">
                        <thead>
                            <tr className="table-header-row">
                                <th className="table-header" style={{ width: '80px' }}>ID</th>
                                <th className="table-header" style={{ textAlign: 'left', minWidth: '300px' }}>RUC / Cliente</th>
                                <th className="table-header">Estado</th>
                                <th className="table-header">Fecha</th>
                                <th className="table-header">Detalle</th>
                                <th className="table-header">Proceso</th>
                                {!isStandardEjecutivo && <th className="table-header">Ejecutivo</th>}
                                <th className="table-header">Cargo Fijo</th>
                                <th className="table-header">Líneas</th>
                                <th className="table-header">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="table-body">
                            {filteredVentas.map((v, index) => (
                                <React.Fragment key={`${v.id}-${index}`}>
                                    <tr
                                        key={v.id}
                                        className={`record-row ${expandedRow === v.id ? 'expanded' : ''} ${openStatusDropdownId === v.id ? 'dropdown-active' : ''}`}
                                        style={{
                                            zIndex: openFilesId === v.id ? 10000 : (openStatusDropdownId === v.id ? 9000 : 1),
                                            position: 'relative',
                                            transform: (openFilesId === v.id || openStatusDropdownId === v.id) ? 'translateZ(0)' : 'none',
                                            animationDelay: `${index * 0.05}s`
                                        }}
                                    >
                                        <td className="table-cell first-col">
                                            <span className="badge-id">{v.id}</span>
                                        </td>
                                        <td className="table-cell-left">
                                            <div className="client-info-stack">
                                                <span className="client-name">{v.razonSocial}</span>
                                                <span className="client-ruc">{v.ruc}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <div className="flex items-center justify-center gap-3">
                                                {(isAuthorizedToEdit && (currentUserRole === 'ADMIN' || (v.estado !== 'PENDIENTE' && v.estado !== 'PENDIENTE APROBACION'))) ? (
                                                    <div className="relative status-dropdown-container">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenStatusDropdownId(openStatusDropdownId === v.id ? null : v.id);
                                                            }}
                                                            disabled={updatingStatus === v.id}
                                                            className={`status-pill status-pill-interactive ${STATUS_COLORS[v.estado] || 'status-gray'}`}
                                                        >
                                                            {v.estado}
                                                            <svg className={`status-arrow ${openStatusDropdownId === v.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>

                                                        {openStatusDropdownId === v.id && (
                                                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                                {STATUS_OPTIONS.map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleStatusUpdate(v.id, opt);
                                                                            setOpenStatusDropdownId(null);
                                                                        }}
                                                                        className={`dropdown-item ${v.estado === opt ? 'active' : ''}`}
                                                                    >
                                                                        {opt}
                                                                        {v.estado === opt && (
                                                                            <div className="dropdown-dot" />
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className={`status-pill animate-badge-entrance ${STATUS_COLORS[v.estado] || 'status-gray'}`}>
                                                        {v.estado}
                                                    </span>
                                                )}

                                                {/* Actions moved beside the pill for supervisors */}
                                                {isSupervisor && v.estado === 'PENDIENTE APROBACION' && (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(v.id, 'NUEVO INGRESO'); }}
                                                                disabled={updatingStatus === v.id}
                                                                title="Aprobar (NUEVO INGRESO)"
                                                                className="btn-action-base btn-approve small-btn"
                                                            >
                                                                <svg className="icon-svg-small" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(v.id, 'RECHAZADO'); }}
                                                                disabled={updatingStatus === v.id}
                                                                title="Rechazar (RECHAZADO)"
                                                                className="btn-action-base btn-reject small-btn"
                                                            >
                                                                <svg className="icon-svg-small" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCorrectionSaleData(v);
                                                                setIsCorrectionModalOpen(true);
                                                            }}
                                                            className="btn-correct-venta"
                                                        >
                                                            CORREGIR VENTA
                                                        </button>
                                                    </div>
                                                )}
                                                {isSupervisor && (v.estado === 'NUEVO INGRESO' || v.estado === 'RECHAZADO') && (
                                                    <span style={{ fontSize: '12px', color: '#71717a', fontStyle: 'italic', opacity: 0.6 }}>Completado</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 'bold' }}>
                                                {/* ... date logic ... */}
                                                {(() => {
                                                    if (v.fechaPeriodo) return v.fechaPeriodo;
                                                    const rawDate = (v.estado === 'ACTIVADO' || v.estado === 'RECHAZADO')
                                                        ? (v.fechaFin || v.fechaInicio || '---')
                                                        : (v.fechaInicio || '---');
                                                    return rawDate.includes(',') ? rawDate.split(',')[0] : rawDate;
                                                })()}
                                            </span>
                                        </td>
                                        <td className="table-cell">
                                            <span style={{ fontSize: '13px', color: '#818cf8', fontWeight: '950', textTransform: 'uppercase' }}>{v.detalle || ''}</span>
                                        </td>
                                        <td className="table-cell">
                                            <span style={{ fontSize: '13px', color: '#71717a', fontWeight: '950', textTransform: 'uppercase' }}>{v.proceso || ''}</span>
                                        </td>
                                        {!isStandardEjecutivo && (
                                            <td className="table-cell">
                                                <div className="flex flex-col items-center">
                                                    <span style={{ fontSize: '13px', fontWeight: '950', color: '#d4d4d8', textTransform: 'uppercase' }}>{v.ejecutivo}</span>
                                                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#52525b', marginTop: '1px' }}>{v.supervisor}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="table-cell">
                                            <div className="flex flex-col items-center">
                                                <span className="text-bold-white" style={{ fontSize: '13px' }}>
                                                    S/. {((parseFloat(v.cargoFijo?.toString().replace(/,/g, '') || '0') || 0) / 1.18).toFixed(2)}
                                                </span>
                                                {isAuthorizedToEdit && (
                                                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '900', marginTop: '2px' }}>
                                                        S/. {(((parseFloat(v.cargoFijo?.toString().replace(/,/g, '') || '0') || 0) / 1.18) / (parseInt(v.lineas?.toString().replace(/,/g, '') || '1') || 1)).toFixed(2)} ARPU
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <div className="badge-lines" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                                                <span>{v.lineas}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell last-col">
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}
                                                    className={`btn-details ${expandedRow === v.id ? 'active' : ''}`}
                                                >
                                                    {expandedRow === v.id ? 'Cerrar' : 'Ver Más'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setOpenedSaleId(v.id);
                                                        setEditModeData({
                                                            ...v,
                                                            fechaPeriodo: v.fechaPeriodo || CURRENT_PERIOD
                                                        });
                                                    }}
                                                    className="btn-open"
                                                >
                                                    Abrir Registro
                                                </button>
                                                {v.idSustentos && (
                                                    <div className="relative files-dropdown-holder">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenFilesId(openFilesId === v.id ? null : v.id);
                                                            }}
                                                            className={`btn-file-main ${openFilesId === v.id ? 'active' : ''}`}
                                                        >
                                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                            VER ARCHIVOS
                                                        </button>

                                                        {openFilesId === v.id && (
                                                            <div className="files-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                                <div className="files-dropdown-header">
                                                                    <div className="flex items-center gap-2">
                                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                        <span>Archivos</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            className="btn-open-all"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const ids = v.idSustentos.split(' - ');
                                                                                ids.forEach((id: string, idx: number) => {
                                                                                    setTimeout(() => {
                                                                                        window.open(`https://drive.google.com/file/d/${id.trim()}/view`, '_blank');
                                                                                    }, idx * 250);
                                                                                });
                                                                            }}
                                                                        >
                                                                            ABRIR
                                                                        </button>
                                                                        <button
                                                                            className="btn-download-all"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const ids = v.idSustentos.split(' - ');
                                                                                ids.forEach((id: string, idx: number) => {
                                                                                    setTimeout(() => {
                                                                                        const link = document.createElement('a');
                                                                                        link.href = `https://drive.google.com/uc?export=download&id=${id.trim()}`;
                                                                                        link.target = '_blank';
                                                                                        document.body.appendChild(link);
                                                                                        link.click();
                                                                                        document.body.removeChild(link);
                                                                                    }, idx * 400);
                                                                                });
                                                                            }}
                                                                        >
                                                                            DESC.
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="files-list custom-scrollbar">
                                                                    {v.idSustentos.split(' - ').map((id: string, idx: number) => (
                                                                        <div key={idx} className="file-item">
                                                                            <div className="file-info">
                                                                                <span className="file-name">Sustento {idx + 1}</span>
                                                                                <span className="file-id">ID: {id.trim().substring(0, 10)}...</span>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <a
                                                                                    href={`https://drive.google.com/file/d/${id.trim()}/view`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="file-action-btn"
                                                                                    title="Abrir"
                                                                                >
                                                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                                </a>
                                                                                <a
                                                                                    href={`https://drive.google.com/uc?export=download&id=${id.trim()}`}
                                                                                    target="_blank"
                                                                                    className="file-action-btn download"
                                                                                    title="Descargar"
                                                                                >
                                                                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Row Design */}
                                    {expandedRow === v.id && (
                                        <tr className="bg-white/[0.01]">
                                            <td colSpan={isStandardEjecutivo ? 9 : 10} className="expanded-container">
                                                <div className="expanded-grid animate-in slide-in-from-top-4 duration-500">
                                                    <div className="info-block">
                                                        <div className="info-header">
                                                            <div className="info-icon-wrapper emerald">
                                                                <svg className="icon-svg-small" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                                                            </div>
                                                            <h4 className="info-label-main">Titular</h4>
                                                        </div>
                                                        <div className="info-block" style={{ gap: '1rem', paddingLeft: '0.25rem' }}>
                                                            <div className="info-item"><span className="info-label-sub">Contacto Directo</span><p className="info-value-text">{v.contacto}</p></div>
                                                            <div className="info-item"><span className="info-label-sub">DNI / Documento</span><p className="info-value-text">{v.dni}</p></div>
                                                            <div className="info-item"><span className="info-label-sub">Teléfono Enlace</span><p className="info-value-mono">{v.telefono}</p></div>
                                                            <div className="info-item"><span className="info-label-sub">Correo Electrónico</span><p className="info-value-text" style={{ fontSize: '13px', wordBreak: 'break-all', textDecoration: 'underline' }}>{v.correo}</p></div>
                                                        </div>
                                                    </div>

                                                    <div className="info-block">
                                                        <div className="info-header">
                                                            <div className="info-icon-wrapper indigo">
                                                                <svg className="icon-svg-small" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                                            </div>
                                                            <h4 className="info-label-main">Instalación</h4>
                                                        </div>
                                                        <div className="info-block" style={{ gap: '1rem', paddingLeft: '0.25rem' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                                <div className="info-item"><span className="info-label-sub">Región</span><p className="info-value-text" style={{ fontSize: '14px' }}>{v.departamento}</p></div>
                                                                <div className="info-item"><span className="info-label-sub">Ciudad</span><p className="info-value-text" style={{ fontSize: '14px' }}>{v.provincia}</p></div>
                                                            </div>
                                                            <div className="info-item"><span className="info-label-sub">Distrito</span><p className="info-value-text" style={{ fontSize: '14px' }}>{v.distrito}</p></div>
                                                            <div className="info-item"><span className="info-label-sub">Dirección Exacta</span><p className="info-value-text" style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.4' }}>{v.direccion}</p></div>
                                                        </div>
                                                    </div>

                                                    <div className="info-block">
                                                        <div className="info-header">
                                                            <div className="info-icon-wrapper pink">
                                                                <svg className="icon-svg-small" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                                                            </div>
                                                            <h4 className="info-label-main">Operación</h4>
                                                        </div>
                                                        <div className="info-block" style={{ gap: '1rem', paddingLeft: '0.25rem' }}>
                                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                                <div className="info-item"><span className="info-label-sub">Proceso</span><p className="info-value-text" style={{ color: '#818cf8', fontWeight: '950' }}>{v.proceso}</p></div>
                                                                <div className="info-item"><span className="info-label-sub">Detalle</span><p className="info-value-text" style={{ color: '#ec4899', fontWeight: '950' }}>{v.detalle}</p></div>
                                                            </div>
                                                            <div className="info-item"><span className="info-label-sub">Autorización</span><p className="info-value-text" style={{ color: '#818cf8', fontWeight: '950', fontSize: '14px' }}>{v.aprobacion || 'PENDIENTE'}</p></div>
                                                            <div className="info-item"><span className="info-label-sub">Descuento</span><p className="info-value-text" style={{ color: '#10b981', fontWeight: '950', fontSize: '14px' }}>{v.descuento || '0'}% APLICADO</p></div>
                                                            <div className="info-item"><span className="info-label-sub">Mesa Asignada</span><p className="info-value-text" style={{ fontSize: '14px' }}>{v.mesaAsignada || 'EN ESPERA'}</p></div>
                                                        </div>
                                                    </div>

                                                    <div className="observation-card">
                                                        <h4 className="info-label-main" style={{ color: '#818cf8' }}>Observaciones</h4>
                                                        <div className="info-block" style={{ gap: '1.25rem' }}>
                                                            <div className="obs-item">
                                                                <span className="obs-label" style={{ color: 'rgba(129, 140, 248, 0.6)' }}>Ejecutivo</span>
                                                                <p className="obs-text">"{v.observacionEjecutivo || 'Sin comentarios.'}"</p>
                                                            </div>
                                                            <div className="obs-item" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                                                                <span className="obs-label" style={{ color: 'rgba(16, 185, 129, 0.6)' }}>Mesa Control</span>
                                                                <p className="obs-text">"{v.observacion || 'Sin respuesta.'}"</p>
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

            <style jsx>{`
                .linker-root {
                    width: 100%;
                    color: #fff;
                    font-family: 'Outfit', sans-serif;
                }

                .linker-header {
                    background: #0a0a0b;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 1.5rem;
                    padding: 1.25rem;
                    margin-bottom: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .header-top {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                }

                .linker-title {
                    font-size: 1.4rem;
                    font-weight: 950;
                    letter-spacing: -0.04em;
                    margin: 0;
                    background: linear-gradient(to bottom, #fff 0%, #a1a1aa 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    text-transform: uppercase;
                }

                .title-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .title-accent {
                    width: 3px;
                    height: 1.4rem;
                    background: #10b981;
                    border-radius: 2px;
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
                }

                .stats-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1.75rem;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    padding-left: 0.75rem;
                    border-left: 2px solid transparent;
                }

                .stat-item.emerald { border-color: #10b981; }
                .stat-item.indigo { border-color: #4f46e5; }
                .stat-item.pink { border-color: #ec4899; }
                .stat-item.emerald-soft { border-color: rgba(16, 185, 129, 0.3); }

                .stat-label {
                    font-size: 0.6rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: #71717a;
                    margin-bottom: 0.2rem;
                }

                .stat-value {
                    font-size: 1.25rem;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                }

                .stat-value.pulse {
                    font-size: 0.9rem;
                    color: #34d399;
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    letter-spacing: 0.1em;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }

                .header-bottom {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: flex-end;
                    gap: 1.5rem;
                }

                .filter-group {
                    flex: 1;
                    min-width: 140px;
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }

                .filter-group.search {
                    flex: 1.5;
                    min-width: 200px;
                }

                .filter-label {
                    font-size: 0.65rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #71717a;
                    margin-left: 0.2rem;
                    white-space: nowrap;
                }

                .filter-input-wrapper {
                    position: relative;
                }

                .linker-input, .linker-select {
                    width: 100%;
                    height: 2.4rem;
                    background: #000;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 0.6rem;
                    padding: 0 1rem;
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 700;
                    outline: none;
                    transition: all 0.2s;
                }

                .linker-input:focus, .linker-select:focus {
                    border-color: #10b981;
                    background: #000;
                }

                .linker-select {
                    appearance: none;
                    cursor: pointer;
                    text-transform: uppercase;
                }

                .clear-btn {
                    position: absolute;
                    right: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #71717a;
                    cursor: pointer;
                    padding: 0.5rem;
                }

                .clear-btn:hover { color: #fff; }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-left: auto;
                }

                .btn-text {
                    background: none;
                    border: none;
                    color: #71717a;
                    font-size: 0.75rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    cursor: pointer;
                    padding: 0.5rem 1rem;
                    transition: color 0.2s;
                }

                .btn-text:hover { color: #fff; }

                .btn-refresh {
                    width: 2.4rem;
                    height: 2.4rem;
                    background: #10b981;
                    border: none;
                    border-radius: 0.6rem;
                    color: #000;
                    font-size: 1.1rem;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 8px 12px -3px rgba(16, 185, 129, 0.2);
                }

                .btn-refresh:hover { background: #34d399; transform: translateY(-1px); }
                .btn-refresh:active { transform: translateY(0) scale(0.95); }
                .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

                .spinning {
                    display: inline-block;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 1024px) {
                    .header-top { flex-direction: column; align-items: flex-start; }
                    .stats-container { width: 100%; justify-content: space-between; }
                }

                @media (max-width: 768px) {
                    .linker-header { padding: 1.5rem; }
                    .stats-container { gap: 1.5rem; }
                    .header-bottom { gap: 1rem; }
                    .filter-group { min-width: 100%; }
                    .header-actions { width: 100%; justify-content: space-between; margin-left: 0; }
                }

                .table-container {
                    background: #0a0a0b;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .linker-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .table-header-row {
                    background: rgba(255, 255, 255, 0.02);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .table-header {
                    padding: 1rem 1.25rem;
                    font-size: 11px;
                    font-weight: 950;
                    text-transform: uppercase;
                    color: #52525b;
                    letter-spacing: 0.15em;
                    text-align: center;
                }

                .table-body {
                    position: relative;
                }

                .record-row {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .record-row:hover {
                    background: rgba(255, 255, 255, 0.02);
                }

                .record-row.expanded {
                    background: rgba(255, 255, 255, 0.03);
                }

                .custom-scrollbar {
                    overflow-x: auto;
                    padding-bottom: 10rem;
                    margin-bottom: -10rem;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .btn-action-base {
                    width: 40px;
                    height: 40px;
                    min-width: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    border-radius: 0.75rem;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                }

                .btn-action-base:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                    box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.4);
                }

                .btn-action-base:active {
                    transform: translateY(0) scale(0.95);
                }

                .btn-action-base:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .btn-approve {
                    background: #10b981;
                }

                .btn-reject {
                    background: #ef4444;
                }

                .btn-correct-venta {
                    background: rgba(236, 72, 153, 0.1);
                    border: 1px solid rgba(236, 72, 153, 0.3);
                    color: #ec4899;
                    font-size: 9px;
                    font-weight: 950;
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .btn-correct-venta:hover {
                    background: #ec4899;
                    color: #fff;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
                }

                .files-dropdown-menu {
                    position: absolute;
                    right: 0;
                    top: calc(100% + 10px);
                    width: 320px;
                    background: #111112;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 1.25rem;
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.8);
                    padding: 1.25rem;
                    z-index: 10000;
                    animation: dropdown-entrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: top right;
                }

                @keyframes dropdown-entrance {
                    from {
                        opacity: 0;
                        transform: translateY(-8px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .file-item-mini {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .file-item-mini:last-child { border-bottom: none; }

                .file-info-mini {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .file-name-mini {
                    font-size: 13px;
                    font-weight: 700;
                    color: #fff;
                }

                .file-id-mini {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.4);
                    font-family: monospace;
                }

                .file-action-icon {
                    color: #4f46e5;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .file-action-icon:hover {
                    color: #fff;
                    transform: scale(1.1);
                }

                .file-action-icon.blue { color: #2563eb; }
                .file-action-icon.blue:hover { color: #60a5fa; }

                .icon-svg {
                    width: 24px;
                    height: 24px;
                }

                .status-pill {
                    width: 210px;
                    height: 38px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 950;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    border: 1px solid transparent;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-align: center;
                    white-space: nowrap;
                    padding: 0 1.25rem;
                    position: relative;
                    z-index: 2;
                }

                .status-arrow {
                    width: 11px;
                    height: 11px;
                    transition: transform 0.3s ease;
                }

                .status-pill-interactive {
                    cursor: pointer;
                    background: transparent;
                }

                .status-pill-interactive:hover {
                    transform: scale(1.05);
                }

                .status-pill-interactive:active {
                    transform: scale(0.95);
                }

                /* Status variants */
                .status-emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; border-color: rgba(16, 185, 129, 0.3); }
                .status-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); }
                .status-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(59, 130, 246, 0.3); }
                .status-rose { background: rgba(244, 63, 94, 0.2); color: #fb7185; border-color: rgba(244, 63, 94, 0.3); }
                .status-indigo { background: rgba(99, 102, 241, 0.2); color: #818cf8; border-color: rgba(99, 102, 241, 0.3); }
                .status-sky { background: rgba(14, 165, 233, 0.2); color: #38bdf8; border-color: rgba(14, 165, 233, 0.3); }
                .status-violet { background: rgba(139, 92, 246, 0.2); color: #a78bfa; border-color: rgba(139, 92, 246, 0.3); }
                .status-orange { background: rgba(249, 115, 22, 0.2); color: #fb923c; border-color: rgba(249, 115, 22, 0.3); }
                .status-gray { background: rgba(107, 114, 128, 0.2); color: #9ca3af; border-color: rgba(107, 114, 128, 0.3); }
                
                .status-dropdown-container {
                    position: relative;
                    display: inline-block;
                    margin: 0 auto;
                }

                /* Glow for activated */
                .status-activated {
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
                }

                .filter-group-row {
                    display: flex;
                    gap: 1rem;
                    width: 100%;
                }

                .dropdown-menu {
                    position: absolute;
                    left: 50%;
                    top: calc(100% + 15px);
                    width: 280px;
                    background: #0c0c0e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 1.5rem;
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0,0,0,0.5);
                    padding: 0.75rem;
                    z-index: 5000;
                    transform-origin: top;
                    animation: dropdown-entrance 0.25s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .small-btn {
                    padding: 0.5rem !important;
                    border-radius: 0.75rem !important;
                }

                .btn-details {
                    padding: 0.6rem 1.25rem;
                    border-radius: 0.85rem;
                    font-size: 12px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    background: rgba(255, 255, 255, 0.05);
                    color: #71717a;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    white-space: nowrap;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .btn-details:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    border-color: rgba(255, 255, 255, 0.15);
                    transform: translateY(-1px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
                }

                .btn-details:active {
                    transform: translateY(0) scale(0.96);
                }

                .btn-details.active {
                    background: #fff;
                    color: #000;
                    border-color: #fff;
                    box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
                }

                .btn-open {
                    padding: 0.6rem 1.25rem;
                    border-radius: 0.85rem;
                    font-size: 14px;
                    font-weight: 950;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    cursor: pointer;
                    white-space: nowrap;
                }

                .btn-open:hover {
                    background: linear-gradient(90deg, #ec4899, #8b5cf6);
                    color: white;
                    border-color: transparent;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
                }

                .btn-file-main {
                    padding: 0.6rem 1.25rem;
                    border-radius: 0.85rem;
                    font-size: 11px;
                    font-weight: 950;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    background: rgba(139, 92, 246, 0.1);
                    color: #a78bfa;
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .btn-file-main:hover, .btn-file-main.active {
                    background: #8b5cf6;
                    color: #fff;
                    border-color: #8b5cf6;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px -5px rgba(139, 92, 246, 0.4);
                }

                .files-dropdown-holder {
                    position: relative;
                }

                 .files-dropdown-menu {
                     position: absolute;
                     right: 0;
                     top: calc(100% + 12px);
                     width: 350px;
                     background: #09090b;
                     border: 2px solid rgba(139, 92, 246, 0.5);
                     border-radius: 1.5rem;
                     box-shadow: 0 40px 80px -12px rgba(0, 0, 0, 1), 0 0 30px rgba(139, 92, 246, 0.2);
                     z-index: 10000;
                     padding: 1.25rem;
                     display: flex;
                     flex-direction: column;
                     gap: 1.25rem;
                     animation: files-entrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                     transform-origin: top right;
                 }

                 @keyframes files-entrance {
                     from { opacity: 0; transform: translateY(-10px) scale(0.98); }
                     to { opacity: 1; transform: translateY(0) scale(1); }
                 }

                .files-dropdown-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .files-dropdown-header span {
                    font-size: 10px;
                    font-weight: 950;
                    text-transform: uppercase;
                    color: #71717a;
                    letter-spacing: 0.1em;
                }

                .btn-open-all {
                    background: #10b981;
                    color: #000;
                    border: none;
                    padding: 0.4rem 0.8rem;
                    border-radius: 0.5rem;
                    font-size: 9px;
                    font-weight: 950;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                 .btn-open-all:hover {
                     background: #34d399;
                     transform: scale(1.05);
                 }
 
                 .btn-download-all {
                     background: rgba(139, 92, 246, 0.1);
                     color: #a78bfa;
                     border: 1px solid rgba(139, 92, 246, 0.2);
                     padding: 0.4rem 0.8rem;
                     border-radius: 0.5rem;
                     font-size: 9px;
                     font-weight: 950;
                     cursor: pointer;
                     transition: all 0.2s;
                 }
 
                 .btn-download-all:hover {
                     background: rgba(139, 92, 246, 0.2);
                     color: #fff;
                     border-color: rgba(139, 92, 246, 0.4);
                     transform: scale(1.05);
                 }

                .files-list {
                    max-height: 250px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding-right: 0.5rem;
                }

                 .file-item {
                     display: flex;
                     align-items: center;
                     justify-content: space-between;
                     padding: 0.85rem 1.25rem;
                     background: #111113;
                     border: 1px solid rgba(255, 255, 255, 0.08);
                     border-radius: 1rem;
                     transition: all 0.2s;
                 }
 
                 .file-item:hover {
                     border-color: rgba(139, 92, 246, 0.4);
                     background: #161619;
                     transform: translateX(4px);
                 }
 
                 .file-action-btn {
                     width: 32px;
                     height: 32px;
                     display: flex;
                     align-items: center;
                     justify-content: center;
                     background: rgba(255, 255, 255, 0.05);
                     border-radius: 0.5rem;
                     color: #71717a;
                     transition: all 0.2s;
                 }
 
                 .file-action-btn:hover {
                     background: #10b981;
                     color: #000;
                     transform: scale(1.1);
                 }
 
                 .file-action-btn.download:hover {
                     background: #8b5cf6;
                     color: #fff;
                 }
 
                 .file-info {
                     display: flex;
                     flex-direction: column;
                 }

                .file-name {
                    font-size: 12px;
                    font-weight: 800;
                    color: #fff;
                }

                .file-id {
                    font-size: 9px;
                    color: #52525b;
                    font-family: monospace;
                }

                .file-item svg {
                    color: #71717a;
                    transition: color 0.2s;
                }

                .file-item:hover svg {
                    color: #10b981;
                }

                .btn-open:active {
                    transform: translateY(0) scale(0.96);
                }

                .table-cell {
                    padding: 0.75rem 1rem;
                    text-align: center;
                }

                .table-cell-left {
                    padding: 0.75rem 1rem;
                    text-align: left;
                }

                .badge-id {
                    font-size: 13px;
                    font-weight: 950;
                    color: #fff;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 0.3rem 0.6rem;
                    border-radius: 0.4rem;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .client-info-stack {
                    display: flex;
                    flex-direction: column;
                }

                .client-name {
                    font-size: 14px;
                    font-weight: 950;
                    color: #fff;
                    text-transform: uppercase;
                    line-height: 1.3;
                    margin-bottom: 0.25rem;
                }

                .client-ruc {
                    font-size: 14px;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    color: #71717a;
                    font-weight: bold;
                    letter-spacing: 0.05em;
                }

                .text-bold-white {
                    font-size: 15px;
                    font-weight: 950;
                    color: #fff;
                }

                .badge-lines {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(236, 72, 153, 0.1);
                    border: 1px solid rgba(236, 72, 153, 0.2);
                    color: #ec4899;
                    font-weight: 950;
                    font-size: 12px;
                }

                .expanded-container {
                    padding: 2.5rem;
                }

                .expanded-grid {
                    display: grid;
                    grid-template-columns: repeat(1, 1fr);
                    gap: 2.5rem;
                }

                @media (min-width: 768px) {
                    .expanded-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }

                .info-block {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .info-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.5rem;
                }

                .info-icon-wrapper {
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                }

                .info-icon-wrapper.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .info-icon-wrapper.indigo { background: rgba(79, 70, 229, 0.1); color: #818cf8; }
                .info-icon-wrapper.pink { background: rgba(236, 72, 153, 0.1); color: #ec4899; }

                .info-label-main {
                    color: #fff;
                    font-size: 11px;
                    font-weight: 950;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                }

                .info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .info-label-sub {
                    font-size: 9px;
                    color: #52525b;
                    font-weight: 950;
                    text-transform: uppercase;
                }

                .info-value-text {
                    font-size: 14px;
                    color: #e4e4e7;
                    font-weight: 700;
                }

                .info-value-mono {
                    font-size: 14px;
                    color: #10b981;
                    font-family: monospace;
                    font-weight: 700;
                }

                .observation-card {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 1.5rem;
                    border-radius: 2rem;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .obs-item {
                    padding-left: 1rem;
                    border-left: 2px solid rgba(255, 255, 255, 0.1);
                }

                .obs-label {
                    font-size: 9px;
                    font-weight: 950;
                    text-transform: uppercase;
                    margin-bottom: 0.5rem;
                    display: block;
                }

                .obs-text {
                    font-size: 12px;
                    color: #a1a1aa;
                    font-style: italic;
                    line-height: 1.5;
                }

                .icon-svg-small {
                    width: 16px;
                    height: 16px;
                }

                .dropdown-item {
                    width: 100%;
                    padding: 1.2rem 1.5rem;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    background: transparent;
                    border: none;
                    border-radius: 1rem;
                    color: #71717a;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    line-height: 1.4;
                }

                .dropdown-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #ffffff;
                    transform: scale(1.02);
                }

                .dropdown-item.active {
                    color: #fff;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.15);
                }

                .dropdown-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #ffffff;
                }

                .dropdown-item.active {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.03);
                }

                .dropdown-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #10b981;
                    box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
                    flex-shrink: 0;
                }

                @keyframes dropdown-entrance {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -8px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                    }
                }

                .linker-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 5rem;
                    gap: 1.5rem;
                }

                .loading-spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid rgba(16, 185, 129, 0.3);
                    border-top-color: #10b981;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .loading-text {
                    color: #10b981;
                    font-weight: 950;
                    font-size: 10px;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                .record-row.dropdown-active {
                    z-index: 5000;
                    position: relative;
                }

                @keyframes badge-entrance {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes row-entrance {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-dropdown-entrance {
                    animation: dropdown-entrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: top;
                }

                .animate-badge-entrance {
                    animation: badge-entrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .table-container {
                    padding: 0 1rem;
                }

                .linker-table {
                    width: 100%;
                    text-align: left;
                    border-collapse: separate;
                    border-spacing: 0 0.75rem;
                    min-width: 1200px;
                }

                .table-header-row th {
                    padding-bottom: 0.5rem;
                }

                .record-row {
                    background: rgba(255, 255, 255, 0.02);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    animation: row-entrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
                }

                .record-row:hover {
                    background: rgba(255, 255, 255, 0.05);
                    transform: scale(1.002) translateY(-1px);
                    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
                }

                .record-row.expanded {
                    background: rgba(255, 255, 255, 0.04);
                }

                .record-row td {
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-top: 0.6rem;
                    padding-bottom: 0.6rem;
                }

                .record-row td.first-col {
                    border-left: 1px solid rgba(255, 255, 255, 0.05);
                    border-top-left-radius: 1.25rem;
                    border-bottom-left-radius: 1.25rem;
                }

                .record-row td.last-col {
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                    border-top-right-radius: 1.25rem;
                    border-bottom-right-radius: 1.25rem;
                }
            `}</style>

            <SubirVentaModal
                isOpen={isCorrectionModalOpen}
                onClose={() => setIsCorrectionModalOpen(false)}
                leadData={null}
                ejecutivo={correctionSaleData?.ejecutivo || ''}
                onSuccess={loadData}
                editSaleData={correctionSaleData}
            />
        </div>
    );
}
