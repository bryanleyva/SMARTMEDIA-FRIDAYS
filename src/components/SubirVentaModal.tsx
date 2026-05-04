'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getLeadByRuc, saveVenta, updateVentaFull } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    leadData: any;
    ejecutivo: string;
    onSuccess: () => void;
    editSaleData?: any; // New prop for correction mode
}

export default function SubirVentaModal({ isOpen, onClose, leadData, ejecutivo, onSuccess, editSaleData }: Props) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [existingSustentos, setExistingSustentos] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form Data covering all 15 required fields + meta
    const [formData, setFormData] = useState({
        ruc: '',
        razonSocial: '',
        departamento: '',
        provincia: '',
        distrito: '',
        direccion: '',
        correo: '',
        segmento: '',
        lineas: '',
        cargoPlan: '', // Cargo base (con descuento incluido según el usuario solicita cambiar ahora)
        cargoFijo: '', // Cargo final (lo que se guarda)
        descuento: '50',
        dni: '',
        contacto: '',
        telefono: '',
        proceso: '',
        detalle: '',
        observacionEjecutivo: ''
    });

    // Helper to calculate final price
    const calculateFinal = (base: string, dscto: string) => {
        const b = parseFloat(base) || 0;
        const d = parseFloat(dscto) || 0;
        return (b * (1 - d / 100)).toFixed(2);
    };

    useEffect(() => {
        if (!isOpen) return;

        if (editSaleData) {
            // CORRECTION MODE
            // For existing data, we assume cargoFijo already has the discount included
            // but for the UI to be consistent, we might want to show the original base
            // However, the user said "currently I have to put CIF with discount included", 
            // so editSaleData.cargoFijo is already the final price.

            const base = editSaleData.cargoFijo || '';
            const dscto = editSaleData.descuento || '50';

            setFormData({
                ruc: editSaleData.ruc || '',
                razonSocial: editSaleData.razonSocial || '',
                departamento: editSaleData.departamento || '',
                provincia: editSaleData.provincia || '',
                distrito: editSaleData.distrito || '',
                direccion: editSaleData.direccion || '',
                correo: editSaleData.correo || '',
                segmento: editSaleData.segmento || '',
                lineas: editSaleData.lineas || '',
                cargoPlan: base, // Current behavior: base is already discounted
                cargoFijo: base,
                descuento: dscto,
                dni: editSaleData.dni || '',
                contacto: editSaleData.contacto || '',
                telefono: editSaleData.telefono || '',
                proceso: editSaleData.proceso || '',
                detalle: editSaleData.detalle || '',
                observacionEjecutivo: editSaleData.observacionEjecutivo || ''
            });

            // Parse existing sustentos
            if (editSaleData.idSustentos) {
                const ids = editSaleData.idSustentos.split(' - ').filter(Boolean).map((s: string) => s.trim());
                setExistingSustentos(ids);
            } else {
                setExistingSustentos([]);
            }
            setFiles([]);
        } else if (leadData) {
            // NEW UPLOAD MODE
            const loadFullData = async () => {
                setFetching(true);
                const ruc = leadData.RUC || leadData.ruc;

                const rawCargoFijo = leadData['CARGO FIJO'] || leadData.cargoFijo || '';
                const defaultDscto = '50';
                const final = calculateFinal(rawCargoFijo, defaultDscto);

                // Start with data from Prospección (pipeline card)
                const baseState = {
                    ruc: String(ruc),
                    razonSocial: leadData['Razón Social'] || leadData.razonSocial || '',
                    contacto: leadData['Representante Legal'] || leadData.contacto || '',
                    telefono: leadData['Teléfonos'] || leadData.telefono || '',
                    lineas: leadData['CANTIDAD LINEAS'] || leadData.lineas || '',
                    cargoPlan: rawCargoFijo,
                    cargoFijo: final,
                    // Default empties for the rest
                    departamento: '',
                    provincia: '',
                    distrito: '',
                    direccion: '',
                    correo: '',
                    descuento: defaultDscto,
                    dni: '',
                    proceso: '',
                    detalle: '',
                    observacionEjecutivo: '',
                    segmento: leadData.segmento || leadData['SEGMENTO'] || ''
                };

                // Try to complement with data from BASE CLARO
                try {
                    const res = await getLeadByRuc(String(ruc));
                    if (res.success && res.data) {
                        const d = res.data;
                        setFormData({
                            ...baseState,
                            departamento: d.departamento || '',
                            provincia: d.provincia || '',
                            distrito: d.distrito || '',
                            direccion: d.direccion || '',
                            correo: d.correo || '',
                            segmento: d.segmento || '',
                            dni: d.dni || '',
                            // If base claro has fresher contact info, we could use it, 
                            // but user said "ruc razon social contacto telefono lineas cargo fijo" comes from prospeccion (leadData)
                        });
                    } else {
                        setFormData(baseState);
                    }
                } catch (e) {
                    console.error("Error fetching complementary data", e);
                    setFormData(baseState);
                } finally {
                    setFetching(false);
                }
            };
            loadFullData();
            setExistingSustentos([]);
            setFiles([]);
        }
    }, [isOpen, leadData, editSaleData]);

    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    // Form Data converting
    // ... (rest of formData definitions)

    const handleSubirVenta = async () => {
        // Enforce all fields are mandatory
        const fieldLabels: Record<string, string> = {
            ruc: 'RUC',
            razonSocial: 'Razón Social',
            departamento: 'Departamento',
            provincia: 'Provincia',
            distrito: 'Distrito',
            direccion: 'Dirección',
            correo: 'Correo Electrónico',
            segmento: 'Segmento',
            lineas: 'Cantidad de Líneas',
            cargoFijo: 'Cargo Fijo',
            descuento: 'Descuento',
            dni: 'DNI',
            contacto: 'Representante Legal',
            telefono: 'Teléfono',
            proceso: 'Tipo de Ingreso',
            detalle: 'Detalle de Venta',
            observacionEjecutivo: 'Observaciones del Ejecutivo'
        };

        const emptyFields = Object.entries(formData)
            .filter(([key, value]) => {
                if (key === 'idSustentos') return false;
                if (typeof value === 'string') return value.trim() === '';
                return !value;
            })
            .map(([key]) => fieldLabels[key] || key);

        console.log("Empty fields detected:", emptyFields);

        if (emptyFields.length > 0) {
            AppSwal.fire({
                title: 'Campos Incompletos',
                html: `<div style="text-align: left; font-size: 14px;">
                    <p>Por favor, complete los siguientes campos obligatorios:</p>
                    <ul style="margin-top: 10px; color: #ec4899; font-weight: bold;">
                        ${emptyFields.map(f => `<li>• ${f}</li>`).join('')}
                    </ul>
                </div>`,
                icon: 'warning',
                confirmButtonColor: '#ec4899'
            });
            return;
        }

        console.log("Proceeding with upload...");

        setLoading(true);
        setUploadProgress(0);
        try {
            let uploadedFileIds: string[] = [];

            if (files.length > 0) {
                const { uploadFileToDrive } = await import('@/app/actions/drive');

                // Upload files sequentially for better stability and reliable progress
                for (const file of files) {
                    const uploadData = new FormData();
                    uploadData.append('file', file);

                    const uploadRes = await uploadFileToDrive(uploadData);
                    if (!uploadRes.success || !uploadRes.fileId) {
                        throw new Error(uploadRes.error || `Error al subir el archivo: ${file.name}`);
                    }

                    uploadedFileIds.push(uploadRes.fileId);

                    // Update progress reliably
                    setUploadProgress(prev => Math.min(prev + (100 / files.length), 100));
                }
                setUploadProgress(100);
            }

            // Combine existing and new files
            const finalSustentos = [...existingSustentos, ...uploadedFileIds].join(' - ');

            let res;
            if (editSaleData) {
                // IMPORTANT: In correction mode, we call updateVentaFull
                res = await updateVentaFull(editSaleData.id, {
                    ...formData,
                    idSustentos: finalSustentos
                });
            } else {
                res = await saveVenta({
                    ...formData,
                    idSustentos: finalSustentos,
                    ejecutivo: ejecutivo,
                    pipelineId: leadData?.id || leadData?.ID
                });
            }

            if (res.success) {
                AppSwal.fire({
                    title: editSaleData ? '¡Venta Corregida!' : '¡Venta Subida!',
                    text: 'El registro se ha actualizado correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });
                onSuccess();
                onClose();
            } else {
                AppSwal.fire({ title: 'Error', text: 'Error: ' + res.error, icon: 'error', confirmButtonColor: '#ef4444' });
            }
        } catch (e: any) {
            console.error("Error submitting sale", e);
            AppSwal.fire({ title: 'Error', text: e.message || 'Error interno al procesar la venta.', icon: 'error', confirmButtonColor: '#ef4444' });
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const inputStyle = (readOnly = false) => ({
        width: '100%',
        backgroundColor: readOnly ? 'rgba(255,255,255,0.03)' : '#000',
        border: '1px solid #333',
        color: readOnly ? '#888' : '#fff',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        marginBottom: '10px',
        outline: 'none',
        cursor: readOnly ? 'not-allowed' : 'text'
    });

    const labelStyle = {
        fontSize: '10px',
        fontWeight: '900',
        color: '#71717a',
        textTransform: 'uppercase' as const,
        marginBottom: '4px',
        display: 'block',
        letterSpacing: '0.05em'
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="modal-overlay animate-in fade-in duration-300">
            <div className="modal-container">
                {/* Fixed Header */}
                <div className="modal-header">
                    <div className="header-accent" />
                    <h2 className="modal-title">🚀 SUBIR VENTA</h2>
                    <p className="modal-subtitle">Confirmación de transacción para subir la venta al Linker</p>
                </div>

                {/* Scrollable Body */}
                <div className="modal-body custom-scrollbar">
                    {fetching ? (
                        <div className="loading-state">
                            <div className="spinner" />
                            <span className="loading-text">CARGANDO DATOS...</span>
                        </div>
                    ) : (
                        <div className="form-grid">
                            {/* READ ONLY SECTION */}
                            <div className="section-readonly">
                                <div className="field-group">
                                    <span className="field-label">RUC (Fijo)</span>
                                    <input className="field-input readonly" value={formData.ruc} readOnly />
                                </div>
                                <div className="field-group">
                                    <span className="field-label">Razón Social (Fijo)</span>
                                    <input className="field-input readonly" value={formData.razonSocial} readOnly />
                                </div>
                            </div>

                            {/* EDITABLE SECTION */}
                            <div className="field-group">
                                <span className="field-label">Representante Legal</span>
                                <input className="field-input" value={formData.contacto} onChange={e => setFormData({ ...formData, contacto: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">Documento Identidad (DNI)</span>
                                <input className="field-input" value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} />
                            </div>

                            <div className="field-group">
                                <span className="field-label">Teléfono</span>
                                <input className="field-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">Correo Electrónico</span>
                                <input className="field-input" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} />
                            </div>

                            <div className="field-group span-2">
                                <span className="field-label">Dirección Completa</span>
                                <input className="field-input" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
                            </div>

                            <div className="field-group">
                                <span className="field-label">Departamento</span>
                                <input className="field-input" value={formData.departamento} onChange={e => setFormData({ ...formData, departamento: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">Provincia</span>
                                <input className="field-input" value={formData.provincia} onChange={e => setFormData({ ...formData, provincia: e.target.value })} />
                            </div>

                            <div className="field-group">
                                <span className="field-label">Distrito</span>
                                <input className="field-input" value={formData.distrito} onChange={e => setFormData({ ...formData, distrito: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">Segmento</span>
                                <select
                                    className="field-input"
                                    value={formData.segmento}
                                    onChange={e => setFormData({ ...formData, segmento: e.target.value })}
                                    style={{ cursor: 'pointer', appearance: 'none' }}
                                >
                                    <option value="">SELECCIONE SEGMENTO</option>
                                    <option value="SOHO">SOHO</option>
                                    <option value="LOW PYME">LOW PYME</option>
                                    <option value="HIGH PYME">HIGH PYME</option>
                                    <option value="GRANDES">GRANDES</option>
                                    <option value="CORPOS">CORPOS</option>
                                    <option value="NO CREADO">NO CREADO</option>
                                </select>
                            </div>

                            <div className="field-group">
                                <span className="field-label">Tipo Ingreso</span>
                                <select
                                    className="field-input"
                                    value={formData.proceso}
                                    onChange={e => setFormData({ ...formData, proceso: e.target.value })}
                                    style={{ cursor: 'pointer', appearance: 'none' }}
                                >
                                    <option value="">SELECCIONE TIPO</option>
                                    <option value="REMOTO">REMOTO</option>
                                    <option value="CONSULTIVO">CONSULTIVO</option>
                                    <option value="SIM EN MANO">SIM EN MANO</option>
                                    <option value="CARTA PODER">CARTA PODER</option>
                                </select>
                            </div>

                            <div className="field-group">
                                <span className="field-label">Detalle de Venta</span>
                                <select
                                    className="field-input"
                                    value={formData.detalle}
                                    onChange={e => setFormData({ ...formData, detalle: e.target.value })}
                                    style={{ cursor: 'pointer', appearance: 'none' }}
                                >
                                    <option value="">SELECCIONE DETALLE</option>
                                    <option value="ALTA">ALTA</option>
                                    <option value="PORTA MOVISTAR">PORTA MOVISTAR</option>
                                    <option value="PORTA CLARO">PORTA CLARO</option>
                                    <option value="PORTA OTROS">PORTA OTROS</option>
                                </select>
                            </div>

                            <div className="section-sales span-2">
                                <div className="field-group">
                                    <span className="field-label accent">Cantidad Líneas</span>
                                    <input className="field-input accent" type="number" value={formData.lineas} onChange={e => setFormData({ ...formData, lineas: e.target.value })} />
                                </div>
                                <div className="field-group">
                                    <span className="field-label accent">Cargo Fijo Plan (S/)</span>
                                    <input
                                        className="field-input accent"
                                        type="number"
                                        value={formData.cargoPlan}
                                        onChange={e => {
                                            const newPlan = e.target.value;
                                            setFormData({
                                                ...formData,
                                                cargoPlan: newPlan,
                                                cargoFijo: calculateFinal(newPlan, formData.descuento)
                                            });
                                        }}
                                    />
                                </div>
                                <div className="field-group">
                                    <span className="field-label accent">Descuento (%)</span>
                                    <input
                                        className="field-input accent"
                                        type="text"
                                        value={formData.descuento}
                                        onChange={e => {
                                            const newDscto = e.target.value;
                                            setFormData({
                                                ...formData,
                                                descuento: newDscto,
                                                cargoFijo: calculateFinal(formData.cargoPlan, newDscto)
                                            });
                                        }}
                                    />
                                </div>
                                <div className="field-group span-3 mt-4">
                                    <div className="calculation-badge">
                                        <span className="badge-label">CARGO FIJO FINAL (CON DESCUENTO):</span>
                                        <span className="badge-value">S/ {formData.cargoFijo}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="field-group span-2">
                                <span className="field-label accent">Sustentos (PDF/Word/Excel)</span>
                                <div
                                    className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-file' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        style={{ display: 'none' }}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                        onChange={e => {
                                            if (e.target.files) {
                                                setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                            }
                                        }}
                                    />

                                    <div className="drop-zone-content">
                                        <div className="drop-icon-wrapper">
                                            {files.length > 0 ? (
                                                <svg className="drop-icon success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg className="drop-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                            )}
                                        </div>
                                        <div className="drop-text">
                                            {files.length > 0 ? (
                                                <span className="file-name-active">{files.length} Archivos Seleccionados</span>
                                            ) : (
                                                <>
                                                    <span className="drop-title">Arrastra los sustentos aquí</span>
                                                    <span className="drop-subtitle">o haz clic para buscar en tu equipo</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {isDragging && <div className="dragging-overlay">¡SUÉLTALOS AQUÍ!</div>}
                                </div>

                                {existingSustentos.length > 0 && (
                                    <div className="selected-files-list existing">
                                        <span className="file-list-label">Sustentos Actuales:</span>
                                        {existingSustentos.map((id, i) => (
                                            <div key={`exist-${i}`} className="file-item existing">
                                                <span className="file-item-name">{id}</span>
                                                <button
                                                    className="btn-remove-file"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExistingSustentos(prev => prev.filter((_, idx) => idx !== i));
                                                    }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {files.length > 0 && (
                                    <div className="selected-files-list">
                                        <span className="file-list-label">Nuevos Archivos:</span>
                                        {files.map((f, i) => (
                                            <div key={i} className="file-item">
                                                <span className="file-item-name">{f.name}</span>
                                                <button
                                                    className="btn-remove-file"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFiles(prev => prev.filter((_, idx) => idx !== i));
                                                    }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {loading && uploadProgress > 0 && (
                                    <div className="upload-progress-container">
                                        <div className="progress-bar-bg">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                        <span className="progress-text">SUBIENDO: {Math.round(uploadProgress)}%</span>
                                    </div>
                                )}
                            </div>

                            <div className="field-group span-2">
                                <span className="field-label">Observaciones del Ejecutivo</span>
                                <textarea
                                    className="field-textarea"
                                    value={formData.observacionEjecutivo}
                                    onChange={e => setFormData({ ...formData, observacionEjecutivo: e.target.value })}
                                    placeholder="Escribe aquí cualquier detalle relevante para el cierre..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Footer */}
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-cancel">CANCELAR</button>
                    <button onClick={handleSubirVenta} disabled={loading} className="btn-submit">
                        {loading ? 'PROCESANDO REGISTRO...' : 'CONFIRMAR Y SUBIR VENTA'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.85);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(12px);
                    padding: 20px;
                }

                .modal-container {
                    background: #09090b;
                    width: 100%;
                    max-width: 800px;
                    max-height: 90vh;
                    border-radius: 2rem;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    position: relative;
                    overflow: hidden;
                }

                .modal-header {
                    padding: 2.5rem 2.5rem 1.5rem;
                    text-align: center;
                    position: relative;
                }

                .header-accent {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #ec4899, #8b5cf6);
                }

                .modal-title {
                    color: white;
                    font-size: 1.5rem;
                    font-weight: 950;
                    letter-spacing: -0.04em;
                    margin-bottom: 0.5rem;
                }

                .modal-subtitle {
                    color: #71717a;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 2.5rem 2.5rem;
                }

                .loading-state {
                    padding: 4rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255, 255, 255, 0.05);
                    border-top-color: #ec4899;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1.5rem;
                }

                @keyframes spin { to { transform: rotate(360deg); } }

                .loading-text {
                    color: #ec4899;
                    font-weight: 900;
                    font-size: 0.75rem;
                    letter-spacing: 0.2em;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem;
                }

                .section-readonly {
                    grid-column: span 2;
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    gap: 1rem;
                    padding: 1.5rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 1.25rem;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    margin-bottom: 0.5rem;
                }

                .section-sales {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 1rem;
                    padding: 1.5rem;
                    background: rgba(236, 72, 153, 0.03);
                    border-radius: 1.25rem;
                    border: 1px solid rgba(236, 72, 153, 0.1);
                    margin: 0.5rem 0;
                }

                .calculation-badge {
                    grid-column: span 3;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(90deg, rgba(236, 72, 153, 0.1), rgba(139, 92, 246, 0.1));
                    padding: 1rem 1.5rem;
                    border-radius: 1rem;
                    border: 1px dashed rgba(236, 72, 153, 0.3);
                    margin-top: 0.5rem;
                }

                .badge-label {
                    font-size: 0.65rem;
                    font-weight: 900;
                    color: #ec4899;
                    letter-spacing: 0.1em;
                }

                .badge-value {
                    font-size: 1.1rem;
                    font-weight: 950;
                    color: white;
                    text-shadow: 0 0 15px rgba(236, 72, 153, 0.5);
                }

                .mt-4 { margin-top: 1rem; }
                .span-3 { grid-column: span 3; }

                .field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                }

                .field-group.span-2 { grid-column: span 2; }

                .field-label {
                    font-size: 0.65rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    color: #71717a;
                    letter-spacing: 0.05em;
                    padding-left: 0.25rem;
                }

                .field-label.accent { color: #ec4899; }

                .field-input, .field-textarea {
                    width: 100%;
                    background: #000;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 0.75rem;
                    padding: 0.75rem 1rem;
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 600;
                    outline: none;
                    transition: all 0.2s;
                }

                .field-input:focus, .field-textarea:focus {
                    border-color: #ec4899;
                    background: #000;
                }

                .field-input.readonly {
                    background: rgba(255, 255, 255, 0.03);
                    color: #888;
                    cursor: not-allowed;
                }

                .field-input.accent { border-color: rgba(236, 72, 153, 0.2); }

                .field-textarea {
                    resize: none;
                    height: 100px;
                }

                .modal-footer {
                    padding: 1.5rem 2.5rem 2.5rem;
                    background: #09090b;
                    display: flex;
                    gap: 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .btn-cancel {
                    flex: 1;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: transparent;
                    color: #71717a;
                    font-weight: 900;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-cancel:hover {
                    color: white;
                    border-color: rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.02);
                }

                .btn-submit {
                    flex: 2;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    border: none;
                    background: linear-gradient(90deg, #ec4899, #8b5cf6);
                    color: white;
                    font-weight: 950;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 10px 20px -5px rgba(236, 72, 153, 0.4);
                }

                .btn-submit:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px -5px rgba(236, 72, 153, 0.6);
                }

                .btn-submit:active { transform: translateY(0); }
                .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

                /* Selected Files List */
                .selected-files-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-top: 0.75rem;
                }

                .file-list-label {
                    width: 100%;
                    font-size: 10px;
                    font-weight: 900;
                    color: #71717a;
                    text-transform: uppercase;
                    margin-bottom: 0.25rem;
                }

                .file-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 0.4rem 0.75rem;
                    border-radius: 0.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .file-item.existing {
                    background: rgba(59, 130, 246, 0.05);
                    border-color: rgba(59, 130, 246, 0.2);
                }

                .file-item-name {
                    font-size: 0.7rem;
                    color: #fff;
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-weight: 500;
                }

                .btn-remove-file {
                    background: transparent;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    display: flex;
                    padding: 2px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .btn-remove-file:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                /* Progress Bar */
                .upload-progress-container {
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .progress-bar-bg {
                    width: 100%;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    overflow: hidden;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #ec4899, #8b5cf6);
                    transition: width 0.3s ease;
                }

                .progress-text {
                    font-size: 0.65rem;
                    font-weight: 900;
                    color: #ec4899;
                    letter-spacing: 0.05em;
                }

                /* Scrollbar Styles */
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }

                /* Drop Zone Styles */
                .file-drop-zone {
                    width: 100%;
                    min-height: 120px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 2px dashed rgba(236, 72, 153, 0.3);
                    border-radius: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    margin-top: 0.5rem;
                }

                .file-drop-zone:hover {
                    background: rgba(236, 72, 153, 0.05);
                    border-color: #ec4899;
                    transform: translateY(-2px);
                }

                .file-drop-zone.dragging {
                    background: rgba(139, 92, 246, 0.1);
                    border-color: #8b5cf6;
                    border-style: solid;
                    transform: scale(1.02);
                    box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
                }

                .file-drop-zone.has-file {
                    background: rgba(16, 185, 129, 0.05);
                    border-color: #10b981;
                    border-style: solid;
                }

                .drop-zone-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                    text-align: center;
                    z-index: 10;
                    pointer-events: none; /* Prevents flickering */
                }

                .drop-icon-wrapper {
                    width: 48px;
                    height: 48px;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    pointer-events: none; /* Prevents flickering */
                }

                .drop-icon {
                    width: 24px;
                    height: 24px;
                    color: #71717a;
                }

                .drop-icon.success {
                    color: #10b981;
                }

                .file-drop-zone:hover .drop-icon-wrapper {
                    transform: scale(1.1);
                    background: rgba(236, 72, 153, 0.1);
                }

                .file-drop-zone:hover .drop-icon {
                    color: #ec4899;
                }

                .drop-text {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .drop-title {
                    font-size: 0.85rem;
                    font-weight: 900;
                    color: #fff;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .drop-subtitle {
                    font-size: 0.65rem;
                    color: #71717a;
                    font-weight: 600;
                }

                .file-name-active {
                    font-size: 0.8rem;
                    font-weight: 950;
                    color: #10b981;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .dragging-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(236, 72, 153, 0.9), rgba(139, 92, 246, 0.9));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 950;
                    font-size: 1.2rem;
                    letter-spacing: 0.1em;
                    z-index: 20;
                    animation: pulse-overlay 1.5s infinite linear;
                    pointer-events: none; /* Crucial: ensures overlay doesn't steal events from zone */
                }

                @keyframes bounce-in {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }

                @keyframes pulse-overlay {
                    0% { opacity: 0.8; }
                    50% { opacity: 1; }
                    100% { opacity: 0.8; }
                }

                @media (max-width: 640px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .field-group.span-2, .section-readonly, .section-sales { grid-column: span 1; }
                    .section-sales { grid-template-columns: 1fr; }
                    .modal-footer { flex-direction: column; }
                    .btn-submit { order: -1; }
                }
            `}</style>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
