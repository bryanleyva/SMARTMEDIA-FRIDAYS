'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { checkLeadAvailability, reassignLead, createManualLead, fetchRucData, resetLeadForNewProposal, getLeadByRuc } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentUser: string;
    onSuccess: (ruc?: string) => void;
}

export default function AddRegistryModal({ isOpen, onClose, currentUser, onSuccess }: Props) {
    const [step, setStep] = useState<'RUC' | 'FORM' | 'CONFIRM_REASSIGN'>('RUC');
    const [ruc, setRuc] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Form Data
    const [formData, setFormData] = useState({
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
        cargoFijo: ''
    });

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('RUC');
            setRuc('');
            setMessage('');
            setFormData({
                razonSocial: '', contacto: '', dni: '', telefono: '', correo: '',
                direccion: '', departamento: '', provincia: '', distrito: '',
                segmento: '', consultor: '', lineas: '', cargoFijo: ''
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCheckRuc = async () => {
        const trimmedRuc = ruc.trim();
        if (!trimmedRuc) return AppSwal.fire({ title: 'Atención', text: 'Ingrese un RUC', icon: 'warning', confirmButtonColor: '#6366f1' });
        setLoading(true);
        setMessage('');

        const res = await checkLeadAvailability(trimmedRuc);
        setLoading(false);

        if (res.status === 'PROTECTED') {
            const isSameOwner = res.owner?.trim().toUpperCase() === currentUser?.trim().toUpperCase();
            const isProposalState = res.estado === 'PROPUESTA ENVIADA' || res.estado === 'ENVIADO A PROSPECTOS' || res.estado === 'INTERESADO';

            if (isSameOwner && isProposalState) {
                const result = await AppSwal.fire({
                    title: 'REGISTRO CON PROPUESTA',
                    text: 'Usted ya ha enviado una propuesta a este RUC. ¿Desea enviar una NUEVA propuesta adicional?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'SÍ, ENVIAR OTRA',
                    cancelButtonText: 'CANCELAR',
                    confirmButtonColor: '#6366f1'
                });

                if (result.isConfirmed) {
                    setLoading(true);
                    const prep = await resetLeadForNewProposal(ruc);
                    if (prep.success) {
                        // Pre-llenar con datos existentes
                        const fullData = await getLeadByRuc(ruc);
                        if (fullData.success && fullData.data) {
                            const d = fullData.data;
                            setFormData({
                                razonSocial: d.razonSocial || '',
                                contacto: d.contacto || '',
                                dni: d.dni || '',
                                telefono: d.telefono || '',
                                correo: d.correo || '',
                                direccion: d.direccion || '',
                                departamento: d.departamento || '',
                                provincia: d.provincia || '',
                                distrito: d.distrito || '',
                                segmento: d.segmento || '',
                                consultor: d.consultor || '',
                                lineas: d.lineas || '',
                                cargoFijo: d.cargoFijo || ''
                            });
                            setStep('FORM');
                        }
                    } else {
                        AppSwal.fire({ title: 'Error', text: prep.error || 'Error al preparar re-propuesta', icon: 'error' });
                    }
                    setLoading(false);
                    return;
                }
                return; // User cancelled
            }

            // Si el dueño ya es el usuario actual, simplemente lo cargamos en el LeadManager
            if (isSameOwner) {
                onSuccess(ruc);
                onClose();
                return;
            }

            setMessage(res.message || 'Registro protegido');
        } else if (res.status === 'AVAILABLE_FOR_REASSIGNMENT') {
            setMessage(`El registro existe pero está disponible para reasignación (Anterior: ${res.owner || 'N/A'}).`);
            setStep('CONFIRM_REASSIGN');
        } else if (res.status === 'NOT_FOUND') {
            const apiData = await fetchRucData(ruc);
            if (apiData) {
                setFormData(prev => ({
                    ...prev,
                    razonSocial: apiData.razonSocial || '',
                    direccion: apiData.direccion || '',
                    departamento: apiData.departamento || '',
                    provincia: apiData.provincia || '',
                    distrito: apiData.distrito || ''
                }));
            }
            setStep('FORM');
        } else {
            AppSwal.fire({ title: 'Error', text: 'Error al verificar RUC', icon: 'error', confirmButtonColor: '#ef4444' });
        }
    };

    const handleReassign = async () => {
        setLoading(true);
        const res = await reassignLead(ruc, currentUser);
        setLoading(false);
        if (res.success) {
            AppSwal.fire({ title: 'Éxito', text: 'Registro reasignado exitosamente', icon: 'success', confirmButtonColor: '#10b981' });
            onSuccess(ruc);
            onClose();
        } else {
            AppSwal.fire({ title: 'Error', text: 'Error al reasignar: ' + res.error, icon: 'error', confirmButtonColor: '#ef4444' });
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        const finalData = { ...formData, ruc };
        const res = await createManualLead(finalData, currentUser);
        setLoading(false);
        if (res.success) {
            AppSwal.fire({ title: 'Éxito', text: 'Registro creado exitosamente', icon: 'success', confirmButtonColor: '#10b981' });
            onSuccess(ruc);
            onClose();
        } else {
            AppSwal.fire({ title: 'Error', text: 'Error al crear: ' + res.error, icon: 'error', confirmButtonColor: '#ef4444' });
        }
    };

    const modalContent = (
        <div className="modal-overlay animate-in fade-in duration-300">
            <div className="modal-container scrollable-container">
                <div className="modal-header">
                    <div className="header-accent" />
                    <h2 className="modal-title">AÑADIR REGISTRO</h2>
                    <p className="modal-subtitle">Ingreso manual de prospectos al pipeline</p>
                </div>

                <div className="modal-body custom-scrollbar">
                    {step === 'RUC' && (
                        <div className="ruc-step">
                            <span className="field-label">NÚMERO DE RUC</span>
                            <div className="ruc-input-group">
                                <input
                                    type="text"
                                    value={ruc}
                                    onChange={e => setRuc(e.target.value)}
                                    className="field-input"
                                    placeholder="20123456789"
                                    autoFocus
                                />
                                <button
                                    onClick={handleCheckRuc}
                                    disabled={loading}
                                    className="btn-validate"
                                >
                                    {loading ? '...' : 'VALIDAR'}
                                </button>
                            </div>
                            {message && (
                                <div className="error-message">
                                    <span className="error-icon">⚠️</span>
                                    {message}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'CONFIRM_REASSIGN' && (
                        <div className="confirm-reassign">
                            <div className="warning-banner">
                                <p>{message}</p>
                            </div>
                            <p className="confirm-text">
                                ¿Desea tomar este registro y borrar los datos del asesor anterior?
                            </p>
                            <div className="action-row">
                                <button onClick={onClose} className="btn-cancel">CANCELAR</button>
                                <button onClick={handleReassign} disabled={loading} className="btn-reassign">
                                    {loading ? 'PROCESANDO...' : 'CONFIRMAR Y ASIGNARME'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'FORM' && (
                        <div className="form-grid">
                            <div className="field-group span-2">
                                <span className="field-label">RAZÓN SOCIAL</span>
                                <input className="field-input" value={formData.razonSocial} onChange={e => setFormData({ ...formData, razonSocial: e.target.value })} />
                            </div>
                            <div className="field-group">
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
                            <div className="field-group">
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

                            <div className="modal-footer span-2">
                                <button onClick={onClose} className="btn-cancel">CANCELAR</button>
                                <button onClick={handleCreate} disabled={loading} className="btn-submit">
                                    {loading ? 'GUARDANDO...' : 'GUARDAR REGISTRO'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {step === 'RUC' && (
                    <div className="modal-footer-minimal">
                        <button onClick={onClose} className="btn-close-minimal">CERRAR</button>
                    </div>
                )}
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
                    max-width: 600px;
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
                    background: linear-gradient(90deg, #6366f1, #a855f7);
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

                .ruc-step {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .ruc-input-group {
                    display: flex;
                    gap: 0.75rem;
                }

                .btn-validate {
                    background: #6366f1;
                    color: white;
                    border: none;
                    padding: 0 1.5rem;
                    border-radius: 0.75rem;
                    font-weight: 900;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                }

                .btn-validate:hover {
                    background: #4f46e5;
                    transform: translateY(-1px);
                }

                .error-message {
                    margin-top: 1rem;
                    padding: 1rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 0.75rem;
                    color: #ef4444;
                    font-size: 0.8rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .warning-banner {
                    padding: 1rem;
                    background: rgba(245, 158, 11, 0.1);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                    border-radius: 0.75rem;
                    color: #f59e0b;
                    font-size: 0.85rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                    text-align: center;
                }

                .confirm-text {
                    color: white;
                    text-align: center;
                    margin-bottom: 2rem;
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .action-row {
                    display: flex;
                    gap: 1rem;
                }

                .btn-reassign {
                    flex: 2;
                    background: #f59e0b;
                    color: #000;
                    border: none;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    font-weight: 900;
                    font-size: 0.8rem;
                    cursor: pointer;
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

                .field-input:focus {
                    border-color: #6366f1;
                }

                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
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
                }

                .btn-submit {
                    flex: 2;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    border: none;
                    background: linear-gradient(90deg, #6366f1, #a855f7);
                    color: white;
                    font-weight: 950;
                    font-size: 0.8rem;
                    cursor: pointer;
                    box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
                }

                .modal-footer-minimal {
                    padding: 0 2rem 1.5rem;
                    text-align: center;
                }

                .btn-close-minimal {
                    background: transparent;
                    border: none;
                    color: #52525b;
                    font-weight: 900;
                    font-size: 0.7rem;
                    cursor: pointer;
                    letter-spacing: 0.1em;
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
