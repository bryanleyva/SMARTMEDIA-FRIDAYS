'use client';

import { useState } from 'react';
import { saveInteresadoR10, LineaVentaR10, VentaR10Input } from '@/app/actions/leads-r10';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    ejecutivo: string;
}

const CANALES = ['Call Center', 'Marketing Digital', 'Publicidad', 'Referido', 'Otros'];
const TIPOS_INGRESO = ['Ingreso nuevo', 'Línea adicional portabilidad', 'Línea adicional alta'];
const ESTADOS_CIVILES = ['SOLTERO/A', 'CASADO/A', 'VIUDO/A', 'DIVORCIADO/A', 'Otros'];
const OPERADORES = ['MOVISTAR', 'CLARO', 'BITEL', 'Otros'];
const PLANES = [
    'POWER 39.90', 'POWER 49.90', 'POWER 59.90',
    'POWER ILIM 69.90', 'POWER ILIM 79.90', 'POWER ILIM 99.90', 'POWER ILIM 129.90',
];

const emptyLinea = (): LineaVentaR10 => ({
    tipoVenta: 'ALTA',
    numeroPortar: '',
    operadorActual: '',
    modalidadOperador: undefined,
    plan: '',
    promocionBrindada: '',
});

export default function SubirVentaModalR10({ isOpen, onClose, onSaved, ejecutivo }: Props) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Secciones 1-3 (datos generales)
    const [canalVenta, setCanalVenta] = useState('');
    const [canalVentaOtro, setCanalVentaOtro] = useState('');
    const [rucDni, setRucDni] = useState('');
    const [tipoIngreso, setTipoIngreso] = useState('');
    const [nombresApellidos, setNombresApellidos] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [estadoCivil, setEstadoCivil] = useState('');
    const [estadoCivilOtro, setEstadoCivilOtro] = useState('');
    const [distritoNacimiento, setDistritoNacimiento] = useState('');
    const [nombrePapa, setNombrePapa] = useState('');
    const [nombreMama, setNombreMama] = useState('');
    const [correo, setCorreo] = useState('');
    const [observacion, setObservacion] = useState('');

    // Líneas
    const [lineas, setLineas] = useState<LineaVentaR10[]>([emptyLinea()]);

    const resetForm = () => {
        setStep(1);
        setCanalVenta(''); setCanalVentaOtro('');
        setRucDni(''); setTipoIngreso('');
        setNombresApellidos(''); setFechaNacimiento('');
        setEstadoCivil(''); setEstadoCivilOtro('');
        setDistritoNacimiento(''); setNombrePapa(''); setNombreMama(''); setCorreo('');
        setObservacion('');
        setLineas([emptyLinea()]);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const updateLinea = (idx: number, patch: Partial<LineaVentaR10>) => {
        setLineas(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
    };

    const addLinea = () => setLineas(prev => [...prev, emptyLinea()]);
    const removeLinea = (idx: number) => setLineas(prev => prev.filter((_, i) => i !== idx));

    // Validación por paso
    const canAdvance = (): boolean => {
        switch (step) {
            case 1: return !!canalVenta && (canalVenta !== 'Otros' || !!canalVentaOtro.trim());
            case 2: return !!rucDni.trim() && !!tipoIngreso;
            case 3: return !!nombresApellidos.trim() && !!fechaNacimiento && !!estadoCivil &&
                           !!distritoNacimiento.trim() && !!nombrePapa.trim() &&
                           !!nombreMama.trim() && !!correo.trim();
            case 4: return lineas.length > 0 && lineas.every(l => !!l.tipoVenta);
            case 5: {
                // Solo validar portabilidad para líneas que lo sean
                const portas = lineas.filter(l => l.tipoVenta === 'PORTABILIDAD');
                if (portas.length === 0) return true;
                return portas.every(l => !!l.numeroPortar?.trim() && !!l.operadorActual && !!l.modalidadOperador);
            }
            case 6: return lineas.every(l => !!l.plan && !!l.promocionBrindada.trim());
            default: return false;
        }
    };

    const nextStep = () => {
        if (!canAdvance()) {
            AppSwal.fire({ icon: 'warning', title: 'Completa los campos obligatorios', timer: 1800, showConfirmButton: false });
            return;
        }
        // Si paso 4 → 5 y NINGUNA línea es portabilidad, saltar el 5
        if (step === 4 && !lineas.some(l => l.tipoVenta === 'PORTABILIDAD')) {
            setStep(6);
        } else {
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        // Al volver del 6, si no había portabilidad, saltar el 5
        if (step === 6 && !lineas.some(l => l.tipoVenta === 'PORTABILIDAD')) {
            setStep(4);
        } else {
            setStep(step - 1);
        }
    };

    const handleSubmit = async () => {
        if (!canAdvance()) return;
        setSaving(true);
        try {
            const payload: VentaR10Input = {
                canalVenta, canalVentaOtro: canalVenta === 'Otros' ? canalVentaOtro : undefined,
                rucDni: rucDni.trim(), tipoIngreso,
                nombresApellidos: nombresApellidos.trim(),
                fechaNacimiento, estadoCivil,
                estadoCivilOtro: estadoCivil === 'Otros' ? estadoCivilOtro : undefined,
                distritoNacimiento: distritoNacimiento.trim(),
                nombrePapa: nombrePapa.trim(),
                nombreMama: nombreMama.trim(),
                correo: correo.trim(),
                lineas,
                observacion: observacion.trim() || undefined,
            };
            const res = await saveInteresadoR10(payload, ejecutivo);
            if (res.success) {
                await AppSwal.fire({ icon: 'success', title: 'Venta registrada', text: `ID: ${res.ventaId}`, timer: 2000, showConfirmButton: false });
                resetForm();
                onSaved();
                onClose();
            } else {
                AppSwal.fire({ icon: 'error', title: 'Error', text: res.error });
            }
        } catch (err: any) {
            AppSwal.fire({ icon: 'error', title: 'Error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const totalSteps = lineas.some(l => l.tipoVenta === 'PORTABILIDAD') ? 6 : 5;
    const visualStep = step === 6 && !lineas.some(l => l.tipoVenta === 'PORTABILIDAD') ? 5 : step;

    // Estilos
    const input: React.CSSProperties = {
        width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.95rem',
    };
    const label: React.CSSProperties = {
        display: 'block', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            backdropFilter: 'blur(6px)',
        }} onClick={handleClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#0a0a0b', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px',
                width: '100%', maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Ingresar Venta R10</h2>
                            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>Paso {visualStep} de {totalSteps}</p>
                        </div>
                        <button onClick={handleClose} style={{
                            background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white',
                            width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem',
                        }}>✕</button>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                        <div style={{
                            width: `${(visualStep / totalSteps) * 100}%`, height: '100%',
                            background: '#10b981', borderRadius: '2px', transition: 'width 0.3s',
                        }} />
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>

                    {/* PASO 1: Canal de venta */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <label style={label}>Canal de Venta *</label>
                            {CANALES.map(c => (
                                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: canalVenta === c ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${canalVenta === c ? '#10b981' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', color: 'white' }}>
                                    <input type="radio" name="canal" value={c} checked={canalVenta === c} onChange={e => setCanalVenta(e.target.value)} style={{ accentColor: '#10b981' }} />
                                    <span>{c}</span>
                                </label>
                            ))}
                            {canalVenta === 'Otros' && (
                                <input type="text" placeholder="Especifique canal..." value={canalVentaOtro} onChange={e => setCanalVentaOtro(e.target.value)} style={input} />
                            )}
                        </div>
                    )}

                    {/* PASO 2: RUC/DNI + Tipo ingreso */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={label}>RUC / DNI *</label>
                                <input type="text" value={rucDni} onChange={e => setRucDni(e.target.value)} style={input} placeholder="Ej: 71234567 o 10712345678" />
                            </div>
                            <div>
                                <label style={label}>Venta *</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {TIPOS_INGRESO.map(t => (
                                        <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: tipoIngreso === t ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${tipoIngreso === t ? '#10b981' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', color: 'white' }}>
                                            <input type="radio" name="tipoIngreso" value={t} checked={tipoIngreso === t} onChange={e => setTipoIngreso(e.target.value)} style={{ accentColor: '#10b981' }} />
                                            <span>{t}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: Datos personales */}
                    {step === 3 && (
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={label}>Nombres y Apellidos *</label>
                                <input type="text" value={nombresApellidos} onChange={e => setNombresApellidos(e.target.value)} style={input} />
                            </div>
                            <div>
                                <label style={label}>Fecha de Nacimiento *</label>
                                <input
                                    type="date"
                                    value={fechaNacimiento}
                                    onChange={e => setFechaNacimiento(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    style={{ ...input, colorScheme: 'dark' }}
                                />
                                {fechaNacimiento === '' && nombresApellidos && (
                                    <span style={{ color: '#fbbf24', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                                        Verifica que la fecha sea válida
                                    </span>
                                )}
                            </div>
                            <div>
                                <label style={label}>Estado Civil *</label>
                                <select
                                    value={estadoCivil}
                                    onChange={e => setEstadoCivil(e.target.value)}
                                    style={{ ...input, colorScheme: 'dark' }}
                                >
                                    <option value="" style={{ background: '#0a0a0b', color: 'white' }}>Seleccionar...</option>
                                    {ESTADOS_CIVILES.map(ec => (
                                        <option key={ec} value={ec} style={{ background: '#0a0a0b', color: 'white' }}>
                                            {ec}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {estadoCivil === 'Otros' && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={label}>Especifique estado civil</label>
                                    <input type="text" value={estadoCivilOtro} onChange={e => setEstadoCivilOtro(e.target.value)} style={input} />
                                </div>
                            )}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={label}>Distrito (Nacimiento) *</label>
                                <input type="text" value={distritoNacimiento} onChange={e => setDistritoNacimiento(e.target.value)} style={input} />
                            </div>
                            <div>
                                <label style={label}>Nombre de Papá *</label>
                                <input type="text" value={nombrePapa} onChange={e => setNombrePapa(e.target.value)} style={input} />
                            </div>
                            <div>
                                <label style={label}>Nombre de Mamá *</label>
                                <input type="text" value={nombreMama} onChange={e => setNombreMama(e.target.value)} style={input} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={label}>Correo electrónico *</label>
                                <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} style={input} />
                            </div>
                        </div>
                    )}

                    {/* PASO 4: Tipo de venta por línea */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
                                Define el tipo de venta para cada línea. Puedes agregar más líneas.
                            </p>
                            {lineas.map((l, idx) => (
                                <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>LÍNEA {idx + 1}</span>
                                        {lineas.length > 1 && (
                                            <button onClick={() => removeLinea(idx)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Quitar</button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {(['PORTABILIDAD', 'ALTA'] as const).map(t => (
                                            <button key={t} onClick={() => updateLinea(idx, { tipoVenta: t })} style={{ flex: 1, padding: '0.75rem', background: l.tipoVenta === t ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${l.tipoVenta === t ? '#10b981' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button onClick={addLinea} style={{ padding: '0.75rem', background: 'transparent', border: '1px dashed rgba(16,185,129,0.5)', borderRadius: '10px', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>+ Agregar otra línea</button>
                        </div>
                    )}

                    {/* PASO 5: Portabilidad (solo para líneas de portabilidad) */}
                    {step === 5 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
                                Completa los datos de portabilidad para cada línea aplicable.
                            </p>
                            {lineas.map((l, idx) => {
                                if (l.tipoVenta !== 'PORTABILIDAD') return null;
                                return (
                                    <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>LÍNEA {idx + 1} - PORTABILIDAD</span>
                                        <div>
                                            <label style={label}>Número a portar *</label>
                                            <input type="text" value={l.numeroPortar || ''} onChange={e => updateLinea(idx, { numeroPortar: e.target.value })} style={input} />
                                        </div>
                                        <div>
                                            <label style={label}>Operador actual *</label>
<select
    value={l.operadorActual || ''}
    onChange={e => updateLinea(idx, { operadorActual: e.target.value })}
    style={{ ...input, colorScheme: 'dark' }}
>
    <option value="" style={{ background: '#0a0a0b', color: 'white' }}>Seleccionar...</option>
    {OPERADORES.map(o => (
        <option key={o} value={o} style={{ background: '#0a0a0b', color: 'white' }}>{o}</option>
    ))}
</select>
                                        </div>
                                        <div>
                                            <label style={label}>Modalidad *</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {(['POSTPAGO', 'PREPAGO'] as const).map(m => (
                                                    <button key={m} onClick={() => updateLinea(idx, { modalidadOperador: m })} style={{ flex: 1, padding: '0.6rem', background: l.modalidadOperador === m ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${l.modalidadOperador === m ? '#10b981' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{m}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* PASO 6: Planes y promoción */}
                    {step === 6 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>Elige plan y describe la promoción por cada línea.</p>
                            {lineas.map((l, idx) => (
                                <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>LÍNEA {idx + 1}</span>
                                    <div>
                                        <label style={label}>Plan *</label>
<select
    value={l.plan}
    onChange={e => updateLinea(idx, { plan: e.target.value })}
    style={{ ...input, colorScheme: 'dark' }}
>
    <option value="" style={{ background: '#0a0a0b', color: 'white' }}>Seleccionar...</option>
    {PLANES.map(p => (
        <option key={p} value={p} style={{ background: '#0a0a0b', color: 'white' }}>{p}</option>
    ))}
</select>
                                    </div>
                                    <div>
                                        <label style={label}>Promoción brindada *</label>
                                        <textarea value={l.promocionBrindada} onChange={e => updateLinea(idx, { promocionBrindada: e.target.value })} style={{ ...input, minHeight: '60px', resize: 'vertical' }} />
                                    </div>
                                </div>
                            ))}
                            <div>
                                <label style={label}>Observación (opcional)</label>
                                <textarea value={observacion} onChange={e => setObservacion(e.target.value)} style={{ ...input, minHeight: '60px', resize: 'vertical' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <button onClick={step === 1 ? handleClose : prevStep} disabled={saving} style={{
                        padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white',
                        cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
                    }}>
                        {step === 1 ? 'Cancelar' : '← Atrás'}
                    </button>
                    {step < 6 ? (
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
                            {saving ? 'Guardando...' : 'Registrar Venta'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}