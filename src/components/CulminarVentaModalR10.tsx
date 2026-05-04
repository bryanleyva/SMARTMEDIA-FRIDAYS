'use client';

import { useState } from 'react';
import { culminarVentaR10, CulminarVentaInput } from '@/app/actions/leads-r10';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    ventaId: string;
    nombreCliente: string;
}

export default function CulminarVentaModalR10({ isOpen, onClose, onSaved, ventaId, nombreCliente }: Props) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    const [tipoEntrega, setTipoEntrega] = useState<'DELIVERY' | 'RETIRO_EN_TIENDA' | ''>('');
    // Delivery
    const [numeroContacto, setNumeroContacto] = useState('');
    const [direccionEntrega, setDireccionEntrega] = useState('');
    const [referenciaEntrega, setReferenciaEntrega] = useState('');
    const [coordenadas, setCoordenadas] = useState('');
    const [tipoEnvio, setTipoEnvio] = useState<'EXPRESS' | 'REGULAR' | ''>('');
    const [fechaEnvio, setFechaEnvio] = useState('');
    const [rangoEnvio, setRangoEnvio] = useState<'9 AM - 1 PM' | '2 PM - 8 PM' | ''>('');
    // Tienda
    const [pdvTienda, setPdvTienda] = useState('');

    const reset = () => {
        setStep(1); setTipoEntrega('');
        setNumeroContacto(''); setDireccionEntrega(''); setReferenciaEntrega('');
        setCoordenadas(''); setTipoEnvio(''); setFechaEnvio(''); setRangoEnvio('');
        setPdvTienda('');
    };

    const handleClose = () => { reset(); onClose(); };

    const canAdvance = (): boolean => {
        switch (step) {
            case 1: return !!tipoEntrega;
            case 2:
                if (tipoEntrega === 'DELIVERY') {
                    return !!numeroContacto.trim() && !!direccionEntrega.trim() && !!referenciaEntrega.trim() && !!coordenadas.trim() && !!tipoEnvio;
                }
                return !!pdvTienda.trim();
            case 3:
                if (tipoEntrega === 'DELIVERY') return !!fechaEnvio && !!rangoEnvio;
                return true;
            default: return false;
        }
    };

    const nextStep = () => {
        if (!canAdvance()) {
            AppSwal.fire({ icon: 'warning', title: 'Completa los campos obligatorios', timer: 1800, showConfirmButton: false });
            return;
        }
        // Si es Retiro en Tienda, saltamos el paso 3 (solo aplica a delivery)
        if (step === 2 && tipoEntrega === 'RETIRO_EN_TIENDA') {
            handleSubmit();
        } else {
            setStep(step + 1);
        }
    };

    const handleSubmit = async () => {
        if (!canAdvance()) return;
        setSaving(true);
        try {
            const payload: CulminarVentaInput = {
                tipoEntrega: tipoEntrega as 'DELIVERY' | 'RETIRO_EN_TIENDA',
                numeroContacto: numeroContacto.trim() || undefined,
                direccionEntrega: direccionEntrega.trim() || undefined,
                referenciaEntrega: referenciaEntrega.trim() || undefined,
                coordenadas: coordenadas.trim() || undefined,
                tipoEnvio: tipoEnvio || undefined,
                fechaEnvio: fechaEnvio || undefined,
                rangoEnvio: rangoEnvio || undefined,
                pdvTienda: pdvTienda.trim() || undefined,
            };
            const res = await culminarVentaR10(ventaId, payload);
            if (res.success) {
                await AppSwal.fire({ icon: 'success', title: 'Venta culminada', timer: 1800, showConfirmButton: false });
                reset(); onSaved(); onClose();
            } else {
                AppSwal.fire({ icon: 'error', title: 'Error', text: res.error });
            }
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const totalSteps = tipoEntrega === 'RETIRO_EN_TIENDA' ? 2 : 3;
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
                background: '#0a0a0b', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px',
                width: '100%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Culminar Venta</h2>
                            <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{nombreCliente} · Paso {step} de {totalSteps}</p>
                        </div>
                        <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                        <div style={{ width: `${(step / totalSteps) * 100}%`, height: '100%', background: '#10b981', borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                    {/* PASO 1: Tipo entrega */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label style={label}>Tipo de entrega *</label>
                            {[
                                { val: 'DELIVERY', lbl: 'DELIVERY' },
                                { val: 'RETIRO_EN_TIENDA', lbl: 'RETIRO EN TIENDA' },
                            ].map(opt => (
                                <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: tipoEntrega === opt.val ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${tipoEntrega === opt.val ? '#10b981' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', cursor: 'pointer', color: 'white' }}>
                                    <input type="radio" name="tipoEntrega" checked={tipoEntrega === opt.val} onChange={() => setTipoEntrega(opt.val as any)} style={{ accentColor: '#10b981' }} />
                                    <span style={{ fontWeight: 600 }}>{opt.lbl}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* PASO 2: Detalles según tipo */}
                    {step === 2 && tipoEntrega === 'DELIVERY' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={label}>Número de contacto *</label>
                                <input type="text" value={numeroContacto} onChange={e => setNumeroContacto(e.target.value)} style={input} />
                            </div>
                            <div>
                                <label style={label}>Dirección (entrega) *</label>
                                <input type="text" value={direccionEntrega} onChange={e => setDireccionEntrega(e.target.value)} style={input} />
                            </div>
                            <div>
                                <label style={label}>Referencia (entrega) *</label>
                                <input type="text" value={referenciaEntrega} onChange={e => setReferenciaEntrega(e.target.value)} style={input} />
                            </div>
                            <div>
                                <label style={label}>Coordenadas *</label>
                                <input type="text" value={coordenadas} onChange={e => setCoordenadas(e.target.value)} style={input} placeholder="-12.0464, -77.0428" />
                            </div>
                            <div>
                                <label style={label}>Tipo de envío *</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {(['EXPRESS', 'REGULAR'] as const).map(t => (
                                        <button key={t} onClick={() => setTipoEnvio(t)} style={{ flex: 1, padding: '0.75rem', background: tipoEnvio === t ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${tipoEnvio === t ? '#10b981' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{t}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && tipoEntrega === 'RETIRO_EN_TIENDA' && (
                        <div>
                            <label style={label}>PDV - Tienda *</label>
                            <textarea value={pdvTienda} onChange={e => setPdvTienda(e.target.value)} style={{ ...input, minHeight: '100px', resize: 'vertical' }} placeholder="Nombre y dirección de la tienda" />
                        </div>
                    )}

                    {/* PASO 3: Fecha y rango (solo delivery) */}
                    {step === 3 && tipoEntrega === 'DELIVERY' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={label}>Fecha de envío *</label>
                                <input
                                    type="date"
                                    value={fechaEnvio}
                                    onChange={e => setFechaEnvio(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    style={{ ...input, colorScheme: 'dark' }}
                                />
                            </div>
                            <div>
                                <label style={label}>Rango de envío *</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {(['9 AM - 1 PM', '2 PM - 8 PM'] as const).map(r => (
                                        <button key={r} onClick={() => setRangoEnvio(r)} style={{ flex: 1, padding: '0.75rem', background: rangoEnvio === r ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${rangoEnvio === r ? '#10b981' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{r}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <button onClick={step === 1 ? handleClose : () => setStep(step - 1)} disabled={saving} style={{
                        padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white',
                        cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
                    }}>
                        {step === 1 ? 'Cancelar' : '← Atrás'}
                    </button>
                    {step < totalSteps ? (
                        <button onClick={nextStep} disabled={saving} style={{
                            padding: '0.75rem 1.5rem', background: '#10b981', border: 'none',
                            borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700,
                        }}>Siguiente →</button>
                    ) : (
                        <button onClick={handleSubmit} disabled={saving || !canAdvance()} style={{
                            padding: '0.75rem 1.75rem', background: saving ? '#6b7280' : '#10b981',
                            border: 'none', borderRadius: '8px', color: 'white',
                            cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700,
                        }}>
                            {saving ? 'Guardando...' : 'Culminar Venta'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}