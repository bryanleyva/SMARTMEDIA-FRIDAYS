'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSupervisorAssignmentStats, assignLeadsToSupervisor } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';

interface SupervisorStat {
    name: string;
    user: string;
    poolTotal: number;
    poolAvailable: number;
    poolByRange: Record<string, number>;
}

export default function AdminAssignmentPanel() {
    const [totalGlobalStock, setTotalGlobalStock] = useState(0);
    const [globalStock, setGlobalStock] = useState<Record<string, number>>({});
    const [supervisors, setSupervisors] = useState<SupervisorStat[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [selectedSup, setSelectedSup] = useState<SupervisorStat | null>(null);
    const [quantity, setQuantity] = useState(100);
    const [qtyInput, setQtyInput] = useState('100');
    const [rangeId, setRangeId] = useState('1-4');
    const [assigning, setAssigning] = useState(false);

    // Upload base state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadDragging, setUploadDragging] = useState(false);
    const uploadInputRef = useRef<HTMLInputElement>(null);

    // Dedup state
    const [deduping, setDeduping] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getSupervisorAssignmentStats();
        if (res.success) {
            setTotalGlobalStock((res as any).totalGlobalStock || 0);
            setGlobalStock((res as any).globalStock || {});
            setSupervisors((res as any).supervisors || []);
        }
        setLoading(false);
    };

    const openModal = (sup: SupervisorStat) => {
        setSelectedSup(sup);
        setQuantity(100);
        setQtyInput('100');
        setRangeId('1-4');
        setShowModal(true);
    };

    const rangeStock = globalStock[rangeId] || 0;

    const adjustQuantity = (delta: number) => {
        setQuantity(prev => {
            const next = prev + delta;
            const clamped = Math.min(Math.max(next, 1), rangeStock);
            setQtyInput(String(clamped));
            return clamped;
        });
    };

    const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQtyInput(e.target.value);
    };

    const handleQtyBlur = () => {
        const val = parseInt(qtyInput) || 1;
        const clamped = Math.min(Math.max(val, 1), rangeStock || 1);
        setQuantity(clamped);
        setQtyInput(String(clamped));
    };

    const handleAssign = async () => {
        if (!selectedSup) return;

        if (quantity > rangeStock) {
            AppSwal.fire({ title: 'Stock insuficiente', text: `Solo hay ${rangeStock} leads disponibles en el rango ${rangeId} líneas.`, icon: 'warning' });
            return;
        }

        const confirm = await AppSwal.fire({
            title: '¿Confirmar asignación?',
            text: `Asignar ${quantity} leads (${rangeId} lins) a ${selectedSup.name}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'SÍ, ASIGNAR',
            cancelButtonText: 'CANCELAR'
        });

        if (!confirm.isConfirmed) return;

        setAssigning(true);
        const res = await assignLeadsToSupervisor(selectedSup.name, quantity, rangeId);
        setAssigning(false);

        if (res.success) {
            AppSwal.fire({ title: 'Éxito', text: `${(res as any).count} leads asignados a ${selectedSup.name}`, icon: 'success' });
            setShowModal(false);
            loadData();
        } else {
            AppSwal.fire({ title: 'Error', text: (res as any).error || 'Error en la asignación', icon: 'error' });
        }
    };

    const handleUploadBase = async () => {
        if (!uploadFile) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', uploadFile);
            const res = await fetch('/api/upload-base-claro', { method: 'POST', body: fd });
            const contentType = res.headers.get('content-type') || '';
            let data: any;
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { success: false, error: text || `Error del servidor (${res.status})` };
            }
            if (data.success) {
                AppSwal.fire({
                    title: 'Base Cargada',
                    text: `Se insertaron ${data.inserted} registros en BASE CLARO.`,
                    icon: 'success',
                    confirmButtonColor: '#6366f1'
                });
                setUploadFile(null);
                loadData();
            } else {
                AppSwal.fire({ title: 'Error', text: data.error || 'Error al subir la base.', icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } catch (e: any) {
            AppSwal.fire({ title: 'Error', text: e.message || 'Error de conexión.', icon: 'error', confirmButtonColor: '#ef4444' });
        } finally {
            setUploading(false);
        }
    };

    const handleDedup = async () => {
        const confirm = await AppSwal.fire({
            title: '¿Eliminar RUCs duplicados?',
            html: 'Se conservará la <b>primera aparición</b> de cada RUC y se borrarán las filas repetidas de BASE CLARO.<br/><br/>Esta acción <b>no se puede deshacer</b>.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'SÍ, ELIMINAR DUPLICADOS',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#ef4444'
        });
        if (!confirm.isConfirmed) return;

        setDeduping(true);
        try {
            const res = await fetch('/api/dedup-base-claro', { method: 'POST' });
            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await res.json()
                : { success: false, error: await res.text() };

            if (data.success) {
                AppSwal.fire({
                    title: 'Limpieza completada',
                    text: data.deleted === 0
                        ? 'No se encontraron RUCs duplicados.'
                        : `Se eliminaron ${data.deleted} filas duplicadas de BASE CLARO.`,
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });
                loadData();
            } else {
                AppSwal.fire({ title: 'Error', text: data.error || 'Error al deduplicar.', icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } catch (e: any) {
            AppSwal.fire({ title: 'Error', text: e.message || 'Error de conexión.', icon: 'error', confirmButtonColor: '#ef4444' });
        } finally {
            setDeduping(false);
        }
    };

    if (loading) return (
        <div className="loadingContainer font-outfit uppercase">
            <span className="loadingText">Cargando Stock Global...</span>
            <style jsx>{`.font-outfit{font-family:'Outfit',sans-serif}.loadingContainer{padding:5rem;text-align:center;color:#10b981;font-weight:900;letter-spacing:.3em}.loadingText{animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </div>
    );

    return (
        <div className="apContainer font-outfit">

            {/* Upload Base Section */}
            <div className="ubSection">
                <div className="ubLeft">
                    <span className="ubTag">CARGA DE BASE</span>
                    <h2 className="ubTitle">Subir Base RUC 20</h2>
                    <p className="ubDesc">Excel con encabezados: RUC · Razón Social · Representante Legal · Teléfonos · Documento Identidad · DEPARTAMENTO · PROVINCIA · DISTRITO · DIRECCION · CORREO · CANTIDAD LINEAS</p>
                </div>
                <div className="ubRight">
                    <input
                        ref={uploadInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && setUploadFile(e.target.files[0])}
                    />
                    <div
                        className={`ubDropZone ${uploadDragging ? 'ubDragging' : ''} ${uploadFile ? 'ubHasFile' : ''}`}
                        onClick={() => uploadInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setUploadDragging(true); }}
                        onDragLeave={e => { e.preventDefault(); setUploadDragging(false); }}
                        onDrop={e => {
                            e.preventDefault();
                            setUploadDragging(false);
                            const f = e.dataTransfer.files[0];
                            if (f) setUploadFile(f);
                        }}
                    >
                        {uploadFile ? (
                            <div className="ubFileInfo">
                                <span className="ubFileIcon">📊</span>
                                <span className="ubFileName">{uploadFile.name}</span>
                                <button className="ubFileClear" onClick={e => { e.stopPropagation(); setUploadFile(null); }}>✕</button>
                            </div>
                        ) : (
                            <div className="ubDropContent">
                                <span className="ubDropIcon">⬆</span>
                                <span className="ubDropText">Arrastra el Excel aquí o haz clic</span>
                            </div>
                        )}
                    </div>
                    <button
                        className="ubBtn"
                        disabled={!uploadFile || uploading}
                        onClick={handleUploadBase}
                    >
                        {uploading ? 'CARGANDO...' : 'SUBIR BASE'}
                    </button>
                </div>
            </div>

            {/* Dedup Section */}
            <div className="ddSection">
                <div className="ddLeft">
                    <span className="ddTag">LIMPIEZA DE DATOS</span>
                    <h2 className="ddTitle">Eliminar RUCs Duplicados</h2>
                    <p className="ddDesc">Conserva la primera aparición de cada RUC y elimina las filas repetidas en BASE CLARO. Irreversible.</p>
                </div>
                <button className="ddBtn" disabled={deduping} onClick={handleDedup}>
                    {deduping ? 'PROCESANDO...' : '🗑 DEDUPLICAR BASE'}
                </button>
            </div>

            {/* Stock Global Header */}
            <div className="apHeader">
                <div className="apHeaderLeft">
                    <h1 className="apTitle">Distribución de Base</h1>
                    <p className="apSubtitle">
                        <span className="apDot"></span>
                        {totalGlobalStock.toLocaleString()} leads sin asignar en stock global
                    </p>
                </div>
                <div className="apStockGrid">
                    {Object.entries(globalStock).map(([range, count]) => (
                        <div key={range} className="apStockItem">
                            <span className="apStockRange">{range} Lins</span>
                            <span className="apStockCount">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Supervisors Grid */}
            {supervisors.length === 0 ? (
                <div className="apEmpty">
                    <p>No hay supervisores registrados en el sistema.</p>
                </div>
            ) : (
                <div className="apGrid">
                    {supervisors.map((sup) => (
                        <div key={sup.user} className="apCard">
                            <div className="apCardBg">SV</div>
                            <div className="apCardContent">
                                <div className="apCardTop">
                                    <div className="apCardIcon">👤</div>
                                    <span className="apBadge">SUPERVISOR</span>
                                </div>
                                <h3 className="apName">{sup.name}</h3>
                                <p className="apUser">{sup.user}</p>

                                <div className="apStats">
                                    <div className="apStatRow">
                                        <span className="apStatLabel">Pool Total</span>
                                        <span className="apStatVal apStatTotal">{sup.poolTotal}</span>
                                    </div>
                                    <div className="apStatDivider"></div>
                                    <div className="apStatRow">
                                        <span className="apStatLabel">Disponible</span>
                                        <span className="apStatVal apStatAvail">{sup.poolAvailable}</span>
                                    </div>
                                </div>

                                {sup.poolTotal > 0 && (
                                    <div className="apRangeBreakdown">
                                        {Object.entries(sup.poolByRange)
                                            .filter(([, count]) => count > 0)
                                            .map(([range, count]) => (
                                                <div key={range} className="apRangePill">
                                                    <span className="apRangePillCount">{count}</span>
                                                    <span className="apRangePillLabel">{range} lins</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}

                                <button
                                    onClick={() => openModal(sup)}
                                    disabled={totalGlobalStock === 0}
                                    className="apAssignBtn"
                                >
                                    Asignar Base
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && selectedSup && (
                <div className="apOverlay">
                    <div className="apModal">
                        <button onClick={() => setShowModal(false)} className="apClose">✕</button>

                        <span className="apModalTag">Asignación Admin → Supervisor</span>
                        <h2 className="apModalTitle">{selectedSup.name}</h2>

                        <div className="apModalInfo">
                            <div className="apModalInfoRow">
                                <span>Pool actual del supervisor</span>
                                <strong>{selectedSup.poolTotal}</strong>
                            </div>
                        </div>

                        <div className="apFormGroup">
                            {/* Range selector */}
                            <div className="apInputField">
                                <label className="apFieldLabel">Rango de Líneas</label>
                                <div className="apRangeGrid">
                                    {[
                                        { id: '1-4',   label: '1 a 4 Lins' },
                                        { id: '5-10',  label: '5 a 10 Lins' },
                                        { id: '11-15', label: '11 a 15 Lins' },
                                        { id: '16-21', label: '16 a 21 Lins' },
                                        { id: '22-30', label: '22 a 30 Lins' },
                                        { id: '30+',   label: '30+ Lins' },
                                    ].map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => { setRangeId(r.id); setQuantity(100); setQtyInput('100'); }}
                                            className={`apRangeCard ${rangeId === r.id ? 'apRangeActive' : ''}`}
                                        >
                                            <span className="apRangeTag">Rango</span>
                                            <span className="apRangeLabel">{r.label}</span>
                                            <span className="apRangeStock">Stock: {globalStock[r.id] || 0}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quantity selector */}
                            <div className="apInputField">
                                <label className="apFieldLabel">Cantidad a Asignar (múltiplos de 100)</label>
                                <div className="apQtyControl">
                                    <button onClick={() => adjustQuantity(-100)} className="apQtyBtn" disabled={quantity <= 100}>−100</button>
                                    <input
                                        type="number"
                                        value={qtyInput}
                                        min={1}
                                        onChange={handleQtyChange}
                                        onBlur={handleQtyBlur}
                                        className="apQtyDisplay"
                                    />
                                    <button onClick={() => adjustQuantity(100)} className="apQtyBtn" disabled={quantity + 100 > rangeStock}>+100</button>
                                </div>
                                {quantity > rangeStock && rangeStock > 0 && (
                                    <p className="apQtyWarning">Solo hay {rangeStock} disponibles en este rango.</p>
                                )}
                                {rangeStock === 0 && (
                                    <p className="apQtyWarning">Sin stock en este rango.</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleAssign}
                            disabled={assigning || rangeStock === 0 || quantity > rangeStock}
                            className="apExecuteBtn"
                        >
                            {assigning ? 'PROCESANDO...' : `ASIGNAR ${quantity} LEADS`}
                        </button>

                        <div className="apModalDecor"></div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .font-outfit { font-family: 'Outfit', sans-serif; }

                .apContainer {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 2.5rem;
                    padding: 1rem 2rem;
                    animation: fadeIn 0.7s ease-out;
                }

                /* Upload Base */
                .ubSection {
                    display: flex; justify-content: space-between; align-items: center;
                    gap: 2rem; padding: 1.5rem 2rem;
                    background: rgba(99,102,241,0.04);
                    border: 1px solid rgba(99,102,241,0.15);
                    border-radius: 1.5rem;
                    flex-wrap: wrap;
                }
                .ubLeft { display: flex; flex-direction: column; gap: 0.4rem; max-width: 480px; }
                .ubTag {
                    font-size: 9px; font-weight: 900; color: #6366f1;
                    text-transform: uppercase; letter-spacing: 0.3em;
                }
                .ubTitle {
                    font-size: 1.3rem; font-weight: 950; color: white;
                    text-transform: uppercase; letter-spacing: -0.02em; margin: 0;
                }
                .ubDesc {
                    font-size: 10px; color: #52525b; font-weight: 600;
                    line-height: 1.6; margin: 0;
                }
                .ubRight {
                    display: flex; align-items: center; gap: 1rem; flex-shrink: 0;
                }
                .ubDropZone {
                    width: 280px; height: 56px;
                    background: rgba(0,0,0,0.4); border: 1.5px dashed rgba(99,102,241,0.3);
                    border-radius: 1rem; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.2s;
                }
                .ubDropZone:hover { border-color: rgba(99,102,241,0.7); background: rgba(99,102,241,0.06); }
                .ubDragging { border-color: #6366f1; background: rgba(99,102,241,0.1); border-style: solid; }
                .ubHasFile { border-color: #10b981; border-style: solid; background: rgba(16,185,129,0.05); }
                .ubDropContent {
                    display: flex; align-items: center; gap: 0.6rem;
                    pointer-events: none;
                }
                .ubDropIcon { font-size: 1.1rem; color: #6366f1; }
                .ubDropText { font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; }
                .ubFileInfo {
                    display: flex; align-items: center; gap: 0.6rem;
                    padding: 0 1rem; width: 100; overflow: hidden;
                    pointer-events: none;
                }
                .ubFileIcon { font-size: 1.2rem; flex-shrink: 0; }
                .ubFileName {
                    font-size: 10px; font-weight: 700; color: #10b981;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
                }
                .ubFileClear {
                    pointer-events: all; background: transparent; border: none;
                    color: #ef4444; cursor: pointer; font-size: 0.75rem;
                    padding: 2px 4px; border-radius: 4px; flex-shrink: 0;
                }
                .ubFileClear:hover { background: rgba(239,68,68,0.1); }
                .ubBtn {
                    padding: 0 1.5rem; height: 56px; border-radius: 1rem;
                    background: #6366f1; border: none; color: white;
                    font-size: 10px; font-weight: 900; text-transform: uppercase;
                    letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s;
                    white-space: nowrap; flex-shrink: 0;
                }
                .ubBtn:hover:not(:disabled) { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.3); }
                .ubBtn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; transform: none; }

                /* Dedup Section */
                .ddSection {
                    display: flex; justify-content: space-between; align-items: center;
                    gap: 2rem; padding: 1.5rem 2rem;
                    background: rgba(239,68,68,0.04);
                    border: 1px solid rgba(239,68,68,0.15);
                    border-radius: 1.5rem;
                    flex-wrap: wrap;
                }
                .ddLeft { display: flex; flex-direction: column; gap: 0.4rem; max-width: 560px; }
                .ddTag { font-size: 9px; font-weight: 900; color: #ef4444; text-transform: uppercase; letter-spacing: 0.3em; }
                .ddTitle { font-size: 1.3rem; font-weight: 950; color: white; text-transform: uppercase; letter-spacing: -0.02em; margin: 0; }
                .ddDesc { font-size: 10px; color: #52525b; font-weight: 600; line-height: 1.6; margin: 0; }
                .ddBtn {
                    padding: 0 1.5rem; height: 56px; border-radius: 1rem; flex-shrink: 0;
                    background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
                    color: #ef4444; font-size: 10px; font-weight: 900;
                    text-transform: uppercase; letter-spacing: 0.15em;
                    cursor: pointer; transition: all 0.2s; white-space: nowrap;
                }
                .ddBtn:hover:not(:disabled) { background: #ef4444; color: white; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(239,68,68,0.3); }
                .ddBtn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .apHeader {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    padding-bottom: 2rem;
                }
                .apTitle {
                    font-size: 2.5rem; font-weight: 950; color: white;
                    letter-spacing: -0.04em; text-transform: uppercase;
                    font-style: italic; margin: 0;
                }
                .apSubtitle {
                    color: #71717a; font-size: 0.75rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.15em;
                    margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem;
                }
                .apDot {
                    width: 8px; height: 8px; background: #6366f1;
                    border-radius: 50%; box-shadow: 0 0 10px #6366f1;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

                .apStockGrid { display: flex; gap: 0.75rem; flex-wrap: wrap; }
                .apStockItem {
                    background: rgba(24,24,27,0.5); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 1rem; padding: 0.5rem 1rem;
                    display: flex; flex-direction: column; align-items: center; min-width: 80px;
                }
                .apStockRange { font-size: 9px; color: #52525b; font-weight: 900; text-transform: uppercase; }
                .apStockCount { font-size: 0.9rem; font-weight: 800; color: #6366f1; }

                /* Grid */
                .apGrid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                }
                .apEmpty {
                    text-align: center; color: #52525b; font-weight: 700;
                    padding: 4rem; text-transform: uppercase; letter-spacing: 0.15em;
                }

                /* Card */
                .apCard {
                    position: relative;
                    background: rgba(24,24,27,0.4); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 2rem; padding: 1.5rem;
                    transition: all 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
                    overflow: hidden; backdrop-filter: blur(10px);
                }
                .apCard:hover {
                    background: rgba(24,24,27,0.7);
                    border-color: rgba(99,102,241,0.3);
                    transform: translateY(-8px);
                }
                .apCardBg {
                    position: absolute; top: 0; right: 0; padding: 2rem;
                    opacity: 0.03; font-size: 5rem; font-weight: 900;
                    font-style: italic; pointer-events: none; transition: opacity 0.4s;
                }
                .apCard:hover .apCardBg { opacity: 0.08; }

                .apCardContent { position: relative; }
                .apCardTop { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
                .apCardIcon {
                    width: 3rem; height: 3rem;
                    background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
                    border: 1px solid rgba(99,102,241,0.2);
                    border-radius: 1.2rem; display: flex; align-items: center;
                    justify-content: center; font-size: 1.5rem;
                }
                .apBadge {
                    font-size: 9px; font-weight: 900; padding: 0.25rem 0.75rem;
                    border-radius: 1rem; border: 1px solid rgba(99,102,241,0.3);
                    background: rgba(99,102,241,0.1); color: #818cf8;
                    text-transform: uppercase;
                }
                .apName {
                    font-size: 1.1rem; font-weight: 900; color: white;
                    text-transform: uppercase; margin: 0 0 0.25rem;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .apUser { font-size: 10px; color: #52525b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1.5rem; }

                .apStats {
                    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 1.25rem; padding: 1rem; margin-bottom: 1.5rem;
                    display: flex; flex-direction: column; gap: 0.5rem;
                }
                .apStatRow { display: flex; justify-content: space-between; align-items: center; }
                .apStatLabel { font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; }
                .apStatVal { font-size: 1.25rem; font-weight: 950; }
                .apStatTotal { color: white; }
                .apStatAvail { color: #6366f1; }
                .apStatDivider { height: 1px; background: rgba(255,255,255,0.05); }

                .apRangeBreakdown {
                    display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem;
                }
                .apRangePill {
                    display: flex; align-items: center; gap: 0.3rem;
                    background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.18);
                    border-radius: 0.6rem; padding: 0.25rem 0.6rem;
                }
                .apRangePillCount { font-size: 0.78rem; font-weight: 900; color: #818cf8; }
                .apRangePillLabel { font-size: 9px; font-weight: 700; color: #52525b; text-transform: uppercase; }

                .apAssignBtn {
                    width: 100%; padding: 0.85rem; border-radius: 1.25rem;
                    background: white; border: none; color: black;
                    font-size: 10px; font-weight: 900; text-transform: uppercase;
                    letter-spacing: 0.15em; cursor: pointer; transition: all 0.3s;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
                .apAssignBtn:hover:not(:disabled) {
                    background: #6366f1; transform: scale(1.03);
                    box-shadow: 0 10px 25px rgba(99,102,241,0.3);
                }
                .apAssignBtn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; }

                /* Modal */
                .apOverlay {
                    position: fixed; inset: 0; z-index: 1000;
                    display: flex; align-items: center; justify-content: center;
                    padding: 1.5rem; background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(12px); animation: modalIn 0.4s ease-out;
                    overflow-y: auto; align-content: flex-start;
                }
                @keyframes modalIn { from{opacity:0} to{opacity:1} }

                .apModal {
                    position: relative; background: #0c0c0e;
                    border: 1px solid rgba(255,255,255,0.1);
                    width: 100%; max-width: 480px; border-radius: 2.5rem;
                    padding: 2rem; overflow-y: auto; max-height: 92vh;
                    box-shadow: 0 0 100px rgba(99,102,241,0.15);
                    animation: panelIn 0.5s cubic-bezier(0.19,1,0.22,1);
                }
                @keyframes panelIn {
                    from { transform: scale(0.9) translateY(40px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }

                .apClose {
                    position: absolute; top: 1.5rem; right: 1.5rem;
                    width: 2.5rem; height: 2.5rem; border-radius: 50%;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    color: white; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: 0.3s; font-size: 0.9rem;
                }
                .apClose:hover { background: rgba(255,255,255,0.1); }

                .apModalTag {
                    display: block; font-size: 10px; font-weight: 900; color: #6366f1;
                    text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 0.75rem;
                }
                .apModalTitle {
                    font-size: 1.8rem; font-weight: 950; color: white;
                    text-transform: uppercase; font-style: italic; letter-spacing: -0.02em;
                    margin: 0 0 1.75rem;
                }

                .apModalInfo {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 1rem; padding: 1rem 1.25rem;
                    display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 2rem;
                }
                .apModalInfoRow {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 0.8rem; color: #71717a;
                }
                .apModalInfoRow strong { color: white; font-weight: 900; }

                .apFormGroup { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
                .apInputField { display: flex; flex-direction: column; gap: 0.75rem; }
                .apFieldLabel {
                    font-size: 9px; font-weight: 900; color: #52525b;
                    text-transform: uppercase; letter-spacing: 0.2em;
                }

                .apRangeGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
                .apRangeCard {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 1rem; padding: 0.75rem;
                    display: flex; flex-direction: column; gap: 0.2rem;
                    text-align: left; cursor: pointer; transition: 0.3s;
                }
                .apRangeCard.apRangeActive {
                    background: #6366f1; border-color: #6366f1;
                    box-shadow: 0 8px 20px rgba(99,102,241,0.25);
                }
                .apRangeTag { font-size: 8px; font-weight: 900; text-transform: uppercase; color: rgba(255,255,255,0.4); }
                .apRangeCard.apRangeActive .apRangeTag { color: rgba(255,255,255,0.6); }
                .apRangeLabel { font-size: 0.8rem; font-weight: 800; color: white; }
                .apRangeStock { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #6366f1; margin-top: 0.1rem; }
                .apRangeCard.apRangeActive .apRangeStock { color: rgba(255,255,255,0.7); }

                .apQtyControl { display: flex; align-items: center; gap: 0.5rem; }
                .apQtyBtn {
                    flex-shrink: 0;
                    padding: 0.7rem 1rem; background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 0.875rem;
                    color: white; font-size: 0.8rem; font-weight: 800; cursor: pointer;
                    transition: 0.2s; white-space: nowrap; min-width: 64px;
                }
                .apQtyBtn:hover:not(:disabled) { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); }
                .apQtyBtn:disabled { opacity: 0.3; cursor: not-allowed; }
                .apQtyDisplay {
                    flex: 1; min-width: 0; text-align: center; font-size: 1.75rem; font-weight: 950;
                    color: white; background: rgba(24,24,27,0.5);
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 0.65rem 0.5rem;
                    outline: none; font-family: 'Outfit', sans-serif; width: 100%;
                }
                .apQtyDisplay:focus {
                    border-color: rgba(99,102,241,0.5);
                    box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
                }
                .apQtyDisplay::-webkit-outer-spin-button,
                .apQtyDisplay::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .apQtyDisplay[type=number] { -moz-appearance: textfield; }
                .apQtyWarning { font-size: 0.75rem; color: #f59e0b; font-weight: 700; margin: 0; }

                .apExecuteBtn {
                    width: 100%; padding: 1.25rem; border-radius: 1.5rem;
                    background: #6366f1; border: none; color: white;
                    font-size: 11px; font-weight: 900; text-transform: uppercase;
                    letter-spacing: 0.2em; cursor: pointer; transition: 0.3s;
                }
                .apExecuteBtn:disabled { background: #27272a; color: #52525b; cursor: not-allowed; }
                .apExecuteBtn:not(:disabled):hover { transform: scale(1.02); box-shadow: 0 20px 40px rgba(99,102,241,0.25); }

                .apModalDecor {
                    position: absolute; bottom: -5rem; right: -5rem;
                    width: 15rem; height: 15rem;
                    background: rgba(99,102,241,0.08); filter: blur(80px);
                    border-radius: 50%; pointer-events: none;
                }
            `}</style>
        </div>
    );
}
