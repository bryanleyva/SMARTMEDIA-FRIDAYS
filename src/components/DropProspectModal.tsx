'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { saveDroppedProspect } from '@/app/actions/leads';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    leadData: any;
    userName: string;
    onSuccess: () => void;
}

export default function DropProspectModal({ isOpen, onClose, leadData, userName, onSuccess }: Props) {
    const [motivo, setMotivo] = useState('');
    const [estado, setEstado] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !leadData) return null;

    const handleSave = async () => {
        if (!estado) return AppSwal.fire({ title: 'Atención', text: 'Por favor, seleccione el estado de la caída', icon: 'warning', confirmButtonColor: '#f59e0b' });
        if (estado === 'Otro motivo' && !motivo.trim()) {
            return AppSwal.fire({ title: 'Atención', text: 'Por favor, especifique el motivo detallado en el cuadro de texto', icon: 'warning', confirmButtonColor: '#f59e0b' });
        }

        setLoading(true);
        const data = {
            ruc: leadData.RUC || leadData.ruc,
            razonSocial: leadData['Razón Social'] || leadData.razonSocial || leadData.RAZON_SOCIAL,
            contacto: leadData['Representante Legal'] || leadData.representanteLegal || leadData.CONTACTO,
            telefono: leadData['Teléfonos'] || leadData.TELEFONO || leadData.telefono,
            lineas: leadData['CANTIDAD LINEAS'] || leadData.lineas,
            cargoFijo: leadData['CARGO FIJO'] || leadData.cargoFijo,
            estado: estado,
            motivo: motivo
        };

        const res = await saveDroppedProspect(data, userName, leadData.id || leadData.ID);
        setLoading(false);

        if (res.success) {
            AppSwal.fire({ title: 'Registrado', text: 'Prospecto marcado como VENTA CAIDA', icon: 'success', confirmButtonColor: '#10b981' });
            onSuccess();
            onClose();
        } else {
            AppSwal.fire({ title: 'Error', text: 'Error: ' + res.error, icon: 'error', confirmButtonColor: '#ef4444' });
        }
    };

    const inputStyle = {
        width: '100%',
        backgroundColor: '#000',
        border: '1px solid #333',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '15px',
        outline: 'none'
    };

    const labelStyle = {
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#a1a1aa',
        textTransform: 'uppercase' as const,
        marginBottom: '6px',
        display: 'block'
    };

    const readOnlyBox = {
        ...inputStyle,
        backgroundColor: 'rgba(255,255,255,0.03)',
        color: '#888',
        cursor: 'not-allowed'
    };

    const modalContent = (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#0a0a0a', padding: '40px', borderRadius: '24px',
                width: '500px', maxWidth: '90%', border: '1px solid #1f1f1f',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 900, marginBottom: '8px', textAlign: 'center' }}>
                    VENTA CAÍDA
                </h2>
                <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', marginBottom: '30px' }}>
                    Informe por qué no se concretó esta venta
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <span style={labelStyle}>RUC</span>
                        <div style={readOnlyBox}>{leadData.RUC || leadData.ruc}</div>
                    </div>
                    <div>
                        <span style={labelStyle}>RAZÓN SOCIAL</span>
                        <div style={{ ...readOnlyBox, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {leadData['Razón Social'] || leadData.razonSocial || leadData.RAZON_SOCIAL}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <span style={labelStyle}>LÍNEAS</span>
                        <div style={readOnlyBox}>{leadData['CANTIDAD LINEAS'] || leadData.lineas}</div>
                    </div>
                    <div>
                        <span style={labelStyle}>CARGO FIJO</span>
                        <div style={readOnlyBox}>S/ {leadData['CARGO FIJO'] || leadData.cargoFijo}</div>
                    </div>
                </div>

                <div>
                    <span style={labelStyle}>ESTADO DE LA CAÍDA</span>
                    <select
                        value={estado}
                        onChange={e => setEstado(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
                    >
                        <option value="">SELECCIONE ESTADO</option>
                        <option value="No continúa compra">No continúa compra</option>
                        <option value="Decisión pospuesta">Decisión pospuesta</option>
                        <option value="Satisfecho con operador actual">Satisfecho con operador actual</option>
                        <option value="Mejor oferta de la competencia">Mejor oferta de la competencia</option>
                        <option value="Renovación vigente con otro operador">Renovación vigente con otro operador</option>
                        <option value="Sin oportunidad creada">Sin oportunidad creada</option>
                        <option value="Otro motivo">Otro motivo</option>
                    </select>
                </div>

                <div>
                    <span style={labelStyle}>MOTIVO DE LA CAÍDA {estado === 'Otro motivo' ? '(OBLIGATORIO)' : '(OPCIONAL)'}</span>
                    <textarea
                        value={motivo}
                        onChange={e => setMotivo(e.target.value)}
                        style={{
                            ...inputStyle,
                            height: '100px',
                            resize: 'none',
                            borderColor: (estado === 'Otro motivo' && !motivo.trim()) ? '#ef4444' : '#333'
                        }}
                        placeholder={estado === 'Otro motivo' ? "Por favor, especifique el otro motivo..." : "Describa brevemente el motivo..."}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button
                        onClick={onClose}
                        style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontWeight: 700 }}
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '16px', borderRadius: '12px', border: 'none',
                            background: '#ef4444', color: 'white', fontWeight: 900, cursor: 'pointer',
                            boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        {loading ? 'GUARDANDO...' : 'GUARDAR MOTIVO'}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
