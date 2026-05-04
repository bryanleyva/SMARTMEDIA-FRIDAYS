'use server';

import { doc, loadDoc } from '@/lib/google-sheets';
import { UserCache } from '@/lib/user-cache';



// ============================================
// HELPERS
// ============================================

function getPeruTimestamp(): string {
    const now = new Date();
    const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const day = String(peruTime.getDate()).padStart(2, '0');
    const month = String(peruTime.getMonth() + 1).padStart(2, '0');
    const year = peruTime.getFullYear();
    const hours = String(peruTime.getHours()).padStart(2, '0');
    const minutes = String(peruTime.getMinutes()).padStart(2, '0');
    const seconds = String(peruTime.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

async function getNextId(sheetTitle: string): Promise<number> {
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) return 1;
    const rows = await sheet.getRows();
    const ids = rows.map(r => parseInt(r.get('ID'))).filter(n => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

async function getNextVentaId(sheetTitle: string): Promise<number> {
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) return 1;
    const rows = await sheet.getRows();
    const ids = rows.map(r => parseInt(r.get('VENTA_ID'))).filter(n => !isNaN(n));
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

// ============================================
// TIPOS
// ============================================

export interface LineaVentaR10 {
    tipoVenta: 'PORTABILIDAD' | 'ALTA';
    numeroPortar?: string;
    operadorActual?: string;
    modalidadOperador?: 'POSTPAGO' | 'PREPAGO';
    plan: string;
    promocionBrindada: string;
}

export interface VentaR10Input {
    canalVenta: string;
    canalVentaOtro?: string;
    rucDni: string;
    tipoIngreso: string;
    nombresApellidos: string;
    fechaNacimiento: string;
    estadoCivil: string;
    estadoCivilOtro?: string;
    distritoNacimiento: string;
    nombrePapa: string;
    nombreMama: string;
    correo: string;
    lineas: LineaVentaR10[];
    observacion?: string;
}

export interface CulminarVentaInput {
    tipoEntrega: 'DELIVERY' | 'RETIRO_EN_TIENDA';
    numeroContacto?: string;
    direccionEntrega?: string;
    referenciaEntrega?: string;
    coordenadas?: string;
    tipoEnvio?: 'EXPRESS' | 'REGULAR';
    fechaEnvio?: string;
    rangoEnvio?: '9 AM - 1 PM' | '2 PM - 8 PM';
    pdvTienda?: string;
}

// ============================================
// ETAPA 1: CREAR INTERESADO
// ============================================

export async function saveInteresadoR10(data: VentaR10Input, ejecutivo: string) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['INTERESADOS_R10'];
        if (!sheet) return { success: false, error: 'Hoja INTERESADOS_R10 no encontrada' };
        if (!data.lineas || data.lineas.length === 0) {
            return { success: false, error: 'Debe agregar al menos una línea' };
        }

        const userCache = UserCache.getInstance();
        await userCache.ensureInitialized();
        const supervisor = userCache.getSupervisorForUser(ejecutivo);

        const ventaId = await getNextVentaId('INTERESADOS_R10');
        let nextRowId = await getNextId('INTERESADOS_R10');
        const fechaIngreso = getPeruTimestamp();
        const canalFinal = data.canalVenta === 'Otros' && data.canalVentaOtro ? data.canalVentaOtro : data.canalVenta;
        const estadoCivilFinal = data.estadoCivil === 'Otros' && data.estadoCivilOtro ? data.estadoCivilOtro : data.estadoCivil;

        for (let i = 0; i < data.lineas.length; i++) {
            const linea = data.lineas[i];
            await sheet.addRow({
                'ID': String(nextRowId),
                'VENTA_ID': String(ventaId),
                'LINEA_NUM': String(i + 1),
                'FECHA_INGRESO': fechaIngreso,
                'EJECUTIVO': ejecutivo,
                'SUPERVISOR': supervisor,
                'CAMPAÑA': 'R10',
                'ESTADO': 'INTERESADO',
                'CANAL_VENTA': canalFinal,
                'RUC_DNI': data.rucDni,
                'TIPO_INGRESO': data.tipoIngreso,
                'NOMBRES_APELLIDOS': data.nombresApellidos,
                'FECHA_NACIMIENTO': data.fechaNacimiento,
                'ESTADO_CIVIL': estadoCivilFinal,
                'DISTRITO_NACIMIENTO': data.distritoNacimiento,
                'NOMBRE_PAPA': data.nombrePapa,
                'NOMBRE_MAMA': data.nombreMama,
                'CORREO': data.correo,
                'TIPO_VENTA': linea.tipoVenta,
                'NUMERO_PORTAR': linea.numeroPortar || '',
                'OPERADOR_ACTUAL': linea.operadorActual || '',
                'MODALIDAD_OPERADOR': linea.modalidadOperador || '',
                'PLAN': linea.plan,
                'PROMOCION_BRINDADA': linea.promocionBrindada,
                'OBSERVACION': data.observacion || '',
            } as any);
            nextRowId++;
        }

        return { success: true, ventaId };
    } catch (error: any) {
        console.error('Error en saveInteresadoR10:', error);
        return { success: false, error: error.message || 'Error al guardar' };
    }
}

// ============================================
// LISTAR INTERESADOS (pipeline deals)
// ============================================

export async function getInteresadosR10(
    userName: string,
    userRole: string,
    filters?: { startDate?: string; endDate?: string }
) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['INTERESADOS_R10'];
        if (!sheet) return [];

        const rows = await sheet.getRows();
        let filtered = rows;

        if (userRole !== 'ADMIN') {
            const normUser = userName.toLowerCase().trim();
            if (userRole === 'SPECIAL') {
                const userCache = UserCache.getInstance();
                await userCache.ensureInitialized();
                const team = userCache.getTeamForSupervisor(userName);
                const teamNames = new Set(team.map(u => (u.get('NOMBRES COMPLETOS') || '').toLowerCase().trim()));
                teamNames.add(normUser);
                filtered = rows.filter(r => teamNames.has((r.get('EJECUTIVO') || '').toLowerCase().trim()));
            } else {
                filtered = rows.filter(r => (r.get('EJECUTIVO') || '').toLowerCase().trim() === normUser);
            }
        }

        if (filters?.startDate || filters?.endDate) {
            filtered = filtered.filter(r => {
                const dateStr = r.get('FECHA_INGRESO');
                if (!dateStr) return false;
                const [d, m, y] = dateStr.split(',')[0].split('/').map(Number);
                const rowDate = new Date(y, m - 1, d);
                if (filters.startDate) {
                    const [sy, sm, sd] = filters.startDate.split('-').map(Number);
                    if (rowDate < new Date(sy, sm - 1, sd)) return false;
                }
                if (filters.endDate) {
                    const [ey, em, ed] = filters.endDate.split('-').map(Number);
                    if (rowDate > new Date(ey, em - 1, ed)) return false;
                }
                return true;
            });
        }

        const byVentaId: Record<string, any[]> = {};
        for (const row of filtered) {
            const vid = row.get('VENTA_ID') || '';
            if (!byVentaId[vid]) byVentaId[vid] = [];
            byVentaId[vid].push(row);
        }

        const cards = Object.entries(byVentaId).map(([vid, lines]) => {
            const first = lines[0];
            return {
                ventaId: vid,
                ejecutivo: first.get('EJECUTIVO'),
                supervisor: first.get('SUPERVISOR'),
                fechaIngreso: first.get('FECHA_INGRESO'),
                estado: first.get('ESTADO'),
                canalVenta: first.get('CANAL_VENTA'),
                rucDni: first.get('RUC_DNI'),
                tipoIngreso: first.get('TIPO_INGRESO'),
                nombresApellidos: first.get('NOMBRES_APELLIDOS'),
                fechaNacimiento: first.get('FECHA_NACIMIENTO'),
                estadoCivil: first.get('ESTADO_CIVIL'),
                distritoNacimiento: first.get('DISTRITO_NACIMIENTO'),
                nombrePapa: first.get('NOMBRE_PAPA'),
                nombreMama: first.get('NOMBRE_MAMA'),
                correo: first.get('CORREO'),
                observacion: first.get('OBSERVACION'),
                cantidadLineas: lines.length,
                lineas: lines.map(l => ({
                    lineaNum: l.get('LINEA_NUM'),
                    tipoVenta: l.get('TIPO_VENTA'),
                    numeroPortar: l.get('NUMERO_PORTAR'),
                    operadorActual: l.get('OPERADOR_ACTUAL'),
                    modalidadOperador: l.get('MODALIDAD_OPERADOR'),
                    plan: l.get('PLAN'),
                    promocionBrindada: l.get('PROMOCION_BRINDADA'),
                })),
            };
        });

        cards.sort((a, b) => Number(b.ventaId) - Number(a.ventaId));
        return cards;
    } catch (error) {
        console.error('Error en getInteresadosR10:', error);
        return [];
    }
}

// ============================================
// LISTAR INGRESADOS (con filtro por estado)
// ============================================

export async function getIngresadosR10(
    userName: string,
    userRole: string,
    filters?: { startDate?: string; endDate?: string; search?: string; estado?: string; scope?: 'mine' | 'team' | 'all' }
) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['INGRESADOS_R10'];
        if (!sheet) return [];

        const rows = await sheet.getRows();
        let filtered = rows;

        // Scope (mine/team/all) tiene prioridad sobre el rol
        const scope = filters?.scope;
        if (scope === 'all' || userRole === 'ADMIN' || (userRole === 'BACKOFFICE' && !scope)) {
            // Ve todo
        } else if (scope === 'team' || userRole === 'SPECIAL') {
            const userCache = UserCache.getInstance();
            await userCache.ensureInitialized();
            const team = userCache.getTeamForSupervisor(userName);
            const teamNames = new Set(team.map(u => (u.get('NOMBRES COMPLETOS') || '').toLowerCase().trim()));
            teamNames.add(userName.toLowerCase().trim());
            filtered = rows.filter(r => teamNames.has((r.get('EJECUTIVO') || '').toLowerCase().trim()));
        } else {
            // STANDAR o scope='mine': solo lo suyo
            const normUser = userName.toLowerCase().trim();
            filtered = rows.filter(r => (r.get('EJECUTIVO') || '').toLowerCase().trim() === normUser);
        }

        // Filtro por estado (si aplica)
        if (filters?.estado && filters.estado !== 'TODOS') {
            filtered = filtered.filter(r => (r.get('ESTADO') || '').toUpperCase().trim() === filters.estado);
        }

        // Filtro por fecha de cierre
        if (filters?.startDate || filters?.endDate) {
            filtered = filtered.filter(r => {
                const dateStr = r.get('FECHA_CIERRE');
                if (!dateStr) return false;
                const [d, m, y] = dateStr.split(',')[0].split('/').map(Number);
                const rowDate = new Date(y, m - 1, d);
                if (filters.startDate) {
                    const [sy, sm, sd] = filters.startDate.split('-').map(Number);
                    if (rowDate < new Date(sy, sm - 1, sd)) return false;
                }
                if (filters.endDate) {
                    const [ey, em, ed] = filters.endDate.split('-').map(Number);
                    if (rowDate > new Date(ey, em - 1, ed)) return false;
                }
                return true;
            });
        }

        if (filters?.search) {
            const s = filters.search.toLowerCase().trim();
            filtered = filtered.filter(r => {
                const ruc = (r.get('RUC_DNI') || '').toLowerCase();
                const nombre = (r.get('NOMBRES_APELLIDOS') || '').toLowerCase();
                return ruc.includes(s) || nombre.includes(s);
            });
        }

        // Agrupar por VENTA_ID
        const byVentaId: Record<string, any[]> = {};
        for (const row of filtered) {
            const vid = row.get('VENTA_ID') || '';
            if (!byVentaId[vid]) byVentaId[vid] = [];
            byVentaId[vid].push(row);
        }

        const ingresos = Object.entries(byVentaId).map(([vid, lines]) => {
            const first = lines[0];
            return {
                ventaId: vid,
                ejecutivo: first.get('EJECUTIVO'),
                supervisor: first.get('SUPERVISOR'),
                fechaIngreso: first.get('FECHA_INGRESO'),
                fechaCierre: first.get('FECHA_CIERRE'),
                fechaActivacion: first.get('FECHA_ACTIVACION'),
                estado: first.get('ESTADO'),
                canalVenta: first.get('CANAL_VENTA'),
                rucDni: first.get('RUC_DNI'),
                tipoIngreso: first.get('TIPO_INGRESO'),
                nombresApellidos: first.get('NOMBRES_APELLIDOS'),
                fechaNacimiento: first.get('FECHA_NACIMIENTO'),
                estadoCivil: first.get('ESTADO_CIVIL'),
                distritoNacimiento: first.get('DISTRITO_NACIMIENTO'),
                nombrePapa: first.get('NOMBRE_PAPA'),
                nombreMama: first.get('NOMBRE_MAMA'),
                correo: first.get('CORREO'),
                tipoEntrega: first.get('TIPO_ENTREGA'),
                numeroContacto: first.get('NUMERO_CONTACTO'),
                direccionEntrega: first.get('DIRECCION_ENTREGA'),
                referenciaEntrega: first.get('REFERENCIA_ENTREGA'),
                coordenadas: first.get('COORDENADAS'),
                tipoEnvio: first.get('TIPO_ENVIO'),
                fechaEnvio: first.get('FECHA_ENVIO'),
                rangoEnvio: first.get('RANGO_ENVIO'),
                pdvTienda: first.get('PDV_TIENDA'),
                mesaControlAsignado: first.get('MESA_CONTROL_ASIGNADO'),
                observacionBo: first.get('OBSERVACION_BO'),
                motivoRechazo: first.get('MOTIVO_RECHAZO'),
                observacion: first.get('OBSERVACION'),
                cantidadLineas: lines.length,
                lineas: lines.map(l => ({
                    lineaNum: l.get('LINEA_NUM'),
                    tipoVenta: l.get('TIPO_VENTA'),
                    numeroPortar: l.get('NUMERO_PORTAR'),
                    operadorActual: l.get('OPERADOR_ACTUAL'),
                    modalidadOperador: l.get('MODALIDAD_OPERADOR'),
                    plan: l.get('PLAN'),
                    promocionBrindada: l.get('PROMOCION_BRINDADA'),
                })),
            };
        });

        ingresos.sort((a, b) => Number(b.ventaId) - Number(a.ventaId));
        return ingresos;
    } catch (error) {
        console.error('Error en getIngresadosR10:', error);
        return [];
    }
}

// ============================================
// ETAPA 2a: CULMINAR VENTA (ahora en PENDIENTE)
// ============================================

export async function culminarVentaR10(ventaId: string, data: CulminarVentaInput) {
    try {
        await loadDoc();
        const interesadosSheet = doc.sheetsByTitle['INTERESADOS_R10'];
        const ingresadosSheet = doc.sheetsByTitle['INGRESADOS_R10'];
        if (!interesadosSheet || !ingresadosSheet) {
            return { success: false, error: 'Hojas no encontradas' };
        }

        const interesadosRows = await interesadosSheet.getRows();
        const lineas = interesadosRows.filter(r => r.get('VENTA_ID') === ventaId && r.get('ESTADO') === 'INTERESADO');

        if (lineas.length === 0) {
            return { success: false, error: 'Venta no encontrada o ya procesada' };
        }

        const fechaCierre = getPeruTimestamp();
        let nextIngresadosId = await getNextId('INGRESADOS_R10');

        for (const linea of lineas) {
            await ingresadosSheet.addRow({
                'ID': String(nextIngresadosId),
                'VENTA_ID': ventaId,
                'LINEA_NUM': linea.get('LINEA_NUM'),
                'FECHA_INGRESO': linea.get('FECHA_INGRESO'),
                'FECHA_CIERRE': fechaCierre,
                'EJECUTIVO': linea.get('EJECUTIVO'),
                'SUPERVISOR': linea.get('SUPERVISOR'),
                'CAMPAÑA': 'R10',
                'ESTADO': 'PENDIENTE',
                'CANAL_VENTA': linea.get('CANAL_VENTA'),
                'RUC_DNI': linea.get('RUC_DNI'),
                'TIPO_INGRESO': linea.get('TIPO_INGRESO'),
                'NOMBRES_APELLIDOS': linea.get('NOMBRES_APELLIDOS'),
                'FECHA_NACIMIENTO': linea.get('FECHA_NACIMIENTO'),
                'ESTADO_CIVIL': linea.get('ESTADO_CIVIL'),
                'DISTRITO_NACIMIENTO': linea.get('DISTRITO_NACIMIENTO'),
                'NOMBRE_PAPA': linea.get('NOMBRE_PAPA'),
                'NOMBRE_MAMA': linea.get('NOMBRE_MAMA'),
                'CORREO': linea.get('CORREO'),
                'TIPO_VENTA': linea.get('TIPO_VENTA'),
                'NUMERO_PORTAR': linea.get('NUMERO_PORTAR'),
                'OPERADOR_ACTUAL': linea.get('OPERADOR_ACTUAL'),
                'MODALIDAD_OPERADOR': linea.get('MODALIDAD_OPERADOR'),
                'PLAN': linea.get('PLAN'),
                'PROMOCION_BRINDADA': linea.get('PROMOCION_BRINDADA'),
                'TIPO_ENTREGA': data.tipoEntrega,
                'NUMERO_CONTACTO': data.numeroContacto || '',
                'DIRECCION_ENTREGA': data.direccionEntrega || '',
                'REFERENCIA_ENTREGA': data.referenciaEntrega || '',
                'COORDENADAS': data.coordenadas || '',
                'TIPO_ENVIO': data.tipoEnvio || '',
                'FECHA_ENVIO': data.fechaEnvio || '',
                'RANGO_ENVIO': data.rangoEnvio || '',
                'PDV_TIENDA': data.pdvTienda || '',
                'OBSERVACION': linea.get('OBSERVACION'),
                'FECHA_ACTIVACION': '',
                'MESA_CONTROL_ASIGNADO': '',
                'OBSERVACION_BO': '',
                'MOTIVO_RECHAZO': '',
            } as any);
            nextIngresadosId++;
        }

        for (const linea of lineas) {
            linea.set('ESTADO', 'CERRADO');
            await linea.save();
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error en culminarVentaR10:', error);
        return { success: false, error: error.message || 'Error al culminar venta' };
    }
}

// ============================================
// ETAPA 2b: DAR DE BAJA
// ============================================

export async function saveDroppedR10(ventaId: string, motivo: string, observacion: string) {
    try {
        await loadDoc();
        const interesadosSheet = doc.sheetsByTitle['INTERESADOS_R10'];
        const caidosSheet = doc.sheetsByTitle['PROSPECTOS_CAIDOS_R10'];
        if (!interesadosSheet || !caidosSheet) {
            return { success: false, error: 'Hojas no encontradas' };
        }

        const interesadosRows = await interesadosSheet.getRows();
        const lineas = interesadosRows.filter(r => r.get('VENTA_ID') === ventaId && r.get('ESTADO') === 'INTERESADO');

        if (lineas.length === 0) {
            return { success: false, error: 'Venta no encontrada o ya procesada' };
        }

        const fechaCaida = getPeruTimestamp();
        let nextCaidosId = await getNextId('PROSPECTOS_CAIDOS_R10');
        const first = lineas[0];

        await caidosSheet.addRow({
            'ID': String(nextCaidosId),
            'VENTA_ID': ventaId,
            'FECHA_CAIDA': fechaCaida,
            'EJECUTIVO': first.get('EJECUTIVO'),
            'SUPERVISOR': first.get('SUPERVISOR'),
            'CAMPAÑA': 'R10',
            'RUC_DNI': first.get('RUC_DNI'),
            'NOMBRES_APELLIDOS': first.get('NOMBRES_APELLIDOS'),
            'TIPO_VENTA': lineas.map(l => l.get('TIPO_VENTA')).join(' / '),
            'PLAN': lineas.map(l => l.get('PLAN')).join(' / '),
            'MOTIVO': motivo,
            'OBSERVACION': observacion,
        } as any);

        for (const linea of lineas) {
            linea.set('ESTADO', 'CAIDO');
            await linea.save();
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error en saveDroppedR10:', error);
        return { success: false, error: error.message || 'Error al dar de baja' };
    }
}

// ============================================
// MESA DE CONTROL: Cambiar estado de venta
// ============================================

export async function updateEstadoIngresadoR10(
    ventaId: string,
    nuevoEstado: 'ACTIVO' | 'RECHAZADO' | 'PENDIENTE',
    backofficeUser: string,
    observacion?: string,
    motivoRechazo?: string
) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['INGRESADOS_R10'];
        if (!sheet) return { success: false, error: 'Hoja INGRESADOS_R10 no encontrada' };

        const rows = await sheet.getRows();
        const lineas = rows.filter(r => r.get('VENTA_ID') === ventaId);

        if (lineas.length === 0) {
            return { success: false, error: 'Venta no encontrada' };
        }

        const fechaActivacion = nuevoEstado === 'ACTIVO' ? getPeruTimestamp() : '';

        for (const linea of lineas) {
            linea.set('ESTADO', nuevoEstado);
            linea.set('MESA_CONTROL_ASIGNADO', backofficeUser);
            if (observacion !== undefined) linea.set('OBSERVACION_BO', observacion);
            if (nuevoEstado === 'RECHAZADO' && motivoRechazo) linea.set('MOTIVO_RECHAZO', motivoRechazo);
            if (nuevoEstado === 'ACTIVO') linea.set('FECHA_ACTIVACION', fechaActivacion);
            await linea.save();
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error en updateEstadoIngresadoR10:', error);
        return { success: false, error: error.message || 'Error al actualizar estado' };
    }
}