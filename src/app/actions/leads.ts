'use server';

import { doc, loadDoc } from '@/lib/google-sheets';
import { LeadCache } from '@/lib/lead-cache';
import { UserCache } from '@/lib/user-cache';

export async function getNextLead(userEmail: string, userName: string) {
    try {
        const cache = LeadCache.getInstance();
        await cache.ensureInitialized();

        console.log(`Checking rows for user ${userName}`);

        // CHANGE: Disable auto-allocation. Users only see what is assigned to them.
        let result = await cache.allocateNextLead(userName, false);

        // If no lead found, try refreshing the cache once to see if new data was assigned
        if (result.type === 'none') {
            await cache.refresh();
            result = await cache.allocateNextLead(userName, false);
        }

        const nextRow = result.row;

        if (result.type === 'allocate' && nextRow) {
            console.log(`Allocated new row ${(nextRow as any).rowIndex} to ${userName}`);
            // Note: Save is already handled inside allocateNextLead
        }

        if (!nextRow) {
            return { message: 'No hay más registros disponibles.' };
        }

        return {
            success: true,
            data: {
                id: (nextRow as any).rowIndex,
                ruc: nextRow.get('RUC'),
                razonSocial: nextRow.get('Razón Social'),
                contacto: nextRow.get('Representante Legal'),
                telefono: nextRow.get('Teléfonos'),
                dni: nextRow.get('Documento Identidad'),
                segmento: nextRow.get('SEGMENTO'),
                consultor: nextRow.get('CONSULTOR PRINCIPAL'),
                departamento: nextRow.get('DEPARTAMENTO'),
                provincia: nextRow.get('PROVINCIA'),
                distrito: nextRow.get('DISTRITO'),
                direccion: nextRow.get('DIRECCION'),
                correo: nextRow.get('CORREO'),
                lineas: nextRow.get('CANTIDAD LINEAS'),
                cargoFijo: nextRow.get('CARGO FIJO'),
                observacion: nextRow.get('OBSERVACIONES'),
                estado: nextRow.get('ESTADO'),
                deseaInfo: nextRow.get('DESEA INFORMACION'),
                otrosContactos: nextRow.get('OTROS REPRESENTANTES LEGALES'),
                agendamiento: nextRow.get('FECHA AGENDAMIENTO'),
                fechaInicio: nextRow.get('FECHA INICIO'),
                operadorActual: nextRow.get('OPERADOR'),
            }
        };
    } catch (error) {
        console.error('Error en getNextLead:', error);
        return { error: 'Error interno al procesar leads.' };
    }
}

export async function saveLead(rowIndex: number, data: any) {
    try {
        console.log(`Saving lead ${rowIndex} (RUC: ${data.ruc}) with state: ${data.estado}`);
        const cache = LeadCache.getInstance();
        await cache.ensureInitialized();

        // Use cache to validate ownership first (fast check)
        // Then update which triggers the slow save in background (or awaited)

        const row = cache.getByRuc(data.ruc);
        if (!row) {
            console.error(`Row with RUC ${data.ruc} not found in cache.`);
            // Fallback to load from sheet directly? No, cache should be truth.
            return { success: false, error: 'Registro no encontrado (RUC mismatch).' };
        }

        const currentExec = row.get('EJECUTIVO');
        // Normalize for comparison
        const normCurrent = currentExec ? currentExec.trim().toLowerCase() : '';
        const normAssigned = data.assignedUser ? data.assignedUser.trim().toLowerCase() : '';

        if (normCurrent && normCurrent !== normAssigned) {
            // Allow ADMIN to override (assuming role is passed in data)
            if (data.userRole === 'ADMIN') {
                console.log(`ADMIN OVERRIDE: ${data.assignedUser} overwriting lead of ${currentExec}`);
            } else {
                console.error(`OWNERSHIP ERROR: Workbook says '${currentExec}' vs Request '${data.assignedUser}'`);
                // Check for "soft match" (e.g. if one contains the other) to be friendlier?
                // For now, strict block unless admin.
                return { success: false, error: `Este registro pertenece a ${currentExec}. Tu usuario es ${data.assignedUser}.` };
            }
        }

        const updates: any = {
            'ESTADO': data.estado,
            'DESEA INFORMACION': data.deseaInfo,
            'OBSERVACIONES': data.observacion
        };

        if (data.correo) updates['CORREO'] = data.correo;
        if (data.lineas) updates['CANTIDAD LINEAS'] = data.lineas;
        if (data.cargoFijo) updates['CARGO FIJO'] = data.cargoFijo;
        if (data.segmento) updates['SEGMENTO'] = data.segmento;
        if (data.consultor) updates['CONSULTOR PRINCIPAL'] = data.consultor;

        // New editable fields from Bascontrol
        if (data.contacto) updates['Representante Legal'] = data.contacto;
        if (data.dni) updates['Documento Identidad'] = data.dni;
        if (data.telefono) updates['Teléfonos'] = data.telefono;
        if (data.departamento) updates['DEPARTAMENTO'] = data.departamento;
        if (data.provincia) updates['PROVINCIA'] = data.provincia;
        if (data.distrito) updates['DISTRITO'] = data.distrito;
        if (data.direccion) updates['DIRECCION'] = data.direccion;
        if (data.razonSocial) updates['Razón Social'] = data.razonSocial;

        // Explicitly handle agendamiento: clear it if empty/null provided
        if (data.hasOwnProperty('agendamiento')) { // Check if field was sent
            updates['FECHA AGENDAMIENTO'] = data.agendamiento || '';
        }

        // TERMINAL STATE LOGIC
        const TERMINAL_STATES = [
            'NO INTERESADO',
            'TELEFONO EQUIVOCADO',
            'NO CONTESTA',
            'RUC DADO DE BAJA',
            'NO CALIFICA',
            'POSIBLE FRAUDE'
        ];

        // UPDATE TRACKING DATE: Set FECHA FIN (Peru Time) on every touch
        const now = new Date();
        const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));

        const day = String(peruTime.getDate()).padStart(2, '0');
        const month = String(peruTime.getMonth() + 1).padStart(2, '0');
        const year = peruTime.getFullYear();
        const hours = String(peruTime.getHours()).padStart(2, '0');
        const minutes = String(peruTime.getMinutes()).padStart(2, '0');
        const seconds = String(peruTime.getSeconds()).padStart(2, '0');

        const fechaFin = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
        updates['FECHA FIN'] = fechaFin;

        if (TERMINAL_STATES.includes(data.estado)) {
            // 1. Remove from Agendados
            updates['FECHA AGENDAMIENTO'] = '';
        }

        // Optimistic update ok? We await it for now.
        const success = await cache.updateRow(data.ruc, updates);

        if (success) {
            console.log(`Lead ${data.ruc} saved successfully. Syncing to PROSPECCION...`);

            // SYNC TO PROSPECCION
            try {
                const prospeccionSheet = doc.sheetsByTitle['PROSPECCION'];
                if (prospeccionSheet) {
                    const pRows = await prospeccionSheet.getRows();
                    const relatedDeals = pRows.filter(r => String(r.get('RUC')) === String(data.ruc));

                    for (const deal of relatedDeals) {
                        if (data.razonSocial) deal.set('RAZON SOCIAL', data.razonSocial);
                        if (data.contacto) deal.set('CONTACTO', data.contacto);
                        if (data.telefono) deal.set('TELEFONO', data.telefono);
                        if (data.lineas) deal.set('CANTIDAD LINEAS', data.lineas);
                        if (data.cargoFijo) deal.set('CARGO FIJO', data.cargoFijo);
                        if (data.observacion) deal.set('OBSERVACIONES', data.observacion);
                        await deal.save();
                    }
                    console.log(`Synced ${relatedDeals.length} deals in PROSPECCION.`);
                }
            } catch (syncErr) {
                console.error('Error syncing to PROSPECCION:', syncErr);
                // Non-blocking for the main save
            }

            return { success: true };
        } else {
            return { success: false, error: 'Error interno al escribir en Google Sheets.' };
        }

    } catch (error) {
        console.error('Error saving lead:', error);
        return { success: false, error: 'Error al guardar.' };
    }
}

export async function getAgendamientos(userName: string, userRole: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['BASE CLARO'];
        if (!sheet) return { error: 'Hoja no encontrada' };

        const rows = await sheet.getRows();

        // Filtrar registros que:
        // 1. Tengan una fecha de agendamiento
        // 2. Sean del usuario (a menos que sea ADMIN)
        const scheduledRows = rows.filter(row => {
            const hasAgendamiento = row.get('FECHA AGENDAMIENTO') && row.get('FECHA AGENDAMIENTO').trim() !== '';
            if (!hasAgendamiento) return false;

            if (userRole === 'ADMIN') return true;
            return row.get('EJECUTIVO') === userName;
        });

        // Mapear a formato simple y ordenar por fecha (ascendente: los más antiguos/vencidos primero)
        const agendamientos = scheduledRows.map(row => ({
            razonSocial: row.get('Razón Social'),
            ruc: row.get('RUC'),
            fecha: row.get('FECHA AGENDAMIENTO'),
            ejecutivo: row.get('EJECUTIVO'),
            telefono: row.get('Teléfonos')
        })).sort((a, b) => {
            if (!a.fecha) return 1;
            if (!b.fecha) return -1;
            // Sorting descending: newest first
            return b.fecha.localeCompare(a.fecha);
        });

        return { success: true, data: agendamientos };
    } catch (error) {
        console.error('Error in getAgendamientos:', error);
        return { error: 'Error al obtener agendamientos' };
    }
}

export async function getLeadByRuc(ruc: string) {
    try {
        const cache = LeadCache.getInstance();
        await cache.ensureInitialized();

        const row = cache.getByRuc(ruc);
        if (!row) {
            return { success: false, error: 'Lead no encontrado' };
        }

        return {
            success: true,
            data: {
                id: (row as any).rowIndex,
                ruc: row.get('RUC'),
                razonSocial: row.get('Razón Social'),
                contacto: row.get('Representante Legal'),
                telefono: row.get('Teléfonos'),
                dni: row.get('Documento Identidad'),
                segmento: row.get('SEGMENTO'),
                consultor: row.get('CONSULTOR PRINCIPAL'),
                departamento: row.get('DEPARTAMENTO'),
                provincia: row.get('PROVINCIA'),
                distrito: row.get('DISTRITO'),
                direccion: row.get('DIRECCION'),
                correo: row.get('CORREO'), // Changed from cargoFijo to correo
                lineas: row.get('CANTIDAD LINEAS'),
                cargoFijo: row.get('CARGO FIJO'),
                observacion: row.get('OBSERVACIONES'),
                estado: row.get('ESTADO'),
                deseaInfo: row.get('DESEA INFORMACION'),
                otrosContactos: row.get('OTROS REPRESENTANTES LEGALES'),
                agendamiento: row.get('FECHA AGENDAMIENTO'),
                fechaInicio: row.get('FECHA INICIO'),
                operadorActual: row.get('OPERADOR'),
            }
        };

    } catch (error) {
        console.error('Error in getLeadByRuc:', error);
        return { success: false, error: 'Error al cargar lead' };
    }
}

export async function getTouchedLeads() {
    try {
        const cache = LeadCache.getInstance();
        await cache.ensureInitialized();

        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();

        const allRows = cache.getAll();

        const touched = allRows.filter(row => {
            const ejecutivo = row.get('EJECUTIVO');
            if (!ejecutivo || ejecutivo.trim().length === 0) return false;

            const estado = (row.get('ESTADO') || '').trim().toUpperCase();
            const observacion = (row.get('OBSERVACIONES') || '').trim();
            const hasAgendamiento = (row.get('FECHA AGENDAMIENTO') || '').trim() !== '';

            // NEW RULE: Include any record where status is NOT PENDING and NOT EMPTY
            if (estado !== 'PENDIENTE' && estado !== '') {
                return true;
            }

            // Fallback for PENDING but with activity
            if ((estado === 'PENDIENTE' || estado === '') && (observacion !== '' || hasAgendamiento)) {
                return true;
            }

            return false;
        });

        // Map to full objects for detailed view
        const data = touched.map(row => {
            const execName = row.get('EJECUTIVO');
            const userRow = userCache.findUser(execName);

            return {
                rowIndex: (row as any).rowIndex,
                ruc: row.get('RUC'),
                razonSocial: row.get('Razón Social'),
                contacto: row.get('Representante Legal'),
                telefono: row.get('Teléfonos'),
                dni: row.get('Documento Identidad'),
                segmento: row.get('SEGMENTO'),
                consultor: row.get('CONSULTOR PRINCIPAL'),
                departamento: row.get('DEPARTAMENTO'),
                provincia: row.get('PROVINCIA'),
                distrito: row.get('DISTRITO'),
                direccion: row.get('DIRECCION'),
                correo: row.get('CORREO'),
                lineas: row.get('CANTIDAD LINEAS'),
                observacion: row.get('OBSERVACIONES'),
                estado: row.get('ESTADO'),
                deseaInfo: row.get('DESEA INFORMACION'),
                otrosContactos: row.get('OTROS REPRESENTANTES LEGALES'),
                agendamiento: row.get('FECHA AGENDAMIENTO'),
                fechaInicio: row.get('FECHA INICIO'),
                fechaFin: row.get('FECHA FIN'),
                operadorActual: row.get('OPERADOR'),
                ejecutivo: execName,
                ejecutivoCargo: userRow?.get('CARGO') || 'EJECUTIVO DE VENTAS',
                ejecutivoSupervisor: userRow?.get('SUPERVISOR') || 'N/A'
            };
        });

        return { success: true, data };

    } catch (error) {
        console.error('Error in getTouchedLeads', error);
        return { success: false, error: 'Error al cargar reporte' };
    }
}

// ACTION: Check if a lead exists and its status
export async function checkLeadAvailability(ruc: string) {
    try {
        const cache = LeadCache.getInstance();
        await cache.ensureInitialized();

        // Find row by RUC
        // Find row by RUC - Normalize to avoid whitespace issues
        const rows = cache.getAll();
        const normalizedInput = String(ruc).trim();
        const existingRow = rows.find(r => {
            const rowRuc = String(r.get('RUC') || '').trim();
            return rowRuc === normalizedInput;
        });

        if (!existingRow) {
            return { status: 'NOT_FOUND' };
        }

        const estado = existingRow.get('ESTADO');
        const ejecutivo = existingRow.get('EJECUTIVO');

        const protectedStates = ['INTERESADO', 'VOLVER A LLAMAR', 'PROPUESTA ENVIADA', 'ENVIADO A PROSPECTOS'];

        const hasOwner = ejecutivo && ejecutivo.trim() !== '';
        const isFreshlyAssigned = hasOwner && (!estado || estado.trim() === '' || estado === 'PENDIENTE');

        const isProtected = (protectedStates.includes(estado) || isFreshlyAssigned) && hasOwner;

        return {
            status: isProtected ? 'PROTECTED' : 'AVAILABLE_FOR_REASSIGNMENT',
            message: isProtected ? 'No se puede asignar porque el registro lo esta trabajando otro asesor' : undefined,
            owner: ejecutivo,
            estado: estado
        };

    } catch (error) {
        console.error('Error checking lead availability:', error);
        return { status: 'ERROR', error: 'Error checking availability' };
    }
}

// ACTION: Reassign existing lead
export async function reassignLead(ruc: string, newUser: string) {
    try {
        await loadDoc(); // Load fresh doc
        const sheet = doc.sheetsByTitle['BASE CLARO'];
        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('RUC') == ruc);

        if (!row) return { success: false, error: 'Lead not found for reassignment' };

        // Clear previous user data and assign new
        row.set('EJECUTIVO', newUser);
        row.set('ESTADO', ''); // Reset status to empty for new user
        row.set('FECHA INICIO', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })); // Set new start date
        row.set('FECHA FIN', '');
        row.set('FECHA AGENDAMIENTO', '');
        row.set('OBSERVACIONES', '');
        row.set('DESEA INFORMACION', '');

        await row.save();

        // Refresh cache
        const cache = LeadCache.getInstance();
        await cache.refresh();

        return { success: true };
    } catch (error) {
        console.error('Error reassigning lead:', error);
        return { success: false, error: 'Failed to reassign lead' };
    }
}

export async function resetLeadForNewProposal(ruc: string) {
    try {
        await loadDoc();

        // 1. Reset BASE CLARO Status
        const baseSheet = doc.sheetsByTitle['BASE CLARO'];
        const baseRows = await baseSheet.getRows();
        const baseRow = baseRows.find(r => r.get('RUC') == ruc);

        if (baseRow) {
            baseRow.set('ESTADO', '');
            // We keep the owner and other data
            await baseRow.save();
        }

        // We NO LONGER delete from PROSPECCION because we want to allow multiple entries

        // Refresh cache
        const cache = LeadCache.getInstance();
        await cache.refresh();

        return { success: true };
    } catch (error) {
        console.error('Error in resetLeadForNewProposal:', error);
        return { success: false, error: 'Error al preparar nueva propuesta' };
    }
}

// ACTION: Create new Manual Lead
export async function createManualLead(data: any, user: string) {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            console.log(`[createManualLead] Attempt ${attempt + 1} for RUC ${data.ruc}`);
            await loadDoc();
            const sheet = doc.sheetsByTitle['BASE CLARO'];
            if (!sheet) throw new Error('Hoja BASE CLARO no encontrada en el documento.');

            // Fetch rows once for both ID calculation and verification
            const rows = await sheet.getRows();

            // Determine next ID column
            let headerIndex = sheet.headerValues.findIndex(h => h.trim().toUpperCase() === 'ID REGISTRO');
            if (headerIndex === -1) {
                headerIndex = sheet.headerValues.findIndex(h => h.trim().toUpperCase() === 'ID');
            }
            const idColumnName = headerIndex >= 0 ? sheet.headerValues[headerIndex] : 'ID REGISTRO';

            // Calculate next sequential ID
            let nextId = '';
            try {
                const ids = rows.map(r => parseInt(r.get(idColumnName))).filter(n => !isNaN(n));
                const maxId = ids.length > 0 ? Math.max(...ids) : 0;
                nextId = (maxId + 1).toString();
            } catch (idErr) {
                console.warn('[createManualLead] Error calculating sequential ID, using timestamp fallback:', idErr);
                nextId = Date.now().toString().slice(-8);
            }

            // Safety Check: Verify if RUC already exists in the local rows snapshot
            const normalizedRuc = String(data.ruc).trim();
            const existing = rows.find(r => String(r.get('RUC') || '').trim() === normalizedRuc);

            if (existing) {
                const currentExec = (existing.get('EJECUTIVO') || '').trim().toUpperCase();
                const normalizedUser = user.trim().toUpperCase();

                if (currentExec !== '' && currentExec !== normalizedUser) {
                    return { success: false, error: `Este registro ya pertenece a ${existing.get('EJECUTIVO')}` };
                }

                // If same owner or unassigned, update fields
                console.log(`[createManualLead] Updating existing record for RUC ${data.ruc}`);
                existing.set('Razón Social', data.razonSocial);
                existing.set('Representante Legal', data.contacto);
                existing.set('Teléfonos', data.telefono);
                existing.set('Documento Identidad', data.dni);
                existing.set('SEGMENTO', data.segmento);
                existing.set('CONSULTOR PRINCIPAL', data.consultor);
                existing.set('DEPARTAMENTO', data.departamento);
                existing.set('PROVINCIA', data.provincia);
                existing.set('DISTRITO', data.distrito || '');
                existing.set('DIRECCION', data.direccion || '');
                existing.set('CORREO', data.correo || '');
                existing.set('CANTIDAD LINEAS', data.lineas || '');
                existing.set('CARGO FIJO', data.cargoFijo || '');
                existing.set('ESTADO', '');
                if (currentExec === '') {
                    existing.set('EJECUTIVO', user);

                    const now = new Date();
                    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
                    const day = String(peruTime.getDate()).padStart(2, '0');
                    const month = String(peruTime.getMonth() + 1).padStart(2, '0');
                    const year = peruTime.getFullYear();
                    const hours = String(peruTime.getHours()).padStart(2, '0');
                    const minutes = String(peruTime.getMinutes()).padStart(2, '0');
                    const seconds = String(peruTime.getSeconds()).padStart(2, '0');
                    const fechaInicio = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;

                    existing.set('FECHA INICIO', fechaInicio);
                }

                await existing.save();
            } else {
                // Create new record
                console.log(`[createManualLead] Creating new record for RUC ${data.ruc} with ID ${nextId}`);
                const newRow: any = {
                    'RUC': data.ruc,
                    'Razón Social': data.razonSocial,
                    'Representante Legal': data.contacto,
                    'Teléfonos': data.telefono,
                    'Documento Identidad': data.dni,
                    'SEGMENTO': data.segmento,
                    'CONSULTOR PRINCIPAL': data.consultor,
                    'DEPARTAMENTO': data.departamento,
                    'PROVINCIA': data.provincia,
                    'DISTRITO': data.distrito || '',
                    'DIRECCION': data.direccion || '',
                    'CORREO': data.correo || '',
                    'CANTIDAD LINEAS': data.lineas || '',
                    'CARGO FIJO': data.cargoFijo || '',
                    'EJECUTIVO': user,
                    'FECHA INICIO': (() => {
                        const now = new Date();
                        const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
                        const day = String(peruTime.getDate()).padStart(2, '0');
                        const month = String(peruTime.getMonth() + 1).padStart(2, '0');
                        const year = peruTime.getFullYear();
                        const hours = String(peruTime.getHours()).padStart(2, '0');
                        const minutes = String(peruTime.getMinutes()).padStart(2, '0');
                        const seconds = String(peruTime.getSeconds()).padStart(2, '0');
                        return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
                    })(),
                    'ESTADO': '',
                };

                newRow[idColumnName] = nextId;

                await sheet.addRow(newRow);
            }

            // Successfully finished
            const cache = LeadCache.getInstance();
            await cache.refresh();

            return { success: true };

        } catch (error: any) {
            attempt++;
            console.error(`[createManualLead] Error on attempt ${attempt}:`, error);

            if (attempt < MAX_RETRIES) {
                // Wait before retrying (exponential backoff)
                const delay = 1000 * attempt + Math.floor(Math.random() * 500);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // All attempts failed
                const specificError = error.message || 'Error de conexión con Google Sheets';
                return {
                    success: false,
                    error: `No se pudo crear el lead después de ${MAX_RETRIES} intentos. Detalle: ${specificError}`
                };
            }
        }
    }
    return { success: false, error: 'Error desconocido en el proceso de creación.' };
}

// ACTION: Fetch RUC Data from external API
export async function fetchRucData(ruc: string) {
    try {
        const response = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${ruc}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.warn(`External API Error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        return {
            razonSocial: data.nombre || '',
            direccion: data.direccion || '',
            departamento: data.departamento || '',
            provincia: data.provincia || '',
            distrito: data.distrito || '',
            condicion: data.condicion || '',
            estado: data.estado || ''
        };


    } catch (error) {
        console.error('Error fetching external RUC data:', error);
        return null;
    }
}

// PIPELINE ACTIONS

export async function promoteToPipeline(lead: any, user: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['PROSPECCION'];
        if (!sheet) return { success: false, error: 'Hoja PROSPECCION no encontrada' };

        const rows = await sheet.getRows();
        // No duplicate RUC check to allow multiple proposals

        // Sequential ID Logic for PROSPECCION
        let nextId = 1;
        const ids = rows.map(r => parseInt(r.get('ID'))).filter(n => !isNaN(n));
        if (ids.length > 0) {
            nextId = Math.max(...ids) + 1;
        }

        const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

        const newRow: any = {
            'ID': nextId.toString(),
            'RUC': String(lead.ruc),
            'RAZON SOCIAL': lead.razonSocial || lead['Razón Social'] || '',
            'CONTACTO': lead.contacto || lead['Representante Legal'] || '',
            'TELEFONO': lead.telefono || lead['Teléfonos'] || '',
            'CANTIDAD LINEAS': lead.lineas || lead['CANTIDAD LINEAS'] || '',
            'CARGO FIJO': lead.cargoFijo || '',
            'EJECUTIVO': user,
            'ESTADO': 'INTERESADO',
            'FECHA INGRESO': now,
            'FECHA PROPUESTA': '',
            'FECHA INTERESADO': now,
            'FECHA NEGOCIACION': '',
            'FECHA SI VERBAL': '',
            'FECHA CIERRE': '',
            'OBSERVACIONES': lead.observacion || '',
            'SEGMENTO': lead.segmento || ''
        };

        await sheet.addRow(newRow);

        // SYNC BACK TO BASE CLARO: Update status and clear agendamiento
        const baseSheet = doc.sheetsByTitle['BASE CLARO'];
        if (baseSheet) {
            const baseRows = await baseSheet.getRows();
            const baseRow = baseRows.find(r => r.get('RUC') == lead.ruc);
            if (baseRow) {
                baseRow.set('ESTADO', 'ENVIADO A PROSPECTOS');
                baseRow.set('FECHA AGENDAMIENTO', '');
                await baseRow.save();
            }
        }

        // Refresh cache so LeadManager sees the new state
        const cache = LeadCache.getInstance();
        await cache.refresh();

        return { success: true };
    } catch (error) {
        console.error('Error in promoteToPipeline:', error);
        return { success: false, error: 'Error al subir deal' };
    }
}

export async function getPipelineData(userName: string, options: {
    role: string,
    filterUser?: string,
    startDate?: string,
    endDate?: string,
    search?: string
}) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['PROSPECCION'];
        if (!sheet) return [];

        let rows = await sheet.getRows();
        const { role, filterUser, startDate, endDate, search } = options;

        // 1. Role-based Level 1 Filter (Who can see what)
        if (role === 'SPECIAL') {
            const userCache = UserCache.getInstance();
            await userCache.ensureInitialized();
            const team = userCache.getTeamForSupervisor(userName);

            // Collect all possible identifiers for team members (names and codes)
            const teamIdentities = new Set<string>();
            team.forEach(u => {
                const code = u.get('USER')?.toLowerCase().trim();
                const name = u.get('NOMBRES COMPLETOS')?.toLowerCase().trim();
                if (code) teamIdentities.add(code);
                if (name) teamIdentities.add(name);
            });
            teamIdentities.add(userName.toLowerCase().trim()); // Self

            rows = rows.filter(r => {
                const exec = r.get('EJECUTIVO')?.toLowerCase().trim();
                return exec && teamIdentities.has(exec);
            });
        } else if (role !== 'ADMIN') {
            // STANDARD - Match name or code
            const normUser = userName.toLowerCase().trim();
            const userCache = UserCache.getInstance();
            await userCache.ensureInitialized();
            const self = userCache.findUser(userName);
            const selfCode = self?.get('USER')?.toLowerCase().trim();

            rows = rows.filter(r => {
                const exec = r.get('EJECUTIVO')?.toLowerCase().trim();
                return exec === normUser || (selfCode && exec === selfCode);
            });
        }
        // ADMIN sees all, no filter needed here

        // 2. Executive filter (If SPECIAL/ADMIN selected a specific person)
        if (filterUser && filterUser !== 'ALL') {
            const userCache = UserCache.getInstance();
            await userCache.ensureInitialized();
            const target = userCache.findUser(filterUser);

            const possibleIdentities = new Set<string>();
            possibleIdentities.add(filterUser.toLowerCase().trim());
            if (target) {
                const code = target.get('USER')?.toLowerCase().trim();
                const name = target.get('NOMBRES COMPLETOS')?.toLowerCase().trim();
                if (code) possibleIdentities.add(code);
                if (name) possibleIdentities.add(name);
            }

            rows = rows.filter(r => {
                const exec = r.get('EJECUTIVO')?.toLowerCase().trim();
                return exec && possibleIdentities.has(exec);
            });
        }

        // 3. Search Filter (RUC or Razon Social)
        if (search) {
            const s = search.toLowerCase().trim();
            rows = rows.filter(r => {
                const ruc = r.get('RUC')?.toLowerCase() || '';
                const rs = r.get('RAZON SOCIAL')?.toLowerCase() || '';
                return ruc.includes(s) || rs.includes(s);
            });
        }

        // 4. Date Filter (Check if row date falls in range)
        if (startDate || endDate) {
            rows = rows.filter(r => {
                const dateStr = r.get('FECHA INGRESO');
                if (!dateStr) return false;

                // Expecting DD/MM/YYYY
                const [d, m, y] = dateStr.split(',')[0].split('/').map(Number);
                const rowDate = new Date(y, m - 1, d);

                if (startDate) {
                    const [sy, sm, sd] = startDate.split('-').map(Number); // HTML date is YYYY-MM-DD
                    const start = new Date(sy, sm - 1, sd);
                    if (rowDate < start) return false;
                }
                if (endDate) {
                    const [ey, em, ed] = endDate.split('-').map(Number); // HTML date is YYYY-MM-DD
                    const end = new Date(ey, em - 1, ed);
                    if (rowDate > end) return false;
                }
                return true;
            });
        }

        // Initialize UserCache for supervisor enrichment
        const userCache = UserCache.getInstance();
        await userCache.refresh(); // Ensure fresh data for exports

        // Map sheet data to expected component interface
        const data = rows.map(row => {
            const execName = row.get('EJECUTIVO');
            const supervisor = userCache.getSupervisorForUser(execName);

            return {
                id: row.get('ID') || String((row as any).rowIndex),
                RUC: row.get('RUC'),
                'Razón Social': row.get('RAZON SOCIAL'),
                'Representante Legal': row.get('CONTACTO'),
                'Teléfonos': row.get('TELEFONO'),
                'CANTIDAD LINEAS': row.get('CANTIDAD LINEAS'),
                'CARGO FIJO': row.get('CARGO FIJO'),
                'ESTADO': row.get('ESTADO'),
                'FECHA INICIO': row.get('FECHA INGRESO'),
                'FECHA PROPUESTA': row.get('FECHA PROPUESTA'),
                'FECHA INTERESADO': row.get('FECHA INTERESADO'),
                'FECHA NEGOCIACION': row.get('FECHA NEGOCIACION'),
                'FECHA SI VERBAL': row.get('FECHA SI VERBAL'),
                'FECHA CIERRE': row.get('FECHA CIERRE'),
                'OBSERVACIONES': row.get('OBSERVACIONES'),
                'EJECUTIVO': execName,
                'SUPERVISOR': supervisor,
                'SEGMENTO': row.get('SEGMENTO')
            };
        });

        // Sort descending by ID (newest first)
        return data.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    } catch (error) {
        console.error('Error getting pipeline data:', error);
        return [];
    }
}

export async function updatePipelineLead(id: string, data: { lineas?: string, cargoFijo?: string, observaciones?: string }) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['PROSPECCION'];
        const rows = await sheet.getRows();
        // SEARCH BY ID instead of RUC to allow multiple independent proposals
        const row = rows.find(r => r.get('ID') == id);

        if (!row) return { success: false, error: 'Deal no encontrado' };

        if (data.lineas !== undefined) row.set('CANTIDAD LINEAS', data.lineas);
        if (data.cargoFijo !== undefined) row.set('CARGO FIJO', data.cargoFijo);
        if (data.observaciones !== undefined) row.set('OBSERVACIONES', data.observaciones);

        await row.save();

        // SYNC BACK TO BASE CLARO
        try {
            const ruc = row.get('RUC');
            if (ruc) {
                const cache = LeadCache.getInstance();
                await cache.ensureInitialized();

                const leadUpdates: any = {};
                if (data.lineas !== undefined) leadUpdates['CANTIDAD LINEAS'] = data.lineas;
                if (data.cargoFijo !== undefined) leadUpdates['CARGO FIJO'] = data.cargoFijo;
                if (data.observaciones !== undefined) leadUpdates['OBSERVACIONES'] = data.observaciones;

                if (Object.keys(leadUpdates).length > 0) {
                    await cache.updateRow(String(ruc), leadUpdates);
                    console.log(`Synced pipeline update (ID: ${id}, RUC: ${ruc}) back to BASE CLARO.`);
                }
            }
        } catch (syncErr) {
            console.error('Error syncing back to BASE CLARO:', syncErr);
        }

        return { success: true };
    } catch (error) {
        console.error('Error in updatePipelineLead:', error);
        return { success: false, error: 'Error al actualizar deal' };
    }
}

export async function updatePipelineStatus(id: string, newStatus: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['PROSPECCION'];
        const rows = await sheet.getRows();
        // SEARCH BY ID instead of RUC
        const row = rows.find(r => r.get('ID') == id);

        if (!row) return { success: false, error: 'Deal no encontrado' };

        row.set('ESTADO', newStatus);

        let updatedField = '';
        const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

        // Update corresponding date column
        switch (newStatus) {
            case 'INTERESADO':
                updatedField = 'FECHA INTERESADO';
                if (!row.get(updatedField)) row.set(updatedField, now);
                break;
            case 'PROPUESTA ENVIADA':
                updatedField = 'FECHA PROPUESTA';
                if (!row.get(updatedField)) row.set(updatedField, now);
                break;
            case 'NEGOCIACION PARA CIERRE':
                updatedField = 'FECHA NEGOCIACION';
                if (!row.get(updatedField)) row.set(updatedField, now);
                break;
            case 'SI VERBAL':
                updatedField = 'FECHA SI VERBAL';
                if (!row.get(updatedField)) row.set(updatedField, now);
                break;
            case 'NUEVO INGRESO':
            case 'INGRESADO':
            case 'DESPACHO':
                updatedField = 'FECHA CIERRE';
                if (!row.get(updatedField)) row.set(updatedField, now);
                break;
        }

        await row.save();
        return {
            success: true,
            updatedField,
            updatedDate: row.get(updatedField) || now
        };
    } catch (error) {
        console.error('Error updating pipeline status:', error);
        return { success: false, error: 'Error al actualizar estado' };
    }
}
export async function saveVenta(data: any, pipelineId?: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['VENTAS'];
        if (!sheet) return { success: false, error: 'Hoja VENTAS no encontrada' };

        // 1. Calcular el siguiente ID
        const rows = await sheet.getRows();
        let nextId = 1;
        const ids = rows.map(r => parseInt(r.get('ID'))).filter(n => !isNaN(n));
        if (ids.length > 0) {
            nextId = Math.max(...ids) + 1;
        }

        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();
        const supervisor = userCache.getSupervisorForUser(data.ejecutivo);
        const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

        const newRow: any = {
            'ID': nextId.toString(),
            'EJECUTIVO': data.ejecutivo,
            'SUPERVISOR': supervisor,
            'APROBACION': 'PENDIENTE',
            'ESTADO': 'PENDIENTE APROBACION',
            'OBSERVACION': '',
            'MESA DE CONTROL ASIGNADO': '',
            'RUC': String(data.ruc),
            'RAZON SOCIAL': data.razonSocial,
            'DEPARTAMENTO': data.departamento,
            'PROVINCIA': data.provincia,
            'DISTRITO': data.distrito,
            'DIRECCION': data.direccion,
            'CORREO': data.correo,
            'SEGMENTO': data.segmento,
            'CANTIDAD LINEAS': data.lineas,
            'CF TOTAL': data.cargoFijo,
            'DESCUENTO': data.descuento || '0',
            'DOCUMENTO IDENTIDAD': data.dni,
            'REPRESENTANTE LEGAL': data.contacto,
            'TELEFONO': data.telefono,
            'PROCESO': data.proceso || 'REMOTO',
            'DETALLE': data.detalle || '',
            'OBSERVACION EJECUTIVO': data.observacionEjecutivo || '',
            'FECHA INICIO': now,
            'FECHA PERIODO': `${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`,
            'ID SUSTENTOS': data.idSustentos || ''
        };

        await sheet.addRow(newRow);

        // 2. Update status in PROSPECCION to mark it as processed
        // Use pipelineId if provided, otherwise fallback to RUC (legacy behavior)
        const prospeccionSheet = doc.sheetsByTitle['PROSPECCION'];
        if (prospeccionSheet) {
            const prospeccionRows = await prospeccionSheet.getRows();
            let prospeccionRow = null;

            if (pipelineId) {
                prospeccionRow = prospeccionRows.find(r => r.get('ID') == pipelineId);
            } else {
                // Legacy: search by RUC (might hit multiple if we don't have ID)
                prospeccionRow = prospeccionRows.find(r => r.get('RUC') == data.ruc);
            }

            if (prospeccionRow) {
                console.log(`Setting status to VENTA SUBIDA for Deal ${prospeccionRow.get('ID')} (RUC ${data.ruc})`);
                prospeccionRow.set('ESTADO', 'VENTA SUBIDA');
                await prospeccionRow.save();
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Error in saveVenta:', error);
        return { success: false, error: 'Error al guardar venta' };
    }
}

export async function saveDroppedProspect(data: any, user: string, pipelineId?: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['PROSPECTOS CAIDOS'];
        if (!sheet) return { success: false, error: 'Hoja PROSPECTOS CAIDOS no encontrada' };

        // Determine next ID for PROSPECTOS CAIDOS
        const rows = await sheet.getRows();
        let nextId = 1;
        const ids = rows.map(r => parseInt(r.get('ID'))).filter(n => !isNaN(n));
        if (ids.length > 0) {
            nextId = Math.max(...ids) + 1;
        }

        const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

        const newRow: any = {
            'ID': nextId.toString(),
            'RUC': String(data.ruc),
            'RAZON SOCIAL': data.razonSocial,
            'CONTACTO': data.contacto,
            'TELEFONO': data.telefono,
            'CANTIDAD LINEAS': data.lineas,
            'CARGO FIJO': data.cargoFijo,
            'EJECUTIVO': user,
            'MOTIVO': data.motivo,
            'ESTADO': data.estado,
            'FECHA CAIDA': now,
            'FECHA': now
        };

        await sheet.addRow(newRow);

        // Update status in PROSPECCION to VENTA CAIDA
        const prospeccionSheet = doc.sheetsByTitle['PROSPECCION'];
        if (prospeccionSheet) {
            const prospeccionRows = await prospeccionSheet.getRows();
            let prospeccionRow = null;

            if (pipelineId) {
                prospeccionRow = prospeccionRows.find(r => r.get('ID') == pipelineId);
            } else {
                prospeccionRow = prospeccionRows.find(r => r.get('RUC') == data.ruc);
            }

            if (prospeccionRow) {
                prospeccionRow.set('ESTADO', 'VENTA CAIDA');
                await prospeccionRow.save();
            }
        }

        // Update status in BASE CLARO
        const baseSheet = doc.sheetsByTitle['BASE CLARO'];
        if (baseSheet) {
            const baseRows = await baseSheet.getRows();
            const baseRow = baseRows.find(r => r.get('RUC') == data.ruc);
            if (baseRow) {
                baseRow.set('ESTADO', 'VENTA CAIDA');
                baseRow.set('FECHA AGENDAMIENTO', '');
                await baseRow.save();
            }
        }

        // Refresh cache
        const cache = LeadCache.getInstance();
        await cache.refresh();

        return { success: true };
    } catch (error) {
        console.error('Error in saveDroppedProspect:', error);
        return { success: false, error: 'Error al guardar prospecto caído' };
    }
}

export async function getVentasData() {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['VENTAS'];
        if (!sheet) return [];

        const rows = await sheet.getRows();

        const data = rows.map(row => ({
            id: row.get('ID'),
            ejecutivo: row.get('EJECUTIVO'),
            supervisor: row.get('SUPERVISOR'),
            aprobacion: row.get('APROBACION'),
            autorizacion: row.get('AUTORIZACION') || '',
            fecha: row.get('FECHA') || '',
            estado: row.get('ESTADO'),
            observacion: row.get('OBSERVACION'),
            mesaAsignada: row.get('MESA DE CONTROL ASIGNADO'),
            ruc: row.get('RUC'),
            razonSocial: row.get('RAZON SOCIAL'),
            departamento: row.get('DEPARTAMENTO'),
            provincia: row.get('PROVINCIA'),
            distrito: row.get('DISTRITO'),
            direccion: row.get('DIRECCION'),
            correo: row.get('CORREO'),
            segmento: row.get('SEGMENTO'),
            producto: row.get('PRODUCTO') || 'LINEAS',
            proceso: row.get('PROCESO') || '',
            detalle: row.get('DETALLE') || '',
            lineas: row.get('CANTIDAD LINEAS'),
            cargoFijo: row.get('CF TOTAL'),
            descuento: row.get('DESCUENTO'),
            dni: row.get('DOCUMENTO IDENTIDAD'),
            contacto: row.get('REPRESENTANTE LEGAL'),
            telefono: row.get('TELEFONO'),
            fechaActivacion: row.get('FECHA ACTIVACION') || '',
            tipoVenta: row.get('TIPO DE VENTA') || '',
            cantidad: row.get('CANTIDAD') || '1',
            observacionEjecutivo: row.get('OBSERVACION EJECUTIVO'),
            fechaInicio: row.get('FECHA INICIO') || '',
            fechaFin: row.get('FECHA FIN') || '',
            fechaPeriodo: row.get('FECHA PERIODO') || '',
            srIngreso: row.get('SR DE INGRESO') || '',
            numOrden: row.get('NUMERO DE ORDEN') || '',
            operador: row.get('OPERADOR') || '',
            idSustentos: row.get('ID SUSTENTOS') || ''
        }));

        // Sort descending by ID (newest first)
        return data.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    } catch (error) {
        console.error('Error fetching ventas data:', error);
        return [];
    }
}


export async function updateVentaStatus(id: string, newStatus: string, supervisorName?: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['VENTAS'];
        if (!sheet) return { success: false, error: 'Hoja VENTAS no encontrada' };

        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('ID') == id);

        if (!row) return { success: false, error: 'Registro no encontrado' };

        row.set('ESTADO', newStatus);

        if (supervisorName) {
            if (newStatus === 'NUEVO INGRESO') {
                row.set('APROBACION', `APROBADO POR ${supervisorName.toUpperCase()}`);
            }
        }

        if (newStatus === 'ACTIVADO' || newStatus === 'RECHAZADO') {
            const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
            row.set('FECHA FIN', now);
        }

        await row.save();
        return { success: true };
    } catch (error) {
        console.error('Error in updateVentaStatus:', error);
        return { success: false, error: 'Error al actualizar estado de venta' };
    }
}
export async function updateVentaData(id: string, updates: { estado?: string, srIngreso?: string, numOrden?: string, observacion?: string, fechaActivacion?: string, fechaPeriodo?: string }, supervisorName?: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['VENTAS'];
        if (!sheet) return { success: false, error: 'Hoja VENTAS no encontrada' };

        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('ID') == id);

        if (!row) return { success: false, error: 'Registro no encontrado' };

        if (updates.estado) {
            row.set('ESTADO', updates.estado);
            if (updates.estado === 'ACTIVADO' || updates.estado === 'RECHAZADO') {
                const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
                row.set('FECHA FIN', now);
            }
            if (supervisorName) {
                if (updates.estado === 'NUEVO INGRESO') {
                    row.set('APROBACION', `APROBADO POR ${supervisorName.toUpperCase()}`);
                }
            }
        }
        if (updates.srIngreso !== undefined) row.set('SR DE INGRESO', updates.srIngreso);
        if (updates.numOrden !== undefined) row.set('NUMERO DE ORDEN', updates.numOrden);
        if (updates.observacion !== undefined) row.set('OBSERVACION', updates.observacion);
        if (updates.fechaActivacion !== undefined) row.set('FECHA ACTIVACION', updates.fechaActivacion);
        if (updates.fechaPeriodo !== undefined) row.set('FECHA PERIODO', updates.fechaPeriodo);

        await row.save();
        return { success: true };
    } catch (error) {
        console.error('Error in updateVentaData:', error);
        return { success: false, error: 'Error al actualizar datos de venta' };
    }
}

export async function getChatMessages(ventaId: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['CHATS_VENTAS'];
        if (!sheet) return { success: false, error: 'Hoja CHATS_VENTAS no encontrada' };

        const rows = await sheet.getRows();
        const messages = rows
            .filter(r => r.get('ID_VENTA') == ventaId)
            .map(r => ({
                ventaId: r.get('ID_VENTA'),
                fecha: r.get('FECHA'),
                usuario: r.get('USUARIO'),
                mensaje: r.get('MENSAJE'),
                tipo: r.get('TIPO')
            }));

        return { success: true, data: messages };
    } catch (error: any) {
        console.error('Error in getChatMessages:', error);
        if (error.message?.includes('Duplicate header')) {
            return { success: false, error: 'Error de configuración en Google Sheets: Hay encabezados duplicados en la hoja CHATS_VENTAS. Por favor revise las columnas.' };
        }
        return { success: false, error: 'Error al obtener mensajes' };
    }
}

export async function sendChatMessage(ventaId: string, message: string, user: string, type: string = 'STAFF') {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            await loadDoc();
            const sheet = doc.sheetsByTitle['CHATS_VENTAS'];
            if (!sheet) return { success: false, error: 'Hoja CHATS_VENTAS no encontrada' };

            const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

            await sheet.addRow({
                'ID_VENTA': ventaId,
                'FECHA': now,
                'USUARIO': user,
                'MENSAJE': message,
                'TIPO': type
            });

            return { success: true };
        } catch (error) {
            console.error(`Error in sendChatMessage (attempt ${attempt + 1}):`, error);
            attempt++;
            if (attempt < MAX_RETRIES) {
                // Exponential backoff with jitter: wait random time between 500ms and 1500ms * attempt
                const delay = Math.floor(Math.random() * 1000) + 500 * attempt;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                return { success: false, error: 'Error al enviar mensaje después de varios intentos. Por favor intente nuevamente.' };
            }
        }
    }
    return { success: false, error: 'Unknown error' };
}

export async function getGoalData() {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['META'];
        if (!sheet) {
            console.warn("Sheet 'META' not found. Using default goal.");
            return { success: true, goal: 1000 };
        }

        const rows = await sheet.getRows();
        const goalValue = rows.length > 0 ? parseFloat(rows[0].get('CANTIDAD DE LINEAS')) : 1000;

        return { success: true, goal: isNaN(goalValue) ? 1000 : goalValue };
    } catch (error) {
        console.error('Error in getGoalData:', error);
        return { success: false, error: 'Error al obtener meta', goal: 1000 };
    }
}

export async function updateVentaFull(id: string, data: any) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['VENTAS'];
        if (!sheet) return { success: false, error: 'Hoja VENTAS no encontrada' };

        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('ID') == id);

        if (!row) return { success: false, error: 'Registro no encontrado' };

        // Map form fields to spreadsheet columns
        row.set('RAZON SOCIAL', data.razonSocial);
        row.set('DEPARTAMENTO', data.departamento);
        row.set('PROVINCIA', data.provincia);
        row.set('DISTRITO', data.distrito);
        row.set('DIRECCION', data.direccion);
        row.set('CORREO', data.correo);
        row.set('SEGMENTO', data.segmento);
        row.set('CANTIDAD LINEAS', data.lineas);
        row.set('CF TOTAL', data.cargoFijo);
        row.set('DESCUENTO', data.descuento);
        row.set('DOCUMENTO IDENTIDAD', data.dni);
        row.set('REPRESENTANTE LEGAL', data.contacto);
        row.set('TELEFONO', data.telefono);
        row.set('PROCESO', data.proceso);
        row.set('DETALLE', data.detalle);
        row.set('FECHA PERIODO', data.fechaPeriodo);
        row.set('OBSERVACION EJECUTIVO', data.observacionEjecutivo);
        row.set('ID SUSTENTOS', data.idSustentos);

        await row.save();
        return { success: true };
    } catch (error) {
        console.error('Error in updateVentaFull:', error);
        return { success: false, error: 'Error al actualizar registro de venta' };
    }
}

export async function getDroppedProspects(userName: string, options: { role: string }) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['PROSPECTOS CAIDOS'];
        if (!sheet) return [];

        let rows = await sheet.getRows();
        const { role } = options;

        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();

        // 1. Role-based filtering
        if (role === 'SPECIAL') {
            const team = userCache.getTeamForSupervisor(userName);
            const teamIdentities = new Set<string>();
            team.forEach(u => {
                const code = u.get('USER')?.toLowerCase().trim();
                const name = u.get('NOMBRES COMPLETOS')?.toLowerCase().trim();
                if (code) teamIdentities.add(code);
                if (name) teamIdentities.add(name);
            });
            teamIdentities.add(userName.toLowerCase().trim());

            rows = rows.filter(r => {
                const exec = r.get('EJECUTIVO')?.toLowerCase().trim();
                return exec && teamIdentities.has(exec);
            });
        } else if (role !== 'ADMIN') {
            // STANDARD - only see their own (though button is hidden, safety first)
            const normUser = userName.toLowerCase().trim();
            const self = userCache.findUser(userName);
            const selfCode = self?.get('USER')?.toLowerCase().trim();

            rows = rows.filter(r => {
                const exec = r.get('EJECUTIVO')?.toLowerCase().trim();
                return exec === normUser || (selfCode && exec === selfCode);
            });
        }

        const data = rows.map(row => ({
            id: row.get('ID'),
            ruc: row.get('RUC'),
            razonSocial: row.get('RAZON SOCIAL'),
            contacto: row.get('CONTACTO'),
            telefono: row.get('TELEFONO'),
            lineas: row.get('CANTIDAD LINEAS'),
            cargoFijo: row.get('CARGO FIJO'),
            ejecutivo: row.get('EJECUTIVO'),
            motivo: row.get('MOTIVO'),
            estadoFinal: row.get('ESTADO') || row.get('ESTADO FINAL'), // Fallback for transition
            fechaCaida: row.get('FECHA CAIDA')
        }));

        // Sort by FECHA CAIDA descending (assuming format works with sort or just reverse for sheet order)
        return data.reverse();
    } catch (error) {
        console.error('Error in getDroppedProspects:', error);
        return [];
    }
}

export async function getUnassignedLeads(limit: number = 50) {
    try {
        const cache = LeadCache.getInstance();
        await cache.ensureInitialized();
        const rows = cache.getAll();

        const unassigned = rows.filter(row => {
            const ejecutivo = (row.get('EJECUTIVO') || '').trim();
            const ruc = row.get('RUC');
            // Check if it's truly available (no exec, has RUC)
            return ejecutivo === '' && ruc;
        }).slice(0, limit);

        const data = unassigned.map(row => ({
            id: (row as any).rowIndex,
            ruc: row.get('RUC'),
            razonSocial: row.get('Razón Social'),
            lineas: row.get('CANTIDAD LINEAS'),
            cargoFijo: row.get('CARGO FIJO'),
            contacto: row.get('Representante Legal'),
            departamento: row.get('DEPARTAMENTO'),
            segmento: row.get('SEGMENTO')
        }));

        return { success: true, data };

    } catch (error) {
        console.error('Error in getUnassignedLeads:', error);
        return { success: false, error: 'Error al cargar leads disponibles' };
    }
}

export async function getAllExecutives() {
    try {
        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();
        const users = userCache.getAll().filter((u: any) => {
            const role = (u.get('ROL') || '').trim().toUpperCase();
            return role === 'STANDAR' || role === 'SPECIAL';
        });

        return users.map((u: any) => ({
            name: u.get('NOMBRES COMPLETOS'),
            user: u.get('USER'),
            role: u.get('ROL')
        }));
    } catch (error) {
        console.error('Error fetching executives:', error);
        return [];
    }
}

export async function assignLeads(rucs: string[], executive: string) {
    try {
        const cache = LeadCache.getInstance();
        await cache.ensureInitialized();

        let successCount = 0;
        const now = new Date();
        const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const day = String(peruTime.getDate()).padStart(2, '0');
        const month = String(peruTime.getMonth() + 1).padStart(2, '0');
        const year = peruTime.getFullYear();
        const hours = String(peruTime.getHours()).padStart(2, '0');
        const minutes = String(peruTime.getMinutes()).padStart(2, '0');
        const seconds = String(peruTime.getSeconds()).padStart(2, '0');
        const fechaInicio = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;

        await cache.refresh(); // Get latest status before checking

        for (const ruc of rucs) {
            const updates = {
                'EJECUTIVO': executive,
                'ESTADO': '',
                'FECHA INICIO': fechaInicio
            };
            // Use onlyIfUnassigned: true to prevent overwriting if another supervisor just took it
            const result = await cache.updateRow(ruc, updates, { onlyIfUnassigned: true });
            if (result) successCount++;
        }
        return { success: true, count: successCount };

    } catch (error) {
        console.error('Error in assignLeads:', error);
        return { success: false, count: 0, error: 'Error al asignar leads' };
    }
}

export async function getExecutiveAssignmentStats(userRole?: string, userName?: string) {
    try {
        const leadCache = LeadCache.getInstance();
        await leadCache.ensureInitialized();
        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();

        const allLeads = leadCache.getAll();

        let execs;
        if (userRole === 'SPECIAL' && userName) {
            // Filter only executives belonging to this supervisor's team
            execs = userCache.getTeamForSupervisor(userName).filter((u: any) => {
                const role = (u.get('ROL') || '').trim().toUpperCase();
                return role === 'STANDAR' || role === 'SPECIAL';
            });
        } else {
            // ADMIN or unidentified sees everyone
            execs = userCache.getAll().filter((u: any) => {
                const role = (u.get('ROL') || '').trim().toUpperCase();
                return role === 'STANDAR' || role === 'SPECIAL';
            });
        }

        // Pre-calculate counts per executive
        const counts: Record<string, number> = {};
        allLeads.forEach(row => {
            const exec = (row.get('EJECUTIVO') || '').trim();
            const estado = (row.get('ESTADO') || '').trim().toUpperCase();
            if (exec && (!estado || estado === '' || estado === 'PENDIENTE')) {
                counts[exec] = (counts[exec] || 0) + 1;
            }
        });

        const stats = execs.map((u: any) => {
            const name = u.get('NOMBRES COMPLETOS');
            return {
                name,
                user: u.get('USER'),
                role: u.get('ROL'),
                assignedCount: counts[name] || 0
            };
        });

        // Also calculate available stock per range
        const stock: Record<string, number> = {
            '1-4': 0,
            '5-10': 0,
            '11-15': 0,
            '16-21': 0,
            '22-30': 0,
            '30+': 0
        };

        allLeads.forEach(row => {
            const exec = (row.get('EJECUTIVO') || '').trim();
            if (exec === '') {
                const lineas = parseInt(row.get('CANTIDAD LINEAS') || '0');
                if (lineas >= 1 && lineas <= 4) stock['1-4']++;
                else if (lineas >= 5 && lineas <= 10) stock['5-10']++;
                else if (lineas >= 11 && lineas <= 15) stock['11-15']++;
                else if (lineas >= 16 && lineas <= 21) stock['16-21']++;
                else if (lineas >= 22 && lineas <= 30) stock['22-30']++;
                else if (lineas > 30) stock['30+']++;
            }
        });

        return { success: true, stats, stock };
    } catch (error) {
        console.error('Error fetching executive stats:', error);
        return { success: false, error: 'Error al cargar estadísticas' };
    }
}

export async function assignLeadsByCriteria(
    executiveName: string,
    quantity: number,
    rangeId: string,
    userRole?: string,
    userName?: string
) {
    try {
        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();

        // Security check: Supervisors can only assign to their own team
        if (userRole === 'SPECIAL' && userName) {
            const supervisorOfTarget = userCache.getSupervisorForUser(executiveName);
            if (supervisorOfTarget.trim().toUpperCase() !== userName.trim().toUpperCase()) {
                return { success: false, error: 'No tienes permisos para asignar a un ejecutivo de otro equipo.' };
            }
        }

        // Limit check for Supervisors
        if (userRole === 'SPECIAL' && quantity > 20) {
            return { success: false, error: 'Los supervisores no pueden asignar más de 20 registros' };
        }

        const cache = LeadCache.getInstance();
        await cache.ensureInitialized();

        // 2. Assign
        const now = new Date();
        const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const day = String(peruTime.getDate()).padStart(2, '0');
        const month = String(peruTime.getMonth() + 1).padStart(2, '0');
        const year = peruTime.getFullYear();
        const hours = String(peruTime.getHours()).padStart(2, '0');
        const minutes = String(peruTime.getMinutes()).padStart(2, '0');
        const seconds = String(peruTime.getSeconds()).padStart(2, '0');
        const fechaInicio = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;

        const criteria = (row: any) => {
            const lineas = parseInt(row.get('CANTIDAD LINEAS') || '0');
            switch (rangeId) {
                case '1-4': return lineas >= 1 && lineas <= 4;
                case '5-10': return lineas >= 5 && lineas <= 10;
                case '11-15': return lineas >= 11 && lineas <= 15;
                case '16-21': return lineas >= 16 && lineas <= 21;
                case '22-30': return lineas >= 22 && lineas <= 30;
                case '30+': return lineas > 30;
                default: return false;
            }
        };

        const result = await cache.batchAssignByCriteria(executiveName, quantity, criteria, fechaInicio);
        return result;

    } catch (error) {
        console.error('Error in assignLeadsByCriteria:', error);
        return { success: false, count: 0, error: 'Error al asignar leads por criterio' };
    }
}
