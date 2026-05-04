'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getLeadByRuc, saveLead } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';

interface LeadDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    ruc: string;
    currentUser: string;
    onSuccess?: () => void;
}

export default function LeadDataModal({ isOpen, onClose, ruc, currentUser, onSuccess }: LeadDataModalProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        ruc: '',
        razonSocial: '',
        contacto: '',
        dni: '',
        telefono: '',
        correo: '',
        direccion: '',
        departamento: '',
        provincia: '',
        distrito: '',
        segmento: '',
        consultor: '',
        lineas: '',
        cargoFijo: '',
        estado: '',
        deseaInfo: '',
        observacion: ''
    });

    useEffect(() => {
        if (isOpen && ruc) {
            loadLeadData();
        }
    }, [isOpen, ruc]);

    const loadLeadData = async () => {
        setLoading(true);
        try {
            const res = await getLeadByRuc(ruc);
            if (res.success && res.data) {
                const d = res.data;
                setFormData({
                    id: d.id || '',
                    ruc: d.ruc || '',
                    razonSocial: d.razonSocial || '',
                    contacto: d.contacto || '',
                    dni: d.dni || '',
                    telefono: d.telefono || '',
                    correo: d.correo || d.cargoFijo || '', // Note: getLeadByRuc seems to map cargoFijo to correo in its returned data based on comments in leads.ts, but let's be careful
                    direccion: d.direccion || '',
                    departamento: d.departamento || '',
                    provincia: d.provincia || '',
                    distrito: d.distrito || '',
                    segmento: d.segmento || '',
                    consultor: d.consultor || '',
                    lineas: d.lineas || '',
                    cargoFijo: d.cargoFijo || '',
                    estado: d.estado || '',
                    deseaInfo: d.deseaInfo || '',
                    observacion: d.observacion || ''
                });
            } else {
                AppSwal.fire({ title: 'Error', text: res.error || 'No se pudo cargar los datos del lead', icon: 'error' });
                onClose();
            }
        } catch (error) {
            console.error('Error loading lead data:', error);
            AppSwal.fire({ title: 'Error', text: 'Ocurrió un error al cargar los datos', icon: 'error' });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                assignedUser: currentUser,
                userRole: 'ADMIN' // Always allow edit via this modal for now or pass actual role
            };
            const res = await saveLead(Number(formData.id), dataToSave);
            if (res.success) {
                AppSwal.fire({ title: 'Éxito', text: 'Datos actualizados correctamente', icon: 'success' });
                if (onSuccess) onSuccess();
                onClose();
            } else {
                AppSwal.fire({ title: 'Error', text: res.error || 'Error al guardar los cambios', icon: 'error' });
            }
        } catch (error) {
            console.error('Error saving lead data:', error);
            AppSwal.fire({ title: 'Error', text: 'Ocurrió un error al guardar los cambios', icon: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <div className="header-accent" />
                    <h2 className="modal-title">DATOS DEL LEAD</h2>
                    <p className="modal-subtitle">Información detallada de la base original</p>
                </div>

                <div className="modal-body custom-scrollbar">
                    {loading ? (
                        <div className="loading-state">Cargando datos...</div>
                    ) : (
                        <div className="form-grid">
                            <div className="field-group">
                                <span className="field-label">RUC (No editable)</span>
                                <input className="field-input disabled" value={formData.ruc} readOnly />
                            </div>
                            <div className="field-group">
                                <span className="field-label">RAZÓN SOCIAL (No editable)</span>
                                <input className="field-input disabled" value={formData.razonSocial} readOnly />
                            </div>

                            <div className="field-group span-2">
                                <span className="field-label">REPRESENTANTE / CONTACTO</span>
                                <input className="field-input" value={formData.contacto} onChange={e => setFormData({ ...formData, contacto: e.target.value })} />
                            </div>

                            <div className="field-group">
                                <span className="field-label">DNI</span>
                                <input className="field-input" value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">TELÉFONO</span>
                                <input className="field-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                            </div>

                            <div className="field-group span-2">
                                <span className="field-label">CORREO</span>
                                <input className="field-input" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} />
                            </div>

                            <div className="field-group">
                                <span className="field-label">DPTO</span>
                                <input className="field-input" value={formData.departamento} onChange={e => setFormData({ ...formData, departamento: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">PROV</span>
                                <input className="field-input" value={formData.provincia} onChange={e => setFormData({ ...formData, provincia: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">DIST</span>
                                <input className="field-input" value={formData.distrito} onChange={e => setFormData({ ...formData, distrito: e.target.value })} />
                            </div>

                            <div className="field-group span-2">
                                <span className="field-label">DIRECCIÓN</span>
                                <input className="field-input" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
                            </div>

                            <div className="field-group">
                                <span className="field-label">SEGMENTO</span>
                                <input className="field-input" value={formData.segmento} onChange={e => setFormData({ ...formData, segmento: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">CONSULTOR</span>
                                <input className="field-input" value={formData.consultor} onChange={e => setFormData({ ...formData, consultor: e.target.value })} />
                            </div>

                            <div className="field-group">
                                <span className="field-label">LÍNEAS</span>
                                <input className="field-input" type="number" value={formData.lineas} onChange={e => setFormData({ ...formData, lineas: e.target.value })} />
                            </div>
                            <div className="field-group">
                                <span className="field-label">CARGO FIJO</span>
                                <input className="field-input" type="text" value={formData.cargoFijo} onChange={e => setFormData({ ...formData, cargoFijo: e.target.value })} />
                            </div>

                            <div className="field-group span-2">
                                <span className="field-label">OBSERVACIONES</span>
                                <textarea className="field-textarea" value={formData.observacion} onChange={e => setFormData({ ...formData, observacion: e.target.value })} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn-cancel" disabled={saving}>CANCELAR</button>
                    {!loading && (
                        <button onClick={handleSave} className="btn-submit" disabled={saving}>
                            {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.85);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(12px);
                    padding: 20px;
                }

                .modal-container {
                    background: #09090b;
                    width: 100%;
                    max-width: 700px;
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
                    padding: 2rem 2rem 1.5rem;
                    text-align: center;
                    position: relative;
                }

                .header-accent {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #10b981, #3b82f6);
                }

                .modal-title {
                    color: white;
                    font-size: 1.25rem;
                    font-weight: 950;
                    letter-spacing: -0.02em;
                    margin-bottom: 0.25rem;
                }

                .modal-subtitle {
                    color: #71717a;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 2rem 2rem;
                }

                .loading-state {
                    color: #71717a;
                    text-align: center;
                    padding: 3rem;
                    font-weight: 600;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

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
                }

                .field-input {
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

                .field-input.disabled {
                    background: rgba(255, 255, 255, 0.03);
                    color: #71717a;
                    cursor: not-allowed;
                }

                .field-input:focus:not(.disabled) {
                    border-color: #10b981;
                }

                .field-textarea {
                    width: 100%;
                    background: #000;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 0.75rem;
                    padding: 0.75rem 1rem;
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 600;
                    outline: none;
                    height: 80px;
                    resize: none;
                }

                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    padding: 1.5rem 2rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .btn-cancel {
                    flex: 1;
                    padding: 0.875rem;
                    border-radius: 0.75rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: transparent;
                    color: #71717a;
                    font-weight: 900;
                    font-size: 0.75rem;
                    cursor: pointer;
                }

                .btn-submit {
                    flex: 1.5;
                    padding: 0.875rem;
                    border-radius: 0.75rem;
                    border: none;
                    background: linear-gradient(90deg, #10b981, #059669);
                    color: white;
                    font-weight: 950;
                    font-size: 0.8rem;
                    cursor: pointer;
                    box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4);
                }

                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }

                @media (max-width: 640px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .field-group.span-2 { grid-column: span 1; }
                }
            `}</style>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
