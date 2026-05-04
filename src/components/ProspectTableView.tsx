'use client';

import React, { useState } from 'react';

interface ProspectTableViewProps {
    leads: any[];
    columns: any[];
    onUpdateStatus: (id: string, newStatus: string) => void;
    onDropProspect: (lead: any) => void;
    onSubirVenta: (lead: any) => void;
    onEditLead: (lead: any, cardId: string) => void;
    onVerDatos: (ruc: string) => void;
    userRole: string;
}

export default function ProspectTableView({
    leads,
    columns,
    onUpdateStatus,
    onDropProspect,
    onSubirVenta,
    onEditLead,
    onVerDatos,
    userRole
}: ProspectTableViewProps) {
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);

    const getStatusColor = (status: string) => {
        const col = columns.find(c => c.id === status);
        return col ? col.color : '#71717a';
    };

    const getStatusBg = (status: string) => {
        const col = columns.find(c => c.id === status);
        return col ? col.bg : 'rgba(113, 113, 122, 0.1)';
    };

    return (
        <div className="table-view-container animate-in">
            <div className="table-wrapper custom-scrollbar">
                <table className="premium-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Empresa / Razón Social</th>
                            <th>Contacto / Teléfono</th>
                            <th>Líneas / CF</th>
                            <th>Estado Actual</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '100px', opacity: 0.3 }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌑</div>
                                    <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px' }}>No hay registros</span>
                                </td>
                            </tr>
                        ) : (
                            leads.map((lead, idx) => {
                                const leadId = String(lead.id || lead.ID);
                                const status = lead.ESTADO || lead.estado;
                                const statusColor = getStatusColor(status);

                                return (
                                    <tr
                                        key={`table-row-${leadId}-${idx}`}
                                        onMouseEnter={() => setHoveredRow(leadId)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        className={hoveredRow === leadId ? 'row-hover' : ''}
                                    >
                                        <td>
                                            <span className="id-badge">{leadId}</span>
                                        </td>
                                        <td>
                                            <div className="company-info">
                                                <span className="company-name">{lead['Razón Social'] || lead.razonSocial || 'SIN NOMBRE'}</span>
                                                <span className="duc-text">{lead.RUC || lead.ruc || '-'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="contact-info">
                                                <span className="contact-name">{lead['Representante Legal'] || lead.representanteLegal || '-'}</span>
                                                <span className="phone-text">📞 {lead['Teléfonos'] || lead.TELEFONO || '-'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="metrics-info">
                                                <span className="lines-badge">{lead['CANTIDAD LINEAS'] || lead.lineas || '0'} L</span>
                                                <span className="cf-text" style={{ color: statusColor }}>S/ {lead['CARGO FIJO'] || lead.cargoFijo || '0'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="status-selector-wrapper">
                                                <select
                                                    value={status}
                                                    onChange={(e) => onUpdateStatus(leadId, e.target.value)}
                                                    className="status-dropdown"
                                                    style={{
                                                        borderColor: `${statusColor}40`,
                                                        color: statusColor,
                                                        backgroundColor: `${statusColor}10`
                                                    }}
                                                >
                                                    {columns.map(col => (
                                                        <option key={col.id} value={col.id}>{col.label}</option>
                                                    ))}
                                                    <option value="VENTA SUBIDA" disabled>VENTA SUBIDA</option>
                                                    <option value="VENTA CAIDA" disabled>VENTA CAIDA</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button
                                                    className="action-btn edit"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditLead(lead, `table-${idx}`);
                                                    }}
                                                    title="Editar Detalles"
                                                >
                                                    <span style={{ fontSize: '12px' }}>📝</span>
                                                    <span style={{ fontSize: '9px', fontWeight: 900, marginLeft: '4px' }}>EDITAR</span>
                                                </button>

                                                {status !== 'NUEVO INGRESO' && (
                                                    <button
                                                        className="action-btn ver-datos"
                                                        onClick={(e) => { e.stopPropagation(); onVerDatos(lead.RUC || lead.ruc); }}
                                                        title="Ver Datos"
                                                    >
                                                        🔍
                                                    </button>
                                                )}

                                                {status === 'NUEVO INGRESO' && lead.ESTADO !== 'VENTA SUBIDA' && (
                                                    <button
                                                        className="action-btn sale"
                                                        onClick={() => onSubirVenta(lead)}
                                                        title="Subir Venta"
                                                    >
                                                        🚀
                                                    </button>
                                                )}

                                                <button
                                                    className="action-btn drop"
                                                    onClick={() => onDropProspect(lead)}
                                                    title="Marcar Venta Caída"
                                                >
                                                    ✖
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .table-view-container {
                    flex: 1;
                    padding: 20px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .table-wrapper {
                    flex: 1;
                    overflow: auto;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 1.5rem;
                    backdrop-filter: blur(10px);
                }

                .premium-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 0.85rem;
                }

                .premium-table th {
                    position: sticky;
                    top: 0;
                    background: #0a0a0b;
                    padding: 16px 24px;
                    text-align: left;
                    font-weight: 900;
                    color: rgba(255, 255, 255, 0.4);
                    text-transform: uppercase;
                    font-size: 10px;
                    letter-spacing: 2px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    z-index: 10;
                }

                .premium-table td {
                    padding: 16px 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    vertical-align: middle;
                    transition: all 0.3s ease;
                }

                .row-hover {
                    background: rgba(255, 255, 255, 0.03);
                }

                .id-badge {
                    font-size: 10px;
                    font-weight: 800;
                    color: rgba(255, 255, 255, 0.3);
                    font-family: monospace;
                }

                .company-info, .contact-info, .metrics-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .company-name {
                    color: #fff;
                    font-weight: 800;
                    text-transform: uppercase;
                    font-size: 13px;
                }

                .duc-text, .phone-text {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 600;
                }

                .contact-name {
                    color: #fff;
                    font-weight: 600;
                    font-size: 12px;
                }

                .lines-badge {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 900;
                    width: fit-content;
                }

                .cf-text {
                    font-weight: 800;
                    font-size: 12px;
                }

                .status-selector-wrapper {
                    min-width: 180px;
                }

                .status-dropdown {
                    width: 100%;
                    padding: 8px 12px;
                    border-radius: 10px;
                    border: 1px solid;
                    font-size: 11px;
                    font-weight: 900;
                    text-transform: uppercase;
                    outline: none;
                    cursor: pointer;
                    appearance: none;
                    transition: all 0.3s ease;
                }

                .status-dropdown:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .actions-cell {
                    display: flex;
                    gap: 8px;
                }

                .action-btn {
                    height: 34px;
                    padding: 0 12px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                }

                .action-btn:hover {
                    transform: translateY(-2px);
                    background: rgba(255, 255, 255, 0.08);
                }

                .action-btn.edit:hover { border-color: #3b82f6; }
                .action-btn.sale:hover { border-color: #ec4899; box-shadow: 0 0 15px rgba(236, 72, 153, 0.3); }
                .action-btn.drop:hover { border-color: #ef4444; }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
