'use client';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    venta: any;
    onCulminar: () => void;
    onDarDeBaja: () => void;
}

export default function DealDetailModalR10({ isOpen, onClose, venta, onCulminar, onDarDeBaja }: Props) {
    if (!isOpen || !venta) return null;

    const infoRow = (label: string, value: any) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
        </div>
    );

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            backdropFilter: 'blur(6px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#0a0a0b', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px',
                width: '100%', maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>#{venta.ventaId}</span>
                            <span style={{ background: venta.estado === 'INTERESADO' ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.15)', color: venta.estado === 'INTERESADO' ? '#fbbf24' : '#10b981', padding: '0.1rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{venta.estado}</span>
                        </div>
                        <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{venta.nombresApellidos}</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
                    {/* Datos del cliente */}
                    <h3 style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Datos del cliente</h3>
                    <div style={{ marginBottom: '1.5rem' }}>
                        {infoRow('RUC / DNI', venta.rucDni)}
                        {infoRow('Tipo de ingreso', venta.tipoIngreso)}
                        {infoRow('Canal de venta', venta.canalVenta)}
                        {infoRow('Fecha de nacimiento', venta.fechaNacimiento)}
                        {infoRow('Estado civil', venta.estadoCivil)}
                        {infoRow('Distrito nacimiento', venta.distritoNacimiento)}
                        {infoRow('Nombre papá', venta.nombrePapa)}
                        {infoRow('Nombre mamá', venta.nombreMama)}
                        {infoRow('Correo', venta.correo)}
                        {infoRow('Ejecutivo', venta.ejecutivo)}
                        {infoRow('Fecha ingreso', venta.fechaIngreso)}
                    </div>

                    {/* Líneas */}
                    <h3 style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                        Líneas ({venta.cantidadLineas})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {venta.lineas.map((l: any, idx: number) => (
                            <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>LÍNEA {l.lineaNum}</span>
                                    <span style={{ background: l.tipoVenta === 'PORTABILIDAD' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)', color: l.tipoVenta === 'PORTABILIDAD' ? '#a5b4fc' : '#6ee7b7', padding: '0.1rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>{l.tipoVenta}</span>
                                </div>
                                {infoRow('Plan', l.plan)}
                                {l.tipoVenta === 'PORTABILIDAD' && (
                                    <>
                                        {infoRow('Nº a portar', l.numeroPortar)}
                                        {infoRow('Operador actual', l.operadorActual)}
                                        {infoRow('Modalidad', l.modalidadOperador)}
                                    </>
                                )}
                                {infoRow('Promoción', l.promocionBrindada)}
                            </div>
                        ))}
                    </div>

                    {venta.observacion && (
                        <>
                            <h3 style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Observación</h3>
                            <p style={{ color: '#d1d5db', fontSize: '0.9rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', margin: 0 }}>{venta.observacion}</p>
                        </>
                    )}
                </div>

                {/* Footer con acciones */}
                {venta.estado === 'INTERESADO' && (
                    <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={onDarDeBaja} style={{
                            padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444',
                            cursor: 'pointer', fontWeight: 700,
                        }}>
                            Dar de Baja
                        </button>
                        <button onClick={onCulminar} style={{
                            padding: '0.75rem 1.5rem', background: '#10b981', border: 'none',
                            borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700,
                            boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                        }}>
                            Culminar Venta →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}