'use client';

import { useState } from 'react';
import { saveDroppedR10 } from '@/app/actions/leads-r10';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    ventaId: string;
    nombreCliente: string;
}

const MOTIVOS = [
    'Cliente no interesado',
    'No contesta',
    'Número equivocado',
    'No califica',
    'Precio alto',
    'Ya tiene el servicio',
    'Otro',
];

export default function DropDealModalR10({ isOpen, onClose, onSaved, ventaId, nombreCliente }: Props) {
    const [motivo, setMotivo] = useState('');
    const [motivoOtro, setMotivoOtro] = useState('');
    const [observacion, setObservacion] = useState('');
    const [saving, setSaving] = useState(false);

    const reset = () => { setMotivo(''); setMotivoOtro(''); setObservacion(''); };
    const handleClose = () => { reset(); onClose(); };

    const canSubmit = !!motivo && (motivo !== 'Otro' || !!motivoOtro.trim());

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSaving(true);
        try {
            const motivoFinal = motivo === 'Otro' ? motivoOtro.trim() : motivo;
            const res = await saveDroppedR10(ventaId, motivoFinal, observacion.trim());
            if (res.success) {
                await AppSwal.fire({ icon: 'success', title: 'Venta dada de baja', timer: 1800, showConfirmButton: false });
                reset(); onSaved(); onClose();
            } else {
                AppSwal.fire({ icon: 'error', title: 'Error', text: res.error });
            }
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const input: React.CSSProperties = {
        width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.95rem',
    };
    const label: React.CSSProperties = {
        display: 'block', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
    };

    return (
        <div onClick={handleClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(6px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#0a0a0b', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px',
                width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Dar de Baja</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{nombreCliente}</p>
                </div>

                <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={label}>Motivo *</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {MOTIVOS.map(m => (
                                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', background: motivo === m ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${motivo === m ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '0.9rem' }}>
                                    <input type="radio" name="motivo" checked={motivo === m} onChange={() => setMotivo(m)} style={{ accentColor: '#ef4444' }} />
                                    <span>{m}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {motivo === 'Otro' && (
                        <div>
                            <label style={label}>Especifique motivo *</label>
                            <input type="text" value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} style={input} />
                        </div>
                    )}
                    <div>
                        <label style={label}>Observación (opcional)</label>
                        <textarea value={observacion} onChange={e => setObservacion(e.target.value)} style={{ ...input, minHeight: '80px', resize: 'vertical' }} />
                    </div>
                </div>

                <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <button onClick={handleClose} disabled={saving} style={{
                        padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white',
                        cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
                    }}>Cancelar</button>
                    <button onClick={handleSubmit} disabled={saving || !canSubmit} style={{
                        padding: '0.75rem 1.75rem', background: saving || !canSubmit ? '#6b7280' : '#ef4444',
                        border: 'none', borderRadius: '8px', color: 'white',
                        cursor: saving || !canSubmit ? 'not-allowed' : 'pointer', fontWeight: 700,
                    }}>
                        {saving ? 'Guardando...' : 'Confirmar baja'}
                    </button>
                </div>
            </div>
        </div>
    );
}