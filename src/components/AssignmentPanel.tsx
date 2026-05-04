'use client';

import React, { useState, useEffect } from 'react';
import { getExecutiveAssignmentStats, assignLeadsByCriteria } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';

interface AssignmentPanelProps {
    userRole?: string;
    userName?: string;
}

export default function AssignmentPanel({ userRole, userName }: AssignmentPanelProps) {
    const [stats, setStats] = useState<any[]>([]);
    const [stock, setStock] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedExec, setSelectedExec] = useState<any>(null);

    // Assignment Form
    const [quantity, setQuantity] = useState(10);
    const [rangeId, setRangeId] = useState('1-4');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getExecutiveAssignmentStats(userRole, userName);
        if (res.success) {
            setStats(res.stats || []);
            setStock(res.stock || {});
        }
        setLoading(false);
    };

    const openAssignModal = (exec: any) => {
        setSelectedExec(exec);
        setShowModal(true);
    };

    const handleAssign = async () => {
        if (!selectedExec) return;
        const available = stock[rangeId] || 0;

        if (quantity <= 0) {
            AppSwal.fire({ title: 'Atención', text: 'La cantidad debe ser mayor a 0', icon: 'warning' });
            return;
        }

        // NEW: Max Capacity Check (20 Max Total)
        // Only ADMIN can override this limit.
        if (userRole !== 'ADMIN') {
            const currentHeld = selectedExec.assignedCount || 0;
            const maxCapacity = 20; // 20 Max Total
            const remainingSpace = Math.max(0, maxCapacity - currentHeld);

            if ((currentHeld + quantity) > maxCapacity) {
                AppSwal.fire({
                    title: 'Capacidad Excedida',
                    text: `El usuario ya tiene ${currentHeld} registros. El límite es 20. Solo puedes asignar máximo ${remainingSpace} más.`,
                    icon: 'warning',
                    confirmButtonColor: '#fbbf24'
                });
                // Auto-adjust quantity suggestion
                if (remainingSpace > 0) setQuantity(remainingSpace);
                return;
            }
        }

        if (quantity > available) {
            AppSwal.fire({ title: 'Stock insuficiente', text: `Solo hay ${available} leads disponibles en este rango`, icon: 'warning' });
            return;
        }

        const confirm = await AppSwal.fire({
            title: '¿Confirmar asignación?',
            text: `Asignar ${quantity} leads (${rangeId} lins) a ${selectedExec.name}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'SÍ, ASIGNAR',
            cancelButtonText: 'CANCELAR'
        });

        if (!confirm.isConfirmed) return;

        setAssigning(true);
        const res = await assignLeadsByCriteria(selectedExec.name, quantity, rangeId, userRole, userName);
        setAssigning(false);

        if (res.success) {
            const successRes = res as { count: number };
            AppSwal.fire({ title: 'Éxito', text: `${successRes.count} leads asignados correctamente`, icon: 'success' });
            setShowModal(false);
            loadData();
        } else {
            AppSwal.fire({ title: 'Error', text: res.error || 'Error en la asignación', icon: 'error' });
        }
    };

    if (loading) return (
        <div className="loadingContainer font-outfit uppercase">
            <span className="loadingText">Sincronizando Base y Estadísticas...</span>
        </div>
    );

    const totalAvailable = Object.values(stock).reduce((a, b) => a + b, 0);

    return (
        <div className="assignmentContainer font-outfit">

            {/* Header / Summary */}
            <div className="assignmentHeader">
                <div className="headerLeft">
                    <h1 className="headerTitle">Control de Asignación</h1>
                    <p className="headerSubtitle">
                        <span className="stockIndicator"></span>
                        {totalAvailable} Leads disponibles en Stock Total
                    </p>
                </div>

                <div className="stockGrid">
                    {Object.entries(stock).map(([range, count]) => (
                        <div key={range} className="stockItem">
                            <span className="stockRange">{range} Lins</span>
                            <span className="stockCount">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Executive Grid */}
            <div className="executiveGrid">
                {stats.map((exec) => (
                    <div key={exec.user} className="execCard">
                        {/* Background Decor */}
                        <div className="cardBgDecor">EX</div>

                        <div className="cardContent">
                            <div className="cardTop">
                                <div className="cardIcon">👤</div>
                                <span className={`cardBadge ${exec.role === 'SPECIAL' ? 'badgeSpecial' : 'badgeStandard'}`}>
                                    {exec.role}
                                </span>
                            </div>

                            <h3 className="execName">{exec.name}</h3>
                            <p className="execUser">{exec.user}</p>

                            <div className="statsBox">
                                <span className="statsLabel">Leads Asignados</span>
                                <span className="statsValue">{exec.assignedCount}</span>
                            </div>

                            <button onClick={() => openAssignModal(exec)} className="assignBtn">
                                Asignar Base
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal - Selective Assignment */}
            {showModal && selectedExec && (
                <div className="modalOverlay">
                    <div className="modalPanel">
                        {/* Modal Close */}
                        <button onClick={() => setShowModal(false)} className="closeBtn">✕</button>

                        <div className="modalContent">
                            <span className="modalTag">Asignación Directa</span>
                            <h2 className="modalTitle">{selectedExec.name}</h2>

                            <div className="formGroup">
                                {/* Quantity */}
                                <div className="inputField">
                                    <label className="fieldLabel">Cantidad a Asignar</label>
                                    <div className="quantityControl">
                                        <button onClick={() => setQuantity(Math.max(1, quantity - 5))} className="qtyBtn">-</button>
                                        <input
                                            type="number"
                                            value={quantity}
                                            max={userRole === 'SPECIAL' ? 20 : undefined}
                                            onChange={(e) => {
                                                let val = parseInt(e.target.value) || 0;
                                                if (userRole === 'SPECIAL' && val > 20) val = 20;
                                                setQuantity(val);
                                            }}
                                            className="qtyInput"
                                        />
                                        <button
                                            onClick={() => {
                                                const newQty = quantity + 5;
                                                if (userRole === 'SPECIAL' && newQty > 20) {
                                                    setQuantity(20);
                                                } else {
                                                    setQuantity(newQty);
                                                }
                                            }}
                                            className="qtyBtn"
                                        >+</button>
                                    </div>
                                </div>

                                {/* Range Selection */}
                                <div className="inputField">
                                    <label className="fieldLabel">Rango de Líneas</label>
                                    <div className="rangeGrid">
                                        {[
                                            { id: '1-4', label: '1 a 4 Lins' },
                                            { id: '5-10', label: '5 a 10 Lins' },
                                            { id: '11-15', label: '11 a 15 Lins' },
                                            { id: '16-21', label: '16 a 21 Lins' },
                                            { id: '22-30', label: '22 a 30 Lins' },
                                            { id: '30+', label: '30+ Lins' },
                                        ].map((r) => (
                                            <button
                                                key={r.id}
                                                onClick={() => setRangeId(r.id)}
                                                className={`rangeCard ${rangeId === r.id ? 'active' : ''}`}
                                            >
                                                <span className="rangeTag">Rango</span>
                                                <span className="rangeLabel">{r.label}</span>
                                                <span className="rangeStock">Stock: {stock[r.id] || 0}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleAssign}
                                    disabled={assigning || (stock[rangeId] === 0)}
                                    className="executeBtn"
                                >
                                    {assigning ? 'PROCESANDO...' : 'EJECUTAR ASIGNACIÓN'}
                                </button>
                            </div>
                        </div>

                        {/* Decoration */}
                        <div className="modalDecor"></div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .font-outfit { font-family: 'Outfit', sans-serif; }
                
                .assignmentContainer {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 2.5rem;
                    padding: 1rem 2rem;
                    animation: fadeIn 0.7s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .loadingContainer {
                    padding: 5rem;
                    text-align: center;
                    color: #10b981;
                    font-weight: 900;
                    letter-spacing: 0.3em;
                }

                .loadingText { animation: pulse 2s infinite; }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                /* Header Styling */
                .assignmentHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 2rem;
                }

                .headerTitle {
                    font-size: 2.5rem;
                    font-weight: 950;
                    color: white;
                    letter-spacing: -0.04em;
                    text-transform: uppercase;
                    font-style: italic;
                    margin: 0;
                }

                .headerSubtitle {
                    color: #71717a;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    margin-top: 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .stockIndicator {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #10b981;
                    animation: pulse 2s infinite;
                }

                .stockGrid { display: flex; gap: 1rem; }

                .stockItem {
                    background: rgba(24, 24, 27, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 1rem;
                    padding: 0.5rem 1rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 85px;
                    backdrop-filter: blur(10px);
                }

                .stockRange { font-size: 9px; color: #52525b; font-weight: 900; text-transform: uppercase; }
                .stockCount { font-size: 0.9rem; font-weight: 800; color: #10b981; }

                /* Executive Grid */
                .executiveGrid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                }

                .execCard {
                    position: relative;
                    background: rgba(24, 24, 27, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2rem;
                    padding: 1.5rem;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                }

                .execCard:hover {
                    background: rgba(24, 24, 27, 0.7);
                    border-color: rgba(16, 185, 129, 0.3);
                    transform: translateY(-8px);
                }

                .cardBgDecor {
                    position: absolute;
                    top: 0;
                    right: 0;
                    padding: 2rem;
                    opacity: 0.03;
                    font-size: 5rem;
                    font-weight: 900;
                    font-style: italic;
                    pointer-events: none;
                    transition: opacity 0.4s;
                }

                .execCard:hover .cardBgDecor { opacity: 0.08; }

                .cardTop { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }

                .cardIcon {
                    width: 3rem;
                    height: 3rem;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2));
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 1.2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }

                .cardBadge {
                    font-size: 9px;
                    font-weight: 900;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    border: 1px solid transparent;
                    text-transform: uppercase;
                }

                .badgeSpecial { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); color: #f59e0b; }
                .badgeStandard { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #10b981; }

                .execName {
                    font-size: 1.15rem;
                    font-weight: 900;
                    color: white;
                    text-transform: uppercase;
                    margin: 0;
                    margin-bottom: 0.25rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .execUser { font-size: 10px; color: #52525b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; margin-bottom: 1.5rem; }

                .statsBox {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 1.25rem;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                }

                .statsLabel { font-size: 10px; font-weight: 900; color: #a1a1aa; text-transform: uppercase; }
                .statsValue { font-size: 1.5rem; font-weight: 950; color: white; }

                .assignBtn {
                    width: 100%;
                    padding: 0.85rem;
                    border-radius: 1.25rem;
                    background: white;
                    border: none;
                    color: black;
                    font-size: 10px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }

                .assignBtn:hover {
                    background: #10b981;
                    transform: scale(1.03);
                    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
                }

                /* Modal Styling */
                .modalOverlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(12px);
                    animation: modalIn 0.4s ease-out;
                }

                @keyframes modalIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modalPanel {
                    position: relative;
                    background: #0c0c0e;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    width: 100%;
                    max-width: 450px;
                    border-radius: 2.5rem;
                    padding: 2.5rem;
                    box-shadow: 0 0 100px rgba(16, 185, 129, 0.15);
                    overflow: hidden;
                    animation: panelIn 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                }

                @keyframes panelIn {
                    from { transform: scale(0.9) translateY(40px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }

                .closeBtn {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.3s;
                }

                .closeBtn:hover { background: rgba(255, 255, 255, 0.1); }

                .modalTag {
                    display: block;
                    font-size: 10px;
                    font-weight: 900;
                    color: #10b981;
                    text-transform: uppercase;
                    letter-spacing: 0.3em;
                    margin-bottom: 1rem;
                }

                .modalTitle {
                    font-size: 2rem;
                    font-weight: 950;
                    color: white;
                    text-transform: uppercase;
                    font-style: italic;
                    letter-spacing: -0.02em;
                    margin: 0;
                    margin-bottom: 2.5rem;
                }

                .formGroup { display: flex; flex-direction: column; gap: 2rem; }

                .fieldLabel {
                    display: block;
                    font-size: 9px;
                    font-weight: 900;
                    color: #52525b;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    margin-bottom: 0.75rem;
                }

                .quantityControl { display: flex; align-items: center; gap: 1rem; }

                .qtyBtn {
                    width: 3rem;
                    height: 3rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 1.25rem;
                    color: white;
                    font-size: 1.25rem;
                    font-weight: 700;
                    cursor: pointer;
                }

                .qtyInput {
                    flex: 1;
                    background: rgba(24, 24, 27, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 1.25rem;
                    height: 3rem;
                    text-align: center;
                    font-size: 1.25rem;
                    font-weight: 900;
                    color: white;
                    outline: none;
                }

                .rangeGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

                .rangeCard {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 1.25rem;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    text-align: left;
                    cursor: pointer;
                    transition: 0.3s;
                }

                .rangeCard.active {
                    background: #10b981;
                    border-color: #10b981;
                    box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
                }

                .rangeTag { font-size: 9px; font-weight: 900; text-transform: uppercase; color: rgba(255,255,255,0.4); }
                .rangeCard.active .rangeTag { color: rgba(0,0,0,0.5); }

                .rangeLabel { font-size: 0.85rem; font-weight: 800; color: white; }
                .rangeCard.active .rangeLabel { color: black; }

                .rangeStock { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #10b981; margin-top: 0.25rem; }
                .rangeCard.active .rangeStock { color: rgba(0,0,0,0.4); }

                .executeBtn {
                    width: 100%;
                    padding: 1.25rem;
                    border-radius: 1.5rem;
                    background: #10b981;
                    border: none;
                    color: black;
                    font-size: 11px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    cursor: pointer;
                    transition: 0.3s;
                    margin-top: 1rem;
                }

                .executeBtn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; }
                .executeBtn:not(:disabled):hover { transform: scale(1.02); box-shadow: 0 20px 40px rgba(16, 185, 129, 0.2); }

                .modalDecor {
                    position: absolute;
                    bottom: -5rem;
                    left: -5rem;
                    width: 15rem;
                    height: 15rem;
                    background: rgba(16, 185, 129, 0.1);
                    filter: blur(80px);
                    border-radius: 50%;
                    pointer-events: none;
                }

                .qtyInput::-webkit-outer-spin-button,
                .qtyInput::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
        </div>
    );
}
