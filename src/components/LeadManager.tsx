'use client';

import { useState, useEffect } from 'react';
import { getNextLead, saveLead, getAgendamientos, getLeadByRuc, promoteToPipeline, fetchRucData } from '@/app/actions/leads';
import AddRegistryModal from './AddRegistryModal';
import { AppSwal } from '@/lib/sweetalert';


interface LeadFormProps {
    userEmail: string;
    userName: string;
    userRole?: string;
}

export default function LeadManager({ userEmail, userName, userRole }: LeadFormProps) {
    const [lead, setLead] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [agendamientos, setAgendamientos] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [formState, setFormState] = useState({
        estado: '',
        deseaInfo: '',
        observacion: '',
        agendamiento: '',
        correo: '',
        lineas: '',
        segmento: '',
        consultor: '',
        contacto: '',
        dni: '',
        telefono: '',
        departamento: '',
        provincia: '',
        distrito: '',
        direccion: '',
        cargoFijo: '',
        operadorActual: ''
    });
    const [searchTerm, setSearchTerm] = useState('');

    const loadAgendamientos = async () => {
        const res = await getAgendamientos(userName, userRole || 'STANDAR');
        if (res.success) {
            setAgendamientos(res.data);
        }
    };

    // Helper to check and enrich lead data
    const verifyAndEnrichLead = async (initialData: any) => {
        let finalData = { ...initialData };

        // CONDITIONAL: If Razón Social is missing, fetch from API
        if (!finalData.razonSocial || finalData.razonSocial.trim() === '') {
            setMessage({ text: '🔍 Buscando datos del RUC...', type: 'success' });
            const rucData = await fetchRucData(finalData.ruc);
            if (rucData) {
                finalData = {
                    ...finalData,
                    razonSocial: rucData.razonSocial || finalData.razonSocial,
                    direccion: rucData.direccion || finalData.direccion,
                    departamento: rucData.departamento || finalData.departamento,
                    provincia: rucData.provincia || finalData.provincia,
                    distrito: rucData.distrito || finalData.distrito,
                    // Map other fields if needed, e.g. condicion/estado from SUNAT
                };
                // Update form state directly here implies we need to return the combined object
                // effectively merging what we got.
                setMessage({ text: '✅ Datos completados por RENIEC/SUNAT', type: 'success' });
            } else {
                setMessage(null);
            }
        }
        return finalData;
    };

    const loadNext = async () => {
        setLoading(true);
        setSaving(false); // CRITICAL: Reset saving state for the new lead
        setMessage(null);
        const res = await getNextLead(userEmail, userName);

        if (res.success) {
            const enrichedData = await verifyAndEnrichLead(res.data);
            setLead(enrichedData);
            setFormState({
                estado: enrichedData.estado || '',
                deseaInfo: enrichedData.deseaInfo || '',
                observacion: enrichedData.observacion || '',
                agendamiento: enrichedData.agendamiento || '',
                correo: enrichedData.correo || '',
                lineas: enrichedData.lineas || '',
                segmento: enrichedData.segmento || '',
                consultor: enrichedData.consultor || '',
                contacto: enrichedData.contacto || '',
                dni: enrichedData.dni || '',
                telefono: enrichedData.telefono || '',
                departamento: enrichedData.departamento || '',
                provincia: enrichedData.provincia || '',
                distrito: enrichedData.distrito || '',
                direccion: enrichedData.direccion || '',
                cargoFijo: enrichedData.cargoFijo || '',
                operadorActual: enrichedData.operadorActual || ''
            });
        } else {
            setLead(null);
            setMessage({ text: res.message || 'No hay registros asignados', type: 'error' });
        }
        await loadAgendamientos();
        setLoading(false);
    };

    const loadSpecificLead = async (ruc: string) => {
        setLoading(true);
        setSaving(false); // Safety reset
        setMessage(null);
        const res = await getLeadByRuc(ruc);

        if (res.success && res.data) {
            const enrichedData = await verifyAndEnrichLead(res.data);
            setLead(enrichedData);
            setFormState({
                estado: enrichedData.estado || '',
                deseaInfo: enrichedData.deseaInfo || '',
                observacion: enrichedData.observacion || '',
                agendamiento: enrichedData.agendamiento || '',
                correo: enrichedData.correo || '',
                lineas: enrichedData.lineas || '',
                segmento: enrichedData.segmento || '',
                consultor: enrichedData.consultor || '',
                contacto: enrichedData.contacto || '',
                dni: enrichedData.dni || '',
                telefono: enrichedData.telefono || '',
                departamento: enrichedData.departamento || '',
                provincia: enrichedData.provincia || '',
                distrito: enrichedData.distrito || '',
                direccion: enrichedData.direccion || '',
                cargoFijo: enrichedData.cargoFijo || '',
                operadorActual: enrichedData.operadorActual || ''
            });
            await loadAgendamientos();
        } else {
            setLead(null);
            setMessage({ text: res.error || 'Error al cargar the registro', type: 'error' });
        }
        setLoading(false);
    };

    const handleLoadScheduled = async (ruc: string) => {
        setLoading(true);
        setSaving(false); // Safety reset
        setMessage({ text: 'Cargando agendado...', type: 'success' });
        const res = await getLeadByRuc(ruc);

        if (res.success && res.data) {
            const enrichedData = await verifyAndEnrichLead(res.data);
            setLead(enrichedData);
            setFormState({
                estado: enrichedData.estado || '',
                deseaInfo: enrichedData.deseaInfo || '',
                observacion: enrichedData.observacion || '',
                agendamiento: enrichedData.agendamiento || '',
                correo: enrichedData.correo || '',
                lineas: enrichedData.lineas || '',
                segmento: enrichedData.segmento || '',
                consultor: enrichedData.consultor || '',
                contacto: enrichedData.contacto || '',
                dni: enrichedData.dni || '',
                telefono: enrichedData.telefono || '',
                departamento: enrichedData.departamento || '',
                provincia: enrichedData.provincia || '',
                distrito: enrichedData.distrito || '',
                direccion: enrichedData.direccion || '',
                cargoFijo: enrichedData.cargoFijo || '',
                operadorActual: enrichedData.operadorActual || ''
            });
            setMessage(null); // Clear the loading message
        } else {
            AppSwal.fire({ title: 'Error', text: res.error || 'Error al cargar lead', icon: 'error', confirmButtonColor: '#ef4444' });
            setMessage({ text: res.error || 'Error al cargar lead', type: 'error' });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadNext();
    }, []);

    const handleSaveAndNext = async () => {
        if (!lead) return;

        // Validation: Mandatory fields for BASIC GESTION
        if (!formState.estado || !formState.deseaInfo || !formState.observacion) {
            setMessage({
                text: '❌ ERROR: Falta completar ¿DESEA INFO?, ESTADO u OBSERVACIÓN.',
                type: 'error'
            });
            return;
        }

        // Validation: Agendamiento required for specific states
        const mandatoryAgendamiento = ['VOLVER A LLAMAR'];
        if (mandatoryAgendamiento.includes(formState.estado) && !formState.agendamiento) {
            setMessage({
                text: '📅 FECHA AGENDAMIENTO REQUERIDA para este estado.',
                type: 'error'
            });
            return;
        }

        // Validation: Sub-reason required for NO INTERESADO
        if (formState.estado === 'NO INTERESADO') {
            setMessage({
                text: '❌ ERROR: Debes seleccionar un motivo para NO INTERESADO.',
                type: 'error'
            });
            return;
        }

        // Validation: Mandatory fields for INTERESADO (Promotion to Pipeline)
        if (formState.estado === 'INTERESADO') {
            const missing = [];
            if (!lead.ruc) missing.push('RUC');
            if (!lead.razonSocial) missing.push('RAZON SOCIAL');
            if (!formState.contacto) missing.push('REPRESENTANTE LEGAL');
            if (!formState.telefono) missing.push('TELEFONO');
            if (!formState.lineas) missing.push('CANTIDAD LINEAS');
            if (!formState.cargoFijo) missing.push('CARGO FIJO');

            if (missing.length > 0) {
                setMessage({
                    text: `❌ ERROR: Campos obligatorios para promoción: ${missing.join(', ')}`,
                    type: 'error'
                });
                return;
            }
        }

        setSaving(true);
        setMessage(null);

        // Prepare data
        const dataToSave = {
            ...formState,
            ruc: lead.ruc,
            razonSocial: lead.razonSocial,
            assignedUser: userName,
            userRole: userRole
        };

        const res = await saveLead(lead.id, dataToSave);

        if (res.success) {
            // Check if we need to promote to pipeline
            if (formState.estado === 'INTERESADO') {
                const promoteRes = await promoteToPipeline({
                    ...lead,
                    ...formState // Ensure we pass latest form data
                }, userName);

                if (!promoteRes.success) {
                    // Non-blocking error, just warn
                    console.error('Pipeline promotion failed:', promoteRes.error);
                    setMessage({ text: `Guardado, pero error al subir Deal: ${promoteRes.error}`, type: 'error' });
                } else {
                    setMessage({ text: '✅ ¡Deal subido al Pipeline con éxito!', type: 'success' });
                }
            } else {
                setMessage({ text: '✅ Gestión guardada', type: 'success' });
            }

            setTimeout(() => {
                loadNext();
            }, 1000);

        } else {
            setMessage({ text: `❌ Error: ${res.error}`, type: 'error' });
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: '#4f46e5', fontSize: '24px' }}>Cargando registro...</div>;

    // Header for the center panel when no lead is present
    const EmptyLeadHeader = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '2rem',
            marginBottom: '2rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#fff' }}>GESTIÓN DE OPORTUNIDAD</h2>
                <p style={{ fontSize: '10px', color: '#ef4444', margin: '4px 0 0 0', fontWeight: '900', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Sin registros asignados actualmente</p>
            </div>
        </div>
    );

    const mapUrl = lead
        ? `https://www.google.com/maps?q=${encodeURIComponent((lead.direccion || '') + ' ' + (lead.distrito || ''))}&output=embed`
        : '';

    // Improved parsing logic for OTHER CONTACTS
    const parseOtherContacts = (raw: string) => {
        if (!raw) return [];
        return raw.split('||').map(entry => {
            const parts = entry.split('-').map(s => s.trim());
            // Expected format: RUC - DNI - NAME - PHONE - DATE
            // But sometimes it might vary, so we handle safely
            if (parts.length < 3) return null; // Not enough info

            return {
                ruc: parts[0],
                dni: parts[1],
                nombre: parts[2],
                telefono: parts[3] || '-',
                fecha: parts[4] || '-'
            };
        }).filter(Boolean); // Remove nulls
    };

    const parsedContactos = lead ? parseOtherContacts(lead.otrosContactos) : [];

    const labelStyle: React.CSSProperties = {
        fontSize: '10px',
        fontWeight: '800',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '4px',
        marginLeft: '2px',
        display: 'block',
        opacity: 0.9
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        backgroundColor: '#000',
        border: '1px solid #333',
        color: '#fff',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none'
    };

    const formatAgendamientoDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            // Handle both "2025-12-19T15:00" and "2025-12-19 15:00"
            const separator = dateStr.includes('T') ? 'T' : ' ';
            const [date, time] = dateStr.split(separator);
            // Reformat YYYY-MM-DD to DD/MM
            const [y, m, d] = date.split('-');
            const formattedDate = `${d}/${m}`;

            return `${formattedDate} ${time ? time.slice(0, 5) : ''}`;
        } catch (e) {
            return dateStr;
        }
    };


    return (
        <>
            <AddRegistryModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                currentUser={userName}
                onSuccess={(ruc) => {
                    if (ruc) {
                        loadSpecificLead(ruc);
                    } else {
                        loadNext();
                    }
                }}
            />

            {/* Contenedor de Scroll Horizontal para mantener los 3 paneles en línea en cualquier pantalla */}
            <div
                className="custom-scrollbar"
                style={{
                    width: '100%',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: '20px'
                }}
            >
                <div style={{
                    display: 'flex',
                    flexFlow: 'row',
                    gap: '16px', // Espacio más estrecho
                    color: '#fff',
                    padding: '0.5rem',
                    alignItems: 'flex-start',
                    minWidth: '1300px' // Reducido significativamente para mejor encaje
                }}>

                    {/* IZQUIERDA: OTROS CONTACTOS */}
                    <div className="form-panel-premium" style={{
                        flex: '0 0 300px', // Ajustado a 300px
                        maxHeight: '85vh',
                        padding: 0,
                        overflow: 'hidden',
                        border: '1px solid rgba(153, 27, 27, 0.2)',
                        opacity: !lead ? 0.3 : 1
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)',
                            padding: '16px',
                            textAlign: 'center',
                            fontWeight: '900',
                            fontSize: '11px',
                            letterSpacing: '0.2em',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>CONTACTOS PREVIOS</div>
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            {parsedContactos.length > 0 ? (
                                parsedContactos.map((contact: any, i: number) => (
                                    <div key={i} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        padding: '16px 0',
                                        fontSize: '12px',
                                        color: '#a1a1aa'
                                    }}>
                                        <div style={{ color: '#ef4444', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}>
                                            REGISTRO {i + 1}
                                        </div>
                                        <div style={{ marginBottom: '4px' }}><span style={{ color: '#52525b', fontWeight: 'bold' }}>NOMBRE:</span> <span style={{ color: '#fff', fontWeight: '600' }}>{contact.nombre}</span></div>
                                        <div style={{ marginBottom: '4px' }}><span style={{ color: '#52525b', fontWeight: 'bold' }}>DNI:</span> {contact.dni}</div>
                                        <div style={{ marginBottom: '4px' }}><span style={{ color: '#52525b', fontWeight: 'bold' }}>TELÉFONO:</span> <span style={{ color: '#ef4444', fontWeight: '800' }}>{contact.telefono}</span></div>
                                        <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.6 }}><span style={{ color: '#52525b' }}>FECHA:</span> {contact.fecha}</div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', fontSize: '13px', opacity: 0.3, marginTop: '40px', fontStyle: 'italic' }}>Sin contactos previos</div>
                            )}
                        </div>
                    </div>

                    {/* CENTRO: FORMULARIO */}
                    <div className="form-panel-premium" style={{
                        flex: '1 1 600px', // Reducido aún más de 700px a 600px
                        padding: '1.5rem', // Padding aún más compacto
                        position: 'relative',
                        overflow: 'visible',
                        minWidth: '600px',
                        minHeight: '400px'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '6px',
                            background: 'linear-gradient(90deg, #4f46e5 0%, #818cf8 100%)',
                            borderRadius: '2.5rem 2.5rem 0 0'
                        }} />

                        {!lead ? (
                            <>
                                <EmptyLeadHeader />
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '20px',
                                    padding: '50px 20px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '40px', opacity: 0.2 }}>📋</div>
                                    <div style={{ maxWidth: '300px' }}>
                                        <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0, fontWeight: '600' }}>
                                            {message ? message.text : 'No tienes registros asignados en este momento.'}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#52525b', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Solicita una carga al administrador o agrega un registro manualmente.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="action-btn-premium"
                                        style={{
                                            marginTop: '20px',
                                            padding: '0 30px',
                                            height: '3.5rem',
                                            fontSize: '12px',
                                            fontWeight: '950',
                                            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
                                        }}
                                    >
                                        + AGREGAR PRIMER REGISTRO
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingBottom: '2rem',
                                    marginBottom: '2rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#fff' }}>GESTIÓN DE OPORTUNIDAD</h2>
                                        <p style={{ fontSize: '10px', color: '#10b981', margin: '4px 0 0 0', fontWeight: '900', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Leads v2.0 • Prospección Activa</p>
                                    </div>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="action-btn-premium"
                                        style={{ height: '3rem', fontSize: '11px', fontWeight: '900' }}
                                    >
                                        + NUEVO REGISTRO
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div>
                                        <span style={labelStyle}>RUC DE LA EMPRESA</span>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" value={lead.ruc} disabled className="custom-input-premium" style={{ width: '100%', borderLeft: '4px solid #4f46e5' }} />
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', opacity: 0.3, letterSpacing: '0.1em', fontWeight: 'bold' }}>{lead.id}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <span style={labelStyle}>RAZÓN SOCIAL</span>
                                        <input type="text" value={lead.razonSocial} disabled className="custom-input-premium" style={{ width: '100%', fontWeight: '900', color: '#fff' }} />
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <span style={labelStyle}>NOMBRE DEL CONTACTO PRINCIPAL</span>
                                        <input type="text" value={formState.contacto} onChange={(e) => setFormState({ ...formState, contacto: e.target.value })} className="custom-input-premium" style={{ width: '100%' }} />
                                    </div>

                                    <div>
                                        <span style={labelStyle}>DNI REPRESENTANTE</span>
                                        <input type="text" value={formState.dni} onChange={(e) => setFormState({ ...formState, dni: e.target.value })} className="custom-input-premium" style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <span style={labelStyle}>TELÉFONO DE CONTACTO</span>
                                        <input type="text" value={formState.telefono} onChange={(e) => setFormState({ ...formState, telefono: e.target.value })} className="custom-input-premium" style={{ width: '100%', color: '#10b981', fontWeight: '900', fontSize: '20px', textAlign: 'right' }} />
                                    </div>

                                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <span style={labelStyle}>DEPARTAMENTO</span>
                                            <input type="text" value={formState.departamento} onChange={(e) => setFormState({ ...formState, departamento: e.target.value })} className="custom-input-premium" style={{ width: '100%', fontSize: '12px' }} />
                                        </div>
                                        <div>
                                            <span style={labelStyle}>PROVINCIA</span>
                                            <input type="text" value={formState.provincia} onChange={(e) => setFormState({ ...formState, provincia: e.target.value })} className="custom-input-premium" style={{ width: '100%', fontSize: '12px' }} />
                                        </div>
                                        <div>
                                            <span style={labelStyle}>DISTRITO</span>
                                            <input type="text" value={formState.distrito} onChange={(e) => setFormState({ ...formState, distrito: e.target.value })} className="custom-input-premium" style={{ width: '100%', fontSize: '12px' }} />
                                        </div>
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <span style={labelStyle}>DIRECCIÓN FISCAL / COMERCIAL</span>
                                        <input type="text" value={formState.direccion} onChange={(e) => setFormState({ ...formState, direccion: e.target.value })} className="custom-input-premium" style={{ width: '100%' }} />
                                    </div>

                                    {/* MAPA DEBAJO DE DIRECCION */}
                                    <div style={{ gridColumn: 'span 2', height: '180px', borderRadius: '1.2rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                                        <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(lead.direccion + ' ' + lead.distrito)}&output=embed`} />
                                    </div>

                                    {/* EDITABLE FIELDS ROW 1: CORREO, SEGMENTO, CONSULTOR */}
                                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <span style={labelStyle}>CORREO ELECTRÓNICO</span>
                                            <input type="text" value={formState.correo} onChange={(e) => setFormState({ ...formState, correo: e.target.value })} className="custom-input-premium" style={{ width: '100%' }} placeholder="ejemplo@empresa.com" />
                                        </div>
                                        <div>
                                            <span style={labelStyle}>SEGMENTACIÓN</span>
                                            <select
                                                value={formState.segmento}
                                                onChange={(e) => setFormState({ ...formState, segmento: e.target.value })}
                                                className="custom-select-premium"
                                                style={{ width: '100%' }}
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
                                        <div>
                                            <span style={labelStyle}>CONSULTOR ASIGNADO</span>
                                            <input type="text" value={formState.consultor} onChange={(e) => setFormState({ ...formState, consultor: e.target.value })} className="custom-input-premium" style={{ width: '100%' }} placeholder="Nombre del consultor..." />
                                        </div>
                                    </div>

                                    {/* EDITABLE FIELDS ROW 2: LINEAS, CARGO FIJO */}
                                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <span style={labelStyle}>POTENCIAL (N° LINEAS)</span>
                                            <input
                                                type="text"
                                                value={formState.lineas}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setFormState({ ...formState, lineas: val });
                                                }}
                                                className="custom-input-premium"
                                                style={{ width: '100%', textAlign: 'center', color: '#fbbf24', fontWeight: '900', fontSize: '18px' }}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <span style={labelStyle}>CARGO FIJO S/</span>
                                            <input
                                                type="text"
                                                value={formState.cargoFijo}
                                                onChange={(e) => {
                                                    // Allow decimals: digits and one dot
                                                    const val = e.target.value.replace(/[^\d.]/g, '');
                                                    // Ensure only one dot
                                                    const parts = val.split('.');
                                                    const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                                    setFormState({ ...formState, cargoFijo: cleanVal });
                                                }}
                                                className="custom-input-premium"
                                                style={{ width: '100%', textAlign: 'center', color: '#10b981', fontWeight: '900', fontSize: '18px' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <span style={labelStyle}>OPERADOR ACTUAL</span>
                                        <input type="text" value={formState.operadorActual} disabled className="custom-input-premium" style={{ width: '100%', color: '#fbbf24', fontWeight: '900' }} />
                                    </div>

                                    {/* GESTIÓN PANEL */}
                                    <div style={{
                                        gridColumn: 'span 2',
                                        background: 'rgba(0,0,0,0.3)',
                                        padding: '2rem',
                                        borderRadius: '1.5rem',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '1.5rem',
                                        marginTop: '1rem',
                                        border: '1px solid rgba(255,255,255,0.03)'
                                    }}>
                                        <div>
                                            <span style={{ ...labelStyle, color: '#818cf8', opacity: 1 }}>¿SOLICITA INFORMACIÓN?</span>
                                            <select className="custom-select-premium" style={{ width: '100%' }} value={formState.deseaInfo} onChange={(e) => setFormState({ ...formState, deseaInfo: e.target.value })}>
                                                <option value="">SELECCIONE RESPUESTA</option>
                                                <option value="SI">SI</option>
                                                <option value="NO">NO</option>
                                            </select>
                                        </div>
                                        <div>
                                            <span style={{ ...labelStyle, color: '#818cf8', opacity: 1 }}>ESTADO DE LA GESTIÓN</span>
                                            <select
                                                className="custom-select-premium"
                                                style={{ width: '100%' }}
                                                value={formState.estado.startsWith('NO INTERESADO') ? 'NO INTERESADO' : formState.estado}
                                                onChange={(e) => setFormState({ ...formState, estado: e.target.value })}
                                            >
                                                <option value="">Seleccionar estado</option>
                                                <option value="INTERESADO" style={{ color: '#818cf8', fontWeight: 'bold' }}>🚀 INTERESADO (Subir al Pipeline)</option>
                                                <option value="VOLVER A LLAMAR" style={{ color: '#fbbf24', fontWeight: 'bold' }}>📅 VOLVER A LLAMAR (Agendar)</option>
                                                <option value="NO INTERESADO">NO INTERESADO</option>
                                                <option value="TELEFONO EQUIVOCADO">TELEFONO EQUIVOCADO</option>
                                                <option value="NO CONTESTA">NO CONTESTA</option>
                                                <option value="RUC DADO DE BAJA">RUC DADO DE BAJA</option>
                                                <option value="NO CALIFICA">NO CALIFICA</option>
                                                <option value="POSIBLE FRAUDE">POSIBLE FRAUDE</option>
                                            </select>

                                            {/* Sub-dropdown for NO INTERESADO */}
                                            {formState.estado.startsWith('NO INTERESADO') && (
                                                <div style={{ marginTop: '10px' }}>
                                                    <span style={{ ...labelStyle, color: '#ef4444', opacity: 1 }}>MOTIVO DE RECHAZO</span>
                                                    <select
                                                        className="custom-select-premium"
                                                        style={{ width: '100%', borderColor: '#ef4444' }}
                                                        value={formState.estado.includes(' - ') ? formState.estado.split(' - ')[1] : ''}
                                                        onChange={(e) => {
                                                            const reason = e.target.value;
                                                            setFormState({ ...formState, estado: reason ? `NO INTERESADO - ${reason}` : 'NO INTERESADO' });
                                                        }}
                                                    >
                                                        <option value="">SELECCIONE MOTIVO...</option>
                                                        <option value="COBERTURA">COBERTURA</option>
                                                        <option value="PENALIDAD O EQUIPOS">PENALIDAD O EQUIPOS</option>
                                                        <option value="CONTRATO VIGENTE">CONTRATO VIGENTE</option>
                                                        <option value="CLIENTE ENTEL">CLIENTE ENTEL</option>
                                                        <option value="NO QUIERE SABER NADA DE ENTEL">NO QUIERE SABER NADA DE ENTEL</option>
                                                        <option value="SIN LLEGADA AL DECISOR">SIN LLEGADA AL DECISOR</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <span style={{ ...labelStyle, opacity: 1 }}>DIARIO DE OBSERVACIONES</span>
                                            <textarea className="custom-input-premium" style={{ width: '100%', height: '80px', resize: 'none', paddingTop: '12px', lineHeight: '1.5' }} value={formState.observacion} onChange={(e) => setFormState({ ...formState, observacion: e.target.value })} placeholder="Ingresa los comentarios de la gestión..." />
                                        </div>
                                    </div>
                                </div>

                                {message && (
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1rem',
                                        borderRadius: '1rem',
                                        backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        border: `1px solid ${message.type === 'error' ? '#ef4444' : '#10b981'}`,
                                        color: message.type === 'error' ? '#f87171' : '#34d399',
                                        textAlign: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        {message.text}
                                    </div>
                                )}

                                {/* Botón Guardar en el centro del panel */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                                    <button
                                        onClick={handleSaveAndNext}
                                        disabled={saving}
                                        className="action-btn-premium"
                                        style={{
                                            width: '100%',
                                            maxWidth: '380px',
                                            height: '4rem',
                                            fontSize: '16px',
                                            fontWeight: '900',
                                            letterSpacing: '0.2em',
                                            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
                                            borderRadius: '1.2rem',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            border: 'none'
                                        }}
                                    >
                                        {saving
                                            ? 'PROCESANDO...'
                                            : formState.estado === 'INTERESADO'
                                                ? '🚀 SUBIR DEAL'
                                                : formState.estado === 'VOLVER A LLAMAR'
                                                    ? '📅 AGENDAR Y SIGUIENTE'
                                                    : 'GUARDAR Y SIGUIENTE ➜'}
                                    </button>
                                </div>
                            </>
                        )}

                    </div>

                    {/* DERECHA: AGENDAMIENTO */}
                    <div className="form-panel-premium" style={{
                        flex: '0 0 310px', // Reducido a 310px
                        padding: 0,
                        overflow: 'hidden',
                        border: '1px solid rgba(21, 128, 61, 0.2)'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #15803d 0%, #064e3b 100%)',
                            padding: '16px',
                            textAlign: 'center',
                            fontWeight: '900',
                            fontSize: '11px',
                            letterSpacing: '0.2em',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>AGENDAMIENTO PRÓXIMO</div>
                        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px', flex: 1 }}>
                            <div>
                                <span style={{ ...labelStyle, textAlign: 'center', marginBottom: '16px', opacity: 1 }}>PROGRAMAR CITA</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                                    {[
                                        { label: '+30m', gap: 30 },
                                        { label: '+1h', gap: 60 },
                                        { label: 'Mañana 9am', custom: '9' },
                                        { label: 'Mañana 3pm', custom: '15' }
                                    ].map((btn, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                const d = new Date();
                                                if (btn.gap) d.setMinutes(d.getMinutes() + btn.gap);
                                                else {
                                                    d.setDate(d.getDate() + 1);
                                                    d.setHours(Number(btn.custom), 0, 0, 0);
                                                }
                                                const offset = d.getTimezoneOffset() * 60000;
                                                const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
                                                setFormState({ ...formState, agendamiento: localISOTime });
                                            }}
                                            style={{
                                                fontSize: '11px',
                                                padding: '8px 12px',
                                                backgroundColor: 'rgba(255,255,255,0.08)',
                                                color: '#fff',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '800',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                                        >{btn.label}</button>
                                    ))}
                                </div>

                                <input
                                    type="datetime-local"
                                    className="custom-input-premium"
                                    style={{ width: '100%', textAlign: 'center', fontSize: '15px', colorScheme: 'dark', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '1rem' }}
                                    value={formState.agendamiento}
                                    onChange={(e) => setFormState({ ...formState, agendamiento: e.target.value })}
                                />
                            </div>

                            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '30px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <span style={{ ...labelStyle, textAlign: 'center', color: '#10b981', marginBottom: '20px', opacity: 1 }}>MIS PENDIENTES</span>

                                <div style={{ padding: '0 10px 15px 10px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar RUC, Razón o Tel..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '11px',
                                            color: '#fff',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                                    {(() => {
                                        const now = new Date();

                                        const filtered = agendamientos.filter(ag => {
                                            if (!searchTerm) return true;
                                            const term = searchTerm.toLowerCase();
                                            return (
                                                (ag.ruc && ag.ruc.toLowerCase().includes(term)) ||
                                                (ag.razonSocial && ag.razonSocial.toLowerCase().includes(term)) ||
                                                (ag.telefono && String(ag.telefono).toLowerCase().includes(term))
                                            );
                                        });

                                        const vencidos = filtered.filter(ag => ag.fecha && new Date(ag.fecha) < now);
                                        const noVencidos = filtered.filter(ag => !ag.fecha || new Date(ag.fecha) >= now);

                                        const renderList = (list: any[], title: string, color: string) => (
                                            <>
                                                {list.length > 0 && (
                                                    <div style={{
                                                        fontSize: '10px',
                                                        fontWeight: '900',
                                                        color: color,
                                                        marginBottom: '10px',
                                                        marginTop: '10px',
                                                        letterSpacing: '0.1em',
                                                        borderBottom: `1px solid ${color}33`,
                                                        paddingBottom: '4px'
                                                    }}>
                                                        {title} ({list.length})
                                                    </div>
                                                )}
                                                {list.map((ag: any, i: number) => {
                                                    const isExpired = ag.fecha && new Date(ag.fecha) < now;
                                                    return (
                                                        <div
                                                            key={`${title}-${i}`}
                                                            onClick={() => handleLoadScheduled(ag.ruc)}
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)',
                                                                borderLeft: isExpired ? '4px solid #ef4444' : '4px solid #10b981',
                                                                marginBottom: '8px',
                                                                borderRadius: '0.8rem'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = isExpired ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)';
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: '800', color: '#fff', fontSize: '13px', marginBottom: '4px' }}>
                                                                {ag.razonSocial || ag.ruc || <span style={{ opacity: 0.5 }}>SIN NOMBRE ({ag.telefono})</span>}
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ color: isExpired ? '#f87171' : '#a1a1aa', fontSize: '11px', fontWeight: 'bold' }}>
                                                                    {formatAgendamientoDate(ag.fecha)}
                                                                </span>
                                                                {isExpired && (
                                                                    <span style={{
                                                                        fontSize: '8px',
                                                                        backgroundColor: '#991b1b',
                                                                        color: '#fff',
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px',
                                                                        fontWeight: '900'
                                                                    }}>VENCIDO</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        );

                                        if (filtered.length === 0) {
                                            return <div style={{ textAlign: 'center', fontSize: '13px', opacity: 0.2, marginTop: '50px', fontStyle: 'italic' }}>{searchTerm ? 'No se encontraron coincidencias' : 'Sin agendamientos pendientes'}</div>;
                                        }

                                        return (
                                            <>
                                                {renderList(noVencidos, 'PENDIENTES', '#10b981')}
                                                {renderList(vencidos, 'VENCIDOS', '#ef4444')}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
